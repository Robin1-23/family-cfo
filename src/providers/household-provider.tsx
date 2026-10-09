import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { roleOf } from '@/lib/permissions';
import type { Household, Item, Member, Role, UserProfile, VaultDocument } from '@/lib/types';
import { subscribeHousehold, subscribeMembers, subscribeUserProfile } from '@/services/households';
import { subscribeItems } from '@/services/items';
import { subscribeDocuments } from '@/services/vault';
import { useAuth } from './auth-provider';

export type HouseholdStatus = 'signed_out' | 'loading' | 'no_household' | 'ready' | 'error';

interface HouseholdState {
  status: HouseholdStatus;
  error: string | null;
  profile: UserProfile | null;
  household: Household | null;
  members: Member[];
  documents: VaultDocument[];
  items: Item[];
  role: Role | null;
  /** Re-subscribes every listener, for pull-to-refresh. */
  refresh: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdState>({
  status: 'loading',
  error: null,
  profile: null,
  household: null,
  members: [],
  documents: [],
  items: [],
  role: null,
  refresh: async () => undefined,
});

/** A snapshot value tagged with the key (uid or householdId) it was loaded for. */
type Keyed<T> = { key: string; value: T } | null;

function forKey<T>(state: Keyed<T>, key: string | null): T | undefined {
  return state && key && state.key === key ? state.value : undefined;
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();
  const uid = user?.uid ?? null;

  const [profileState, setProfileState] = useState<Keyed<UserProfile | null>>(null);
  const [householdState, setHouseholdState] = useState<Keyed<Household | null>>(null);
  const [membersState, setMembersState] = useState<Keyed<Member[]>>(null);
  const [documentsState, setDocumentsState] = useState<Keyed<VaultDocument[]>>(null);
  const [itemsState, setItemsState] = useState<Keyed<Item[]>>(null);
  const [nonce, setNonce] = useState(0);
  const [errorState, setErrorState] = useState<Keyed<string>>(null);

  useEffect(() => {
    if (!uid) return;
    return subscribeUserProfile(
      uid,
      (value) => setProfileState({ key: uid, value }),
      (e) => setErrorState({ key: uid, value: e.message }),
    );
  }, [uid]);

  const profile = forKey(profileState, uid);
  const householdId = profile?.activeHouseholdId ?? null;

  useEffect(() => {
    if (!uid || !householdId) return;
    const onError = (e: Error) => setErrorState({ key: uid, value: e.message });
    const unsubs = [
      subscribeHousehold(householdId, (value) => setHouseholdState({ key: householdId, value }), onError),
      subscribeMembers(householdId, (value) => setMembersState({ key: householdId, value }), onError),
      subscribeDocuments(householdId, (value) => setDocumentsState({ key: householdId, value }), onError),
      subscribeItems(householdId, (value) => setItemsState({ key: householdId, value }), onError),
    ];
    return () => unsubs.forEach((u) => u());
  }, [uid, householdId, nonce]);

  // ponytail: resolves on a short timer, not on the first fresh snapshot; wire a
  // snapshot promise if refresh ever needs to be exact.
  const refresh = useCallback(async () => {
    setNonce((n) => n + 1);
    await new Promise((r) => setTimeout(r, 700));
  }, []);

  const household = forKey(householdState, householdId);
  const members = forKey(membersState, householdId);
  const documents = forKey(documentsState, householdId);
  const items = forKey(itemsState, householdId);
  const error = forKey(errorState, uid) ?? null;

  const value = useMemo<HouseholdState>(() => {
    let status: HouseholdStatus;
    if (initializing) status = 'loading';
    else if (!uid) status = 'signed_out';
    else if (error) status = 'error';
    else if (profile === undefined) status = 'loading';
    else if (!householdId) status = 'no_household';
    else if (household === undefined || members === undefined || documents === undefined || items === undefined) status = 'loading';
    else if (household === null) status = 'no_household';
    else status = 'ready';

    return {
      status,
      error,
      profile: profile ?? null,
      household: household ?? null,
      members: members ?? [],
      documents: documents ?? [],
      items: items ?? [],
      refresh,
      role: roleOf(household ?? null, uid),
    };
  }, [initializing, uid, error, profile, householdId, household, members, documents, items, refresh]);

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold() {
  return useContext(HouseholdContext);
}
