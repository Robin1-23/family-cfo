import { ITEM_TYPES, last4, parseDate, parseRupees } from '../../functions/src/extraction';
import type { DocType, FieldKey, Item, ItemType, VaultDocument } from './types';

export { ITEM_TYPES };

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  health_policy: 'Health insurance',
  term_policy: 'Term insurance',
  life_policy: 'Life / LIC policy',
  critical_illness_policy: 'Critical illness cover',
  accident_policy: 'Accident cover',
  vehicle_policy: 'Vehicle insurance',
  fixed_deposit: 'Fixed deposit',
  loan: 'Loan / EMI',
  other: 'Other',
};

/** Below this the confirm screen asks the user to double-check the field. */
export const LOW_CONFIDENCE = 0.7;

/** What the confirm form edits: plain strings, as typed. */
export interface ItemDraft {
  type: ItemType | null;
  provider: string;
  numberLast4: string;
  amount: string;
  premium: string;
  dueDate: string;
  maturityDate: string;
  nominee: string;
}

export type ItemData = Omit<Item, 'id' | 'createdAt'>;

const DOC_TO_ITEM: Partial<Record<DocType, ItemType>> = {
  health_policy: 'health_policy',
  term_policy: 'term_policy',
  life_policy: 'life_policy',
  vehicle_policy: 'vehicle_policy',
  fixed_deposit: 'fixed_deposit',
  loan: 'loan',
};

const inr = new Intl.NumberFormat('en-IN');

/** "2026-03-31" -> "31/03/2026", the format Indian users type and read. */
export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function formatRupees(n: number | null): string {
  return n == null ? '' : `₹${inr.format(n)}`;
}

/** Short Indian form for big numbers on cards: ₹5L, ₹1.5Cr, ₹45K. */
export function formatCompactRupees(n: number): string {
  const trim = (x: number) => String(Math.round(x * 10) / 10);
  if (n >= 1e7) return `₹${trim(n / 1e7)}Cr`;
  if (n >= 1e5) return `₹${trim(n / 1e5)}L`;
  if (n >= 1e3) return `₹${trim(n / 1e3)}K`;
  return `₹${n}`;
}

/** Prefills the form from OCR suggestions, falling back to the document's type. */
export function draftFromDocument(doc: Pick<VaultDocument, 'docType' | 'extractedFields'> | null): ItemDraft {
  const x = doc?.extractedFields;
  return {
    type: x?.itemType ?? (doc ? (DOC_TO_ITEM[doc.docType] ?? null) : null),
    provider: x?.provider ?? '',
    numberLast4: x?.numberLast4 ?? '',
    amount: x?.amount != null ? inr.format(x.amount) : '',
    premium: x?.premium != null ? inr.format(x.premium) : '',
    dueDate: formatDate(x?.dueDate ?? null),
    maturityDate: formatDate(x?.maturityDate ?? null),
    nominee: x?.nominee ?? '',
  };
}

/** Fields the model filled in but wasn't sure about. */
export function lowConfidenceFields(doc: Pick<VaultDocument, 'extractedFields'> | null): Set<FieldKey> {
  const c = doc?.extractedFields?.confidence ?? {};
  return new Set((Object.keys(c) as FieldKey[]).filter((k) => (c[k] ?? 0) < LOW_CONFIDENCE));
}

/** Validates the form and builds the Firestore record. Mirrors the items rules in firestore.rules. */
export function buildItem(
  draft: ItemDraft,
  ctx: { memberId: string; uid: string; sourceDocId: string | null },
): { item: ItemData; errors: null } | { item: null; errors: Partial<Record<keyof ItemDraft, string>> } {
  const errors: Partial<Record<keyof ItemDraft, string>> = {};
  const text = (v: string, max: number) => v.trim().replace(/\s+/g, ' ').slice(0, max) || null;
  const money = (key: 'amount' | 'premium') => {
    if (!draft[key].trim()) return null;
    const n = parseRupees(draft[key]);
    if (n === null) errors[key] = 'Enter an amount in rupees, like 5,00,000.';
    return n;
  };
  const date = (key: 'dueDate' | 'maturityDate') => {
    if (!draft[key].trim()) return null;
    const d = parseDate(draft[key]);
    if (d === null) errors[key] = 'Enter a date as DD/MM/YYYY.';
    return d;
  };

  if (!draft.type) errors.type = 'Choose what this is.';
  const item: ItemData = {
    type: draft.type ?? 'other',
    memberId: ctx.memberId,
    provider: text(draft.provider, 80),
    numberLast4: last4(draft.numberLast4),
    amount: money('amount'),
    premium: money('premium'),
    dueDate: date('dueDate'),
    maturityDate: date('maturityDate'),
    nominee: text(draft.nominee, 60),
    sourceDocId: ctx.sourceDocId,
    confirmedBy: ctx.uid,
  };
  return Object.keys(errors).length > 0 ? { item: null, errors } : { item, errors: null };
}
