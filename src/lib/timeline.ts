import { addYears, daysBetween, dueEvents, type DueKind } from '../../functions/src/alerts';
import type { Item, Member } from './types';

export { todayInIndia } from '../../functions/src/alerts';

export interface TimelineEntry {
  key: string;
  itemId: string;
  kind: DueKind;
  date: string;
  daysLeft: number;
  memberId: string;
  /** Who should act on it: the payer if set, otherwise the household owner's own card. */
  ownerMemberId: string | null;
  amount: number | null;
  snoozed: boolean;
}

export const KIND_LABELS: Record<DueKind, string> = {
  premium: 'Premium due',
  emi: 'EMI due',
  maturity: 'Matures',
};

/** Every premium, EMI and maturity date, soonest first. Overdue entries come first. */
export function timeline(items: Item[], members: Pick<Member, 'id' | 'relation'>[], today: string): TimelineEntry[] {
  const self = members.find((m) => m.relation === 'self')?.id ?? null;
  return items
    .flatMap((item) =>
      dueEvents(item).map((e) => ({
        key: `${e.itemId}_${e.kind}`,
        itemId: e.itemId,
        kind: e.kind,
        date: e.date,
        daysLeft: daysBetween(today, e.date),
        memberId: item.memberId,
        ownerMemberId: item.payerMemberId ?? self,
        amount: e.kind === 'maturity' ? item.amount : (item.premium ?? null),
        snoozed: !!item.snoozedUntil && item.snoozedUntil > today,
      })),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type Bucket = 'overdue' | 'soon' | 'later';

export function bucketOf(e: Pick<TimelineEntry, 'daysLeft'>): Bucket {
  return e.daysLeft < 0 ? 'overdue' : e.daysLeft <= 30 ? 'soon' : 'later';
}

/** "Today", "Tomorrow", "In 5 days", "3 days late". */
export function relativeDay(daysLeft: number): string {
  if (daysLeft === 0) return 'Today';
  if (daysLeft === 1) return 'Tomorrow';
  if (daysLeft === -1) return '1 day late';
  return daysLeft < 0 ? `${-daysLeft} days late` : `In ${daysLeft} days`;
}

/**
 * "Mark paid" moves a premium or EMI to its next date. ponytail: assumes a yearly
 * premium and a monthly EMI; add a frequency field when people pay half-yearly.
 */
export function nextDueDate(kind: DueKind, date: string): string {
  if (kind === 'emi') {
    const [y, m, d] = date.split('-').map(Number);
    const next = new Date(Date.UTC(y, m, Math.min(d, new Date(Date.UTC(y, m + 1, 0)).getUTCDate())));
    return next.toISOString().slice(0, 10);
  }
  return addYears(date, 1);
}
