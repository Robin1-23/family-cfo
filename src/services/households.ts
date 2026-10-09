import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from '@react-native-firebase/firestore';

import type { ConsentRecord, HealthCheck, Household, Language, Member, Relation, Role, UserProfile } from '@/lib/types';
import { db } from './firebase';

type Unsubscribe = () => void;

export interface NewMemberInput {
  name: string;
  relation: Relation;
  role?: Role;
  language?: Language;
  birthYear?: number | null;
  city?: string | null;
  phone?: string | null;
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => onData(snap.exists() ? (snap.data() as UserProfile) : null),
    onError,
  );
}

/** Creates users/{uid} on first sign-in. Rules require `phone` to match the verified auth phone. */
export async function ensureUserProfile(uid: string, phone: string): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { phone, activeHouseholdId: null, createdAt: serverTimestamp() });
  }
}

/**
 * Creates the household, the owner's own member card and any family members
 * in one atomic batch, then points the user's profile at it.
 */
export async function createHousehold(params: {
  uid: string;
  phone: string;
  householdName: string;
  ownerName: string;
  ownerLanguage: Language;
  family: NewMemberInput[];
}): Promise<string> {
  const householdRef = doc(collection(db, 'households'));
  const batch = writeBatch(db);

  batch.set(householdRef, {
    name: params.householdName.trim(),
    ownerUid: params.uid,
    plan: 'free',
    roles: { [params.uid]: 'owner' },
    createdAt: serverTimestamp(),
  });

  const ownerRef = doc(collection(db, 'households', householdRef.id, 'members'));
  batch.set(
    ownerRef,
    memberData({ name: params.ownerName, relation: 'self', role: 'owner', language: params.ownerLanguage, phone: params.phone }, params.uid),
  );

  for (const m of params.family) {
    const ref = doc(collection(db, 'households', householdRef.id, 'members'));
    batch.set(ref, memberData(m, null));
  }

  // Includes the (unchanged) phone so this also works if the profile doc doesn't exist yet.
  batch.set(doc(db, 'users', params.uid), { phone: params.phone, activeHouseholdId: householdRef.id }, { merge: true });
  await batch.commit();
  return householdRef.id;
}

function memberData(input: NewMemberInput, uid: string | null) {
  const isSelf = input.relation === 'self';
  return {
    name: input.name.trim(),
    relation: input.relation,
    uid,
    role: input.role ?? (isSelf ? 'owner' : 'viewer'),
    language: input.language ?? (input.relation === 'mother' || input.relation === 'father' ? 'hi' : 'en'),
    consentStatus: isSelf ? 'self' : 'pending',
    birthYear: input.birthYear ?? null,
    city: input.city?.trim() || null,
    phone: input.phone ?? null,
    createdAt: serverTimestamp(),
  };
}

export async function addMember(householdId: string, input: NewMemberInput): Promise<string> {
  const ref = doc(collection(db, 'households', householdId, 'members'));
  await setDoc(ref, memberData(input, null));
  return ref.id;
}

export async function updateMember(
  householdId: string,
  memberId: string,
  patch: Partial<Pick<Member, 'name' | 'relation' | 'language' | 'birthYear' | 'city' | 'phone'>>,
): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'members', memberId), patch);
}

/** Saves the onboarding health-check answers for several members at once. */
export async function saveHealthChecks(householdId: string, checks: { memberId: string; check: HealthCheck }[]): Promise<void> {
  const batch = writeBatch(db);
  for (const { memberId, check } of checks) {
    batch.update(doc(db, 'households', householdId, 'members', memberId), { healthCheck: check });
  }
  await batch.commit();
}

export function subscribeHousehold(
  householdId: string,
  onData: (h: Household | null) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'households', householdId),
    (snap) => onData(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Household, 'id'>) }) : null),
    onError,
  );
}

export function subscribeMembers(
  householdId: string,
  onData: (members: Member[]) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'households', householdId, 'members'), orderBy('createdAt', 'asc')),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Member, 'id'>) }))),
    onError,
  );
}

export function subscribeConsents(
  householdId: string,
  onData: (consents: ConsentRecord[]) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, 'households', householdId, 'consents'),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ConsentRecord, 'id'>) }))),
    onError,
  );
}
