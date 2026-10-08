import { ESSENTIAL_DOC_TYPES } from './catalog';
import type { DocType, Member, VaultDocument } from './types';

export interface MemberReadiness {
  memberId: string;
  documentCount: number;
  present: DocType[];
  missing: DocType[];
  /** 0-100: share of essential document types this member has in the vault. */
  percent: number;
}

/**
 * Foundation-sprint stand-in for the Coverage Score: how much of each member's
 * essential paperwork is in the vault. The real score (sum assured vs need)
 * arrives with OCR extraction in the next sprint.
 */
export function memberReadiness(member: Pick<Member, 'id'>, documents: VaultDocument[]): MemberReadiness {
  const own = documents.filter((d) => d.memberId === member.id);
  const types = new Set(own.map((d) => d.docType));
  const present = ESSENTIAL_DOC_TYPES.filter((t) => types.has(t));
  const missing = ESSENTIAL_DOC_TYPES.filter((t) => !types.has(t));
  return {
    memberId: member.id,
    documentCount: own.length,
    present,
    missing,
    percent: Math.round((present.length / ESSENTIAL_DOC_TYPES.length) * 100),
  };
}

export function familyReadiness(members: Pick<Member, 'id'>[], documents: VaultDocument[]): number {
  if (members.length === 0) return 0;
  const total = members.reduce((sum, m) => sum + memberReadiness(m, documents).percent, 0);
  return Math.round(total / members.length);
}

export interface NextAction {
  memberId: string;
  docType: DocType;
}

/** The most useful uploads to ask for next: one missing essential per member, parents first. */
export function nextActions(
  members: Pick<Member, 'id' | 'relation'>[],
  documents: VaultDocument[],
  limit = 3,
): NextAction[] {
  const priority = (relation: Member['relation']) =>
    relation === 'mother' || relation === 'father' ? 0 : relation === 'self' ? 1 : 2;
  const sorted = [...members].sort((a, b) => priority(a.relation) - priority(b.relation));
  const actions: NextAction[] = [];
  for (const m of sorted) {
    const { missing } = memberReadiness(m, documents);
    if (missing.length > 0) actions.push({ memberId: m.id, docType: missing[0] });
    if (actions.length >= limit) break;
  }
  return actions;
}
