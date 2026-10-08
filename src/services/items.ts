import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from '@react-native-firebase/firestore';

import type { ItemData } from '@/lib/items';
import type { Item } from '@/lib/types';
import { db } from './firebase';

/** Saves a confirmed item. If it came from a document, the onItemCreated function marks that document confirmed. */
export async function addItem(householdId: string, item: ItemData): Promise<string> {
  const ref = doc(collection(db, 'households', householdId, 'items'));
  await setDoc(ref, { ...item, createdAt: serverTimestamp() });
  return ref.id;
}

export function subscribeItems(
  householdId: string,
  onData: (items: Item[]) => void,
  onError: (e: Error) => void,
): () => void {
  return onSnapshot(
    query(collection(db, 'households', householdId, 'items'), orderBy('createdAt', 'asc')),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Item, 'id'>) }))),
    onError,
  );
}
