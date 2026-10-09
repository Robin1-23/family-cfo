import { daysBetween } from '../../functions/src/alerts';
import { ITEM_GROUP, ITEM_TYPE_LABELS, formatCompactRupees, formatDate } from './items';
import { isSenior } from './radar';
import type { Item, LedgerEntry, Member, VaultDocument } from './types';

/* ------------------------------------------------------------------ insights */

export interface Insight {
  id: string;
  tone: 'lime' | 'amber' | 'danger';
  icon: 'alert-triangle' | 'check-square' | 'user-check' | 'target' | 'trending-up' | 'percent' | 'activity' | 'camera';
  title: string;
  body: string;
  /** Where the card's button goes. */
  route: '/timeline' | '/vault' | '/nominees' | '/radar' | '/tax' | '/health-check' | '/upload';
  action: string;
}

/**
 * The "For you" cards on Home: the most useful next steps from the family's own
 * data, most urgent first. Facts only; never a product suggestion.
 */
export function insights(args: {
  members: Pick<Member, 'id' | 'name' | 'relation' | 'birthYear' | 'healthCheck'>[];
  items: Item[];
  documents: Pick<VaultDocument, 'ocrStatus'>[];
  radarGapCount: number;
  today: string;
}): Insight[] {
  const { members, items, documents, radarGapCount, today } = args;
  const first = (id: string) => {
    const m = members.find((x) => x.id === id);
    return !m ? 'Someone' : m.relation === 'self' ? 'Your' : `${m.name.split(' ')[0]}’s`;
  };
  const out: Insight[] = [];

  const lapsed = items.find((i) => i.type === 'health_policy' && i.dueDate && i.dueDate < today);
  if (lapsed) {
    out.push({
      id: 'lapsed',
      tone: 'danger',
      icon: 'alert-triangle',
      title: `${first(lapsed.memberId)} health policy may have lapsed`,
      body: `Renewal was due ${formatDate(lapsed.dueDate)}. Most insurers allow a short grace period.`,
      route: '/timeline',
      action: 'Check it',
    });
  }

  const toConfirm = documents.filter((d) => d.ocrStatus === 'extracted').length;
  if (toConfirm > 0) {
    out.push({
      id: 'confirm',
      tone: 'lime',
      icon: 'check-square',
      title: `${toConfirm} ${toConfirm === 1 ? 'document is' : 'documents are'} ready to confirm`,
      body: 'We read the details. Check them so reminders and the radar use them.',
      route: '/vault',
      action: 'Confirm',
    });
  }

  const noNominee = items.filter((i) => (ITEM_GROUP[i.type] === 'insurance' || ITEM_GROUP[i.type] === 'asset') && !i.nominee);
  if (noNominee.length > 0) {
    out.push({
      id: 'nominee',
      tone: 'amber',
      icon: 'user-check',
      title: `${noNominee.length} ${noNominee.length === 1 ? 'policy or deposit has' : 'policies and deposits have'} no nominee`,
      body: 'Without one, the family needs legal papers to claim it.',
      route: '/nominees',
      action: 'Review',
    });
  }

  if (radarGapCount > 0) {
    out.push({
      id: 'gaps',
      tone: 'amber',
      icon: 'target',
      title: `${radarGapCount} cover ${radarGapCount === 1 ? 'gap' : 'gaps'} in the family`,
      body: 'See who is under-covered and why it matters.',
      route: '/radar',
      action: 'See radar',
    });
  }

  const maturing = items.find((i) => i.maturityDate && daysBetween(today, i.maturityDate) >= 0 && daysBetween(today, i.maturityDate) <= 60);
  if (maturing) {
    out.push({
      id: 'maturity',
      tone: 'lime',
      icon: 'trending-up',
      title: `${maturing.amount ? formatCompactRupees(maturing.amount) : ITEM_TYPE_LABELS[maturing.type]} matures ${formatDate(maturing.maturityDate)}`,
      body: 'Decide in advance so it doesn’t auto-renew at a lower rate.',
      route: '/timeline',
      action: 'View',
    });
  }

  const parentPremium = items.some(
    (i) => i.type === 'health_policy' && i.premium && members.some((m) => m.id === i.memberId && (m.relation === 'mother' || m.relation === 'father')),
  );
  if (parentPremium) {
    out.push({
      id: 'tax',
      tone: 'lime',
      icon: 'percent',
      title: 'Parents’ health premiums can save tax',
      body: 'See which deductions may apply this year.',
      route: '/tax',
      action: 'Tax helper',
    });
  }

  if (!members.some((m) => m.healthCheck)) {
    out.push({
      id: 'checkup',
      tone: 'lime',
      icon: 'activity',
      title: 'Take the 2-minute check-up',
      body: 'Six questions per parent for your first Coverage Score.',
      route: '/health-check',
      action: 'Start',
    });
  }

  if (items.length === 0) {
    out.push({
      id: 'first',
      tone: 'lime',
      icon: 'camera',
      title: 'Scan your first policy',
      body: 'Snap a health policy. We read the details for you.',
      route: '/upload',
      action: 'Scan',
    });
  }
  return out;
}

