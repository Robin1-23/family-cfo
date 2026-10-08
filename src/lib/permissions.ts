import type { Household, Role } from './types';

export function roleOf(household: Pick<Household, 'roles'> | null, uid: string | null): Role | null {
  if (!household || !uid) return null;
  return household.roles[uid] ?? null;
}

/** Owners and co-managers can add members and upload documents. Mirrors firestore.rules. */
export function canEdit(role: Role | null): boolean {
  return role === 'owner' || role === 'co_manager';
}

/** Only owners can change roles, plan or delete the household. Mirrors firestore.rules. */
export function canAdminister(role: Role | null): boolean {
  return role === 'owner';
}
