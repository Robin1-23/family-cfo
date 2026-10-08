import type { DocType, Relation, Role } from './types';

export const RELATION_LABELS: Record<Relation, string> = {
  self: 'Me',
  mother: 'Mother',
  father: 'Father',
  spouse: 'Spouse',
  sibling: 'Sibling',
  child: 'Child',
  grandparent: 'Grandparent',
  other: 'Other',
};

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  co_manager: 'Co-manager',
  viewer: 'Viewer',
};

export const ROLE_HINTS: Record<Role, string> = {
  owner: 'Full control, billing and members',
  co_manager: 'Can add and edit documents',
  viewer: 'Can see the family dashboard only',
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  health_policy: 'Health insurance',
  term_policy: 'Term insurance',
  life_policy: 'Life / LIC policy',
  vehicle_policy: 'Vehicle insurance',
  fixed_deposit: 'Fixed deposit',
  mutual_fund: 'Mutual fund statement',
  loan: 'Loan / EMI',
  property: 'Property papers',
  id_document: 'ID document',
  tax: 'Tax / ITR',
  other: 'Other',
};

/** The document types that make up a member's basic safety net, in priority order. */
export const ESSENTIAL_DOC_TYPES: DocType[] = ['health_policy', 'term_policy', 'id_document'];

export const RELATION_ORDER: Relation[] = [
  'self',
  'mother',
  'father',
  'spouse',
  'sibling',
  'child',
  'grandparent',
  'other',
];

export const DOC_TYPE_ORDER = Object.keys(DOC_TYPE_LABELS) as DocType[];
