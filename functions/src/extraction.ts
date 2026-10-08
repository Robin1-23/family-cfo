/**
 * Pure post-processing for OCR extraction. No Firebase or SDK imports, so
 * tests/lib.test.ts can cover it directly.
 *
 * Keep ITEM_TYPES in sync with src/lib/types.ts (a test asserts they match).
 */

export const ITEM_TYPES = [
  'health_policy',
  'term_policy',
  'life_policy',
  'critical_illness_policy',
  'accident_policy',
  'vehicle_policy',
  'fixed_deposit',
  'loan',
  'other',
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export const FIELD_KEYS = [
  'itemType',
  'provider',
  'numberLast4',
  'amount',
  'premium',
  'dueDate',
  'maturityDate',
  'nominee',
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

export interface ExtractedFields {
  itemType: ItemType | null;
  provider: string | null;
  /** Never the full policy/account number: last 4 characters only. */
  numberLast4: string | null;
  /** Sum assured, FD principal or loan amount, in whole rupees. */
  amount: number | null;
  /** Premium or EMI, in whole rupees. */
  premium: number | null;
  /** YYYY-MM-DD */
  dueDate: string | null;
  maturityDate: string | null;
  nominee: string | null;
  /** 0–1 per field; the confirm screen asks the user to check low ones. */
  confidence: Partial<Record<FieldKey, number>>;
}

/** What the model returns: everything as loose strings, with per-field confidence. */
export interface RawExtraction {
  itemType: string | null;
  provider: string | null;
  policyOrAccountNumber: string | null;
  amount: string | null;
  premium: string | null;
  dueDate: string | null;
  maturityDate: string | null;
  nominee: string | null;
  confidence: Record<string, number>;
}

export function last4(value: string | null | undefined): string | null {
  const clean = (value ?? '').replace(/[^A-Za-z0-9]/g, '');
  return clean.length > 0 ? clean.slice(-4).toUpperCase() : null;
}

/** "₹5,00,000", "500000.00", "5 lakh" -> 500000. Returns null for anything unclear. */
export function parseRupees(value: string | null | undefined): number | null {
  if (!value) return null;
  const s = value.toLowerCase().replace(/rs\.?|inr|₹|\/-|,|\s/g, '');
  const m = /^(\d+(?:\.\d+)?)(lakh|lac|lakhs|crore|cr)?$/.exec(s);
  if (!m) return null;
  const unit = m[2] ? (m[2].startsWith('c') ? 1e7 : 1e5) : 1;
  const n = Math.round(parseFloat(m[1]) * unit);
  return Number.isFinite(n) && n >= 0 && n <= 1e12 ? n : null;
}

/** Accepts YYYY-MM-DD or Indian DD/MM/YYYY (also with - or .). Returns YYYY-MM-DD or null. */
export function parseDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = value.trim();
  let y: number, mo: number, d: number;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) [y, mo, d] = [+m[1], +m[2], +m[3]];
  else if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s))) [d, mo, y] = [+m[1], +m[2], +m[3]];
  else return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (y < 1900 || y > 2100 || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function shortText(value: string | null | undefined, max = 80): string | null {
  const t = (value ?? '').trim().replace(/\s+/g, ' ');
  return t.length > 0 ? t.slice(0, max) : null;
}

export function normalizeExtraction(raw: RawExtraction): ExtractedFields {
  const itemType = (ITEM_TYPES as readonly string[]).includes(raw.itemType ?? '') ? (raw.itemType as ItemType) : null;
  const fields: Omit<ExtractedFields, 'confidence'> = {
    itemType,
    provider: shortText(raw.provider),
    numberLast4: last4(raw.policyOrAccountNumber),
    amount: parseRupees(raw.amount),
    premium: parseRupees(raw.premium),
    dueDate: parseDate(raw.dueDate),
    maturityDate: parseDate(raw.maturityDate),
    nominee: shortText(raw.nominee, 60),
  };
  const confidence: Partial<Record<FieldKey, number>> = {};
  for (const key of FIELD_KEYS) {
    if (fields[key] === null) continue;
    const c = raw.confidence[key === 'numberLast4' ? 'policyOrAccountNumber' : key];
    confidence[key] = typeof c === 'number' && c >= 0 && c <= 1 ? c : 0;
  }
  return { ...fields, confidence };
}
