/**
 * Pure date and reminder logic, shared by the daily alert sweep (Cloud
 * Function) and the app's Timeline screen. Dates are ISO "YYYY-MM-DD" strings
 * in India time; no Date objects cross the boundary.
 */

/** Days before a date that a reminder goes out (0 = on the day). */
export const REMINDER_OFFSETS = [30, 7, 1, 0] as const;

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Same day next year; 29 Feb rolls to 28 Feb. */
export function addYears(iso: string, years: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(Date.UTC(y + years, m - 1, d));
  return target.getUTCMonth() === m - 1 ? target.toISOString().slice(0, 10) : new Date(Date.UTC(y + years, m, 0)).toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const toMs = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toMs(toIso) - toMs(fromIso)) / 86_400_000);
}

/** Today's date in India, as YYYY-MM-DD. */
export function todayInIndia(now: Date = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

export type DueKind = 'premium' | 'maturity' | 'emi';

export interface DueEvent {
  itemId: string;
  kind: DueKind;
  date: string;
}

interface ItemDates {
  id: string;
  type: string;
  dueDate: string | null;
  maturityDate: string | null;
}

/** Every dated event an item carries: premium/EMI due date and maturity. */
export function dueEvents(item: ItemDates): DueEvent[] {
  const events: DueEvent[] = [];
  if (item.dueDate) events.push({ itemId: item.id, kind: item.type === 'loan' ? 'emi' : 'premium', date: item.dueDate });
  if (item.maturityDate) events.push({ itemId: item.id, kind: 'maturity', date: item.maturityDate });
  return events;
}

/** Events whose reminder day is today: exactly 30, 7, 1 or 0 days away, and not snoozed. */
export function remindersDueToday(
  item: ItemDates & { snoozedUntil?: string | null },
  today: string,
): (DueEvent & { daysLeft: number })[] {
  if (item.snoozedUntil && item.snoozedUntil > today) return [];
  return dueEvents(item)
    .map((e) => ({ ...e, daysLeft: daysBetween(today, e.date) }))
    .filter((e) => (REMINDER_OFFSETS as readonly number[]).includes(e.daysLeft));
}

/** Stable id so the sweep never sends the same reminder twice. */
export function alertId(e: DueEvent & { daysLeft: number }): string {
  return `${e.itemId}_${e.kind}_${e.date}_${e.daysLeft}`;
}

const KIND_TEXT = {
  en: { premium: 'premium', emi: 'EMI', maturity: 'maturity' },
  hi: { premium: 'प्रीमियम', emi: 'EMI', maturity: 'मैच्योरिटी' },
} as const;

/**
 * WhatsApp Cloud API body for the pre-approved "due_reminder" template.
 * Template body (register in Meta Business Manager, en and hi):
 *   "{{1}}: {{2}} {{3}} is due on {{4}}. Amount: {{5}}. Open Family CFO for details."
 */
export function reminderMessage(params: {
  to: string;
  language: 'en' | 'hi';
  memberName: string;
  provider: string | null;
  kind: DueKind;
  date: string;
  amount: number | null;
}) {
  const [y, m, d] = params.date.split('-');
  const amount = params.amount == null ? '—' : `₹${new Intl.NumberFormat('en-IN').format(params.amount)}`;
  return {
    messaging_product: 'whatsapp',
    to: params.to.replace(/^\+/, ''),
    type: 'template',
    template: {
      name: 'due_reminder',
      language: { code: params.language },
      components: [
        {
          type: 'body',
          parameters: [params.memberName, params.provider ?? '—', KIND_TEXT[params.language][params.kind], `${d}/${m}/${y}`, amount].map((text) => ({
            type: 'text',
            text,
          })),
        },
      ],
    },
  };
}
