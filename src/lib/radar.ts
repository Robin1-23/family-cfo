import type { Item, ItemType, Member } from './types';

/**
 * Coverage Radar: per-member cover by kind, against a plain guideline.
 * Facts and generic education only; never a product (spec: explain, don't sell).
 */

export type CoverKind = 'health' | 'term' | 'critical_illness' | 'accident';
export type CoverStatus = 'ok' | 'low' | 'missing' | 'optional' | 'self_reported';

export interface RadarRow {
  kind: CoverKind;
  label: string;
  /** Total confirmed cover in rupees. */
  actual: number;
  /** Suggested minimum, or null when it depends on things we don't know. */
  suggested: number | null;
  status: CoverStatus;
  /** One plain sentence: what this cover does and why the status. */
  why: string;
}

const KIND_ITEMS: Record<CoverKind, ItemType> = {
  health: 'health_policy',
  term: 'term_policy',
  critical_illness: 'critical_illness_policy',
  accident: 'accident_policy',
};

export const COVER_LABELS: Record<CoverKind, string> = {
  health: 'Health',
  term: 'Term life',
  critical_illness: 'Critical illness',
  accident: 'Accident',
};

const LAKH = 100_000;

export function isSenior(member: Pick<Member, 'relation' | 'birthYear'>, currentYear = new Date().getFullYear()): boolean {
  return member.birthYear ? currentYear - member.birthYear >= 55 : member.relation !== 'self' && member.relation !== 'child' && member.relation !== 'sibling';
}

/**
 * ponytail: flat health guideline (₹10 lakh after 55, else ₹5 lakh). Swap for a
 * city- and age-banded table when we have one.
 */
export function healthGuideline(member: Pick<Member, 'relation' | 'birthYear'>, currentYear?: number): number {
  return (isSenior(member, currentYear) ? 10 : 5) * LAKH;
}

const EARNER = new Set<Member['relation']>(['self', 'spouse', 'sibling']);

export function coverageRadar(
  member: Pick<Member, 'id' | 'relation' | 'birthYear' | 'healthCheck'>,
  items: Pick<Item, 'memberId' | 'type' | 'amount'>[],
  household: { hasDependants: boolean },
  currentYear?: number,
): RadarRow[] {
  const own = items.filter((i) => i.memberId === member.id);
  const total = (t: ItemType) => own.filter((i) => i.type === t).reduce((n, i) => n + (i.amount ?? 0), 0);
  const has = (t: ItemType) => own.some((i) => i.type === t);
  const loans = total('loan');
  const earner = EARNER.has(member.relation);

  const healthSuggested = healthGuideline(member, currentYear);
  const health = total('health_policy');
  const healthRow: RadarRow = {
    kind: 'health',
    label: COVER_LABELS.health,
    actual: health,
    suggested: healthSuggested,
    status: has('health_policy') ? (health >= healthSuggested ? 'ok' : 'low') : member.healthCheck?.healthCover === 'yes' ? 'self_reported' : 'missing',
    why: has('health_policy')
      ? health >= healthSuggested
        ? 'Hospital bills are covered up to the usual guideline.'
        : `Below the ₹${healthSuggested / LAKH} lakh often suggested${isSenior(member, currentYear) ? ' after 55' : ''}. A super top-up is a cheap way to add more.`
      : member.healthCheck?.healthCover === 'yes'
        ? 'You said there’s a policy. Add it so we can check the amount.'
        : 'Pays hospital bills. Without it, one stay can cost lakhs.',
  };

  const termNeeded = loans > 0 || (earner && household.hasDependants);
  const term = total('term_policy');
  const termRow: RadarRow = {
    kind: 'term',
    label: COVER_LABELS.term,
    actual: term,
    suggested: loans > 0 ? loans : null,
    status: has('term_policy') ? (loans > 0 && term < loans ? 'low' : 'ok') : termNeeded ? 'missing' : 'optional',
    why: has('term_policy')
      ? loans > 0 && term < loans
        ? 'Less than the loans it would need to repay.'
        : 'Pays the family a lump sum if the earner dies.'
      : termNeeded
        ? loans > 0
          ? 'There’s a loan but no term cover to repay it.'
          : 'Others depend on this income. Term cover is often 10–15× yearly income.'
        : 'Usually only needed if someone depends on this income.',
  };

  const optionalRow = (kind: 'critical_illness' | 'accident', why: string, whyHave: string): RadarRow => {
    const t = KIND_ITEMS[kind];
    return {
      kind,
      label: COVER_LABELS[kind],
      actual: total(t),
      suggested: null,
      status: has(t) ? 'ok' : 'optional',
      why: has(t) ? whyHave : why,
    };
  };

  return [
    healthRow,
    termRow,
    optionalRow(
      'critical_illness',
      'Optional. Pays a lump sum on diagnosis of illnesses like cancer.',
      'Pays a lump sum on diagnosis of a listed illness.',
    ),
    optionalRow(
      'accident',
      earner ? 'Optional. Cheap cover for accidental death or disability.' : 'Optional at this age.',
      'Pays out for accidental death or disability.',
    ),
  ];
}

/** Rows that need attention, worst first. */
export function radarGaps(rows: RadarRow[]): RadarRow[] {
  const rank: Record<CoverStatus, number> = { missing: 0, low: 1, self_reported: 2, optional: 3, ok: 4 };
  return rows.filter((r) => r.status === 'missing' || r.status === 'low' || r.status === 'self_reported').sort((a, b) => rank[a.status] - rank[b.status]);
}

/** Whether anyone in the household depends on an earner: parents, children or grandparents. */
export function hasDependants(members: Pick<Member, 'relation'>[]): boolean {
  return members.some((m) => m.relation === 'mother' || m.relation === 'father' || m.relation === 'child' || m.relation === 'grandparent');
}
