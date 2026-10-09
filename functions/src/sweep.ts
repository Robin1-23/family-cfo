import { REGION, db, whatsappPhoneId, whatsappToken } from './admin';

import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { REMINDER_OFFSETS, addDays, alertId, reminderMessage, remindersDueToday, todayInIndia } from './alerts';

// ponytail: pinned Graph API version; bump when Meta deprecates it.
const WHATSAPP_API = 'https://graph.facebook.com/v21.0';

/**
 * Daily at 9am IST: finds premiums, EMIs and maturities 30, 7, 1 or 0 days out
 * and sends one WhatsApp reminder to the member who pays it. Each reminder is
 * recorded under households/{id}/alerts so it is never sent twice.
 */
export const dailyReminders = onSchedule(
  { schedule: 'every day 09:00', timeZone: 'Asia/Kolkata', region: REGION, secrets: [whatsappToken, whatsappPhoneId] },
  async () => {
    const today = todayInIndia();
    const targets = REMINDER_OFFSETS.map((o) => addDays(today, o));
    const [byDue, byMaturity] = await Promise.all(
      ['dueDate', 'maturityDate'].map((f) => db.collectionGroup('items').where(f, 'in', targets).get()),
    );
    const items = new Map([...byDue.docs, ...byMaturity.docs].map((d) => [d.ref.path, d]));
    let sent = 0;

    for (const snap of items.values()) {
      const item = snap.data();
      const household = snap.ref.parent.parent!;
      for (const e of remindersDueToday({ id: snap.id, type: item.type, dueDate: item.dueDate ?? null, maturityDate: item.maturityDate ?? null, snoozedUntil: item.snoozedUntil }, today)) {
        const alertRef = household.collection('alerts').doc(alertId(e));
        // create() fails if it exists: this is what stops duplicates across retries.
        const claimed = await alertRef
          .create({ itemId: snap.id, kind: e.kind, dueAt: e.date, daysLeft: e.daysLeft, status: 'pending', createdAt: FieldValue.serverTimestamp() })
          .then(() => true)
          .catch(() => false);
        if (!claimed) continue;

        const owner = item.payerMemberId
          ? await household.collection('members').doc(item.payerMemberId).get()
          : (await household.collection('members').where('relation', '==', 'self').limit(1).get()).docs[0];
        const about = await household.collection('members').doc(item.memberId).get();
        const consented = owner && ['self', 'granted'].includes(owner.get('consentStatus'));
        const phone = owner?.get('phone') as string | undefined;

        let status = 'in_app';
        if (consented && phone && whatsappToken.value()) {
          const res = await fetch(`${WHATSAPP_API}/${whatsappPhoneId.value()}/messages`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${whatsappToken.value()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(
              reminderMessage({
                to: phone,
                language: owner!.get('language') === 'hi' ? 'hi' : 'en',
                memberName: (about.get('name') as string)?.split(' ')[0] ?? '',
                provider: item.provider ?? null,
                kind: e.kind,
                date: e.date,
                amount: e.kind === 'maturity' ? (item.amount ?? null) : (item.premium ?? null),
              }),
            ),
          });
          status = res.ok ? 'sent' : 'failed';
          if (res.ok) sent++;
          else logger.warn('whatsapp send failed', { alert: alertRef.path, status: res.status });
        }
        await alertRef.update({ ownerMemberId: owner?.id ?? null, channel: status === 'in_app' ? 'in_app' : 'whatsapp', status });
      }
    }
    logger.info('dailyReminders done', { candidates: items.size, sent });
  },
);