/* --------------------------------------------------------------- tax helper */

export interface TaxTip {
  title: string;
  body: string;
  amount?: number;
}

/**
 * Plain-language tax pointers for parents' money. Wording avoids section
 * numbers because the Income-tax Act, 2025 renumbered them from April 2026.
 * General information only; the screen tells people to confirm with a CA.
 */
export function taxTips(members: Pick<Member, 'id' | 'name' | 'relation' | 'birthYear'>[], items: Item[], currentYear?: number): { memberId: string; tips: TaxTip[] }[] {
  return members
    .filter((m) => m.relation === 'mother' || m.relation === 'father')
    .map((m) => {
      const own = items.filter((i) => i.memberId === m.id);
      const senior = isSenior(m, currentYear);
      const premium = own.filter((i) => i.type === 'health_policy').reduce((n, i) => n + (i.premium ?? 0), 0);
      const hasDeposits = own.some((i) => i.type === 'fixed_deposit' || i.type === 'savings_account');
      const tips: TaxTip[] = [];
      if (premium > 0) {
        tips.push({
          title: 'Health insurance premium',
          amount: premium,
          body: `Whoever pays it can claim up to ${senior ? '₹50,000' : '₹25,000'} a year for parents’ health cover, under the old tax regime.`,
        });
      }
      if (hasDeposits && senior) {
        tips.push({
          title: 'Interest on deposits',
          body: 'Senior citizens can deduct up to ₹50,000 of bank and post office interest a year, under the old tax regime.',
        });
      }
      if (hasDeposits) {
        tips.push({
          title: 'Stop tax being cut from FD interest',
          body: 'If their total tax for the year is nil, they can give the bank Form 121 (it replaced Form 15H in April 2026).',
        });
      }
      tips.push({
        title: 'File the return anyway',
        body: 'Filing, usually by 31 July, is how tax already cut from interest comes back as a refund.',
      });
      return { memberId: m.id, tips };
    });
}

/* ------------------------------------------------------------- policy check */

/**
 * Annual return of an endowment / money-back style policy: yearly premiums paid
 * at the start of each of `payYears`, one maturity payout after `totalYears`.
 * Solved by bisection; returns a fraction (0.045 = 4.5%), or null if the inputs
 * can't describe a policy.
 */
export function policyReturn(p: { premium: number; payYears: number; totalYears: number; maturity: number }): number | null {
  const { premium, payYears, totalYears, maturity } = p;
  if (premium <= 0 || payYears <= 0 || totalYears < payYears || maturity <= 0 || totalYears > 60) return null;
  const fv = (r: number) => {
    let total = 0;
    for (let t = 0; t < payYears; t++) total += premium * Math.pow(1 + r, totalYears - t);
    return total;
  };
  let lo = -0.99;
  let hi = 1;
  if (fv(lo) > maturity || fv(hi) < maturity) return null;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (fv(mid) < maturity) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** What the same premiums would grow to at a plain deposit rate. */
export function depositValue(p: { premium: number; payYears: number; totalYears: number }, rate: number): number {
  let total = 0;
  for (let t = 0; t < p.payYears; t++) total += p.premium * Math.pow(1 + rate, p.totalYears - t);
  return Math.round(total);
}

/* ------------------------------------------------------------ contributions */

/** Indian financial year (April to March) containing a date: "2026-27". */
export function financialYear(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export interface Share {
  memberId: string;
  paid: number;
  /** Paid minus an equal share among everyone who chips in. Positive means they paid extra. */
  balance: number;
}

/**
 * Who paid what for the family this financial year. Splits equally among the
 * people who chip in: you, siblings and spouse, plus anyone who has paid.
 */
export function contributionShares(entries: Pick<LedgerEntry, 'payerMemberId' | 'amount' | 'date'>[], members: Pick<Member, 'id' | 'relation'>[], fy: string): { total: number; shares: Share[] } {
  const inYear = entries.filter((e) => financialYear(e.date) === fy);
  const contributors = new Set([
    ...members.filter((m) => m.relation === 'self' || m.relation === 'sibling' || m.relation === 'spouse').map((m) => m.id),
    ...inYear.map((e) => e.payerMemberId),
  ]);
  const total = inYear.reduce((n, e) => n + e.amount, 0);
  const fair = contributors.size ? total / contributors.size : 0;
  const shares = [...contributors]
    .map((memberId) => {
      const paid = inYear.filter((e) => e.payerMemberId === memberId).reduce((n, e) => n + e.amount, 0);
      return { memberId, paid, balance: Math.round(paid - fair) };
    })
    .sort((a, b) => b.paid - a.paid);
  return { total, shares };
}
