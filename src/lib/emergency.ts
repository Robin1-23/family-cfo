import type { Item, Member } from './types';

/**
 * Emergency Mode content. Checklists are generic claim steps that apply to any
 * Indian health insurer; helplines come only from the user's own policies.
 */

const HEALTH_COVER = new Set<Item['type']>(['health_policy', 'critical_illness_policy', 'accident_policy']);

export interface EmergencyPolicy {
  item: Item;
  member: Pick<Member, 'id' | 'name' | 'relation' | 'city'> | undefined;
  /** Renewal date has passed: the policy may have lapsed. */
  mayHaveLapsed: boolean;
}

/** Health, critical illness and accident policies, for one person or everyone, health first. */
export function emergencyPolicies(
  items: Item[],
  members: Pick<Member, 'id' | 'name' | 'relation' | 'city'>[],
  today: string,
  memberId?: string,
): EmergencyPolicy[] {
  const order = (t: Item['type']) => (t === 'health_policy' ? 0 : t === 'accident_policy' ? 1 : 2);
  return items
    .filter((i) => HEALTH_COVER.has(i.type) && (!memberId || i.memberId === memberId))
    .sort((a, b) => order(a.type) - order(b.type) || (b.amount ?? 0) - (a.amount ?? 0))
    .map((item) => ({
      item,
      member: members.find((m) => m.id === item.memberId),
      mayHaveLapsed: !!item.dueDate && item.dueDate < today,
    }));
}

export const CASHLESS_STEPS = [
  'Go to the hospital’s insurance (TPA) desk first',
  'Show the health card or e-card and a photo ID',
  'Give the policy number and the doctor’s admission note',
  'The desk sends a pre-authorisation request to the insurer',
  'Keep every bill and report until the claim is settled',
] as const;

export const REIMBURSEMENT_DOCS = [
  'Claim form, signed',
  'Discharge summary',
  'All original bills and payment receipts',
  'Pharmacy bills with prescriptions',
  'Test and scan reports',
  'Cancelled cheque or bank details',
  'Photo ID and the policy copy',
] as const;

/** A web search for the insurer's cashless hospitals near the member. We never hard-code insurer URLs. */
export function cashlessSearchUrl(provider: string | null, city: string | null): string {
  const q = [provider ?? 'health insurance', 'cashless hospital list', city].filter(Boolean).join(' ');
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, '')}`;
}
