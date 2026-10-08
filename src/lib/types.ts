/**
 * Firestore data model for Family CFO (Foundation sprint).
 *
 * users/{uid}                              -> UserProfile
 * households/{householdId}                 -> Household
 * households/{householdId}/members/{id}    -> Member
 * households/{householdId}/documents/{id}  -> VaultDocument
 * households/{householdId}/items/{id}      -> Item
 * households/{householdId}/consents/{id}   -> ConsentRecord
 */

import type { ExtractedFields, ItemType } from '../../functions/src/extraction';

export type { ExtractedFields, FieldKey, ItemType } from '../../functions/src/extraction';

export type Role = 'owner' | 'co_manager' | 'viewer';

export type Relation =
  | 'self'
  | 'mother'
  | 'father'
  | 'spouse'
  | 'sibling'
  | 'child'
  | 'grandparent'
  | 'other';

export type Language = 'en' | 'hi';

/** Each adult member consents for themselves; until then their data is "pending consent". */
export type ConsentStatus = 'self' | 'pending' | 'granted' | 'declined';

export type DocType =
  | 'health_policy'
  | 'term_policy'
  | 'life_policy'
  | 'vehicle_policy'
  | 'fixed_deposit'
  | 'mutual_fund'
  | 'loan'
  | 'property'
  | 'id_document'
  | 'tax'
  | 'other';

export type OcrStatus = 'pending' | 'processing' | 'extracted' | 'confirmed' | 'failed';

/** Firestore Timestamp shape we rely on (avoids coupling UI code to the SDK type). */
export interface TimestampLike {
  toMillis(): number;
}

export interface UserProfile {
  phone: string;
  activeHouseholdId: string | null;
  createdAt?: TimestampLike;
}

export interface Household {
  id: string;
  name: string;
  ownerUid: string;
  plan: 'free' | 'pro' | 'pro_plus';
  /** uid -> role. Security rules read this map to authorise every request. */
  roles: Record<string, Role>;
  createdAt?: TimestampLike;
}

export interface Member {
  id: string;
  name: string;
  relation: Relation;
  /** Linked auth user, once the member has joined the household themselves. */
  uid: string | null;
  role: Role;
  language: Language;
  consentStatus: ConsentStatus;
  birthYear: number | null;
  city: string | null;
  /** Self-reported answers from the onboarding health check (src/lib/health-check.ts). */
  healthCheck?: HealthCheck;
  createdAt?: TimestampLike;
}

export type YesNoUnsure = 'yes' | 'no' | 'unsure';

export interface HealthCheck {
  healthCover: YesNoUnsure;
  /** Only when healthCover is "yes". */
  healthCoverBand: 'under_3l' | '3l_5l' | '5l_10l' | '10l_plus' | 'unsure' | null;
  loans: YesNoUnsure;
  /** Only when loans is "yes". */
  termCover: YesNoUnsure | null;
  fixedDeposits: YesNoUnsure;
  papersWith: 'family' | 'one_person' | 'nobody';
}

export interface VaultDocument {
  id: string;
  memberId: string;
  docType: DocType;
  title: string;
  fileName: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  ocrStatus: OcrStatus;
  uploadedBy: string;
  /** Written by the extractDocument Cloud Function; shown for confirmation, never trusted as-is. */
  extractedFields?: ExtractedFields;
  ocrError?: string;
  createdAt?: TimestampLike;
}

/** A confirmed policy, deposit or loan: the single table every screen reads. */
export interface Item {
  id: string;
  type: ItemType;
  memberId: string;
  provider: string | null;
  /** Last 4 characters of the policy/account number only. */
  numberLast4: string | null;
  /** Sum assured, FD principal or loan amount, whole rupees. */
  amount: number | null;
  premium: number | null;
  /** YYYY-MM-DD */
  dueDate: string | null;
  maturityDate: string | null;
  nominee: string | null;
  /** The vault document it was confirmed from, or null for manual entry. */
  sourceDocId: string | null;
  confirmedBy: string;
  createdAt?: TimestampLike;
}

export interface ConsentRecord {
  id: string;
  memberId: string;
  source: 'vault_upload' | 'digilocker' | 'account_aggregator' | 'gmail';
  purpose: string;
  scope: string[];
  grantedBy: string;
  grantedAt?: TimestampLike;
  expiresAt: TimestampLike | null;
  revokedAt: TimestampLike | null;
}
