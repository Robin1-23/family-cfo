import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, writeBatch } from '@react-native-firebase/firestore';

import type { ItemData } from '@/lib/items';
import type { Item, LedgerEntry } from '@/lib/types';
import { addDays } from '../../functions/src/alerts';
import { nextDueDate } from '@/lib/timeline';
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

/** Replaces an item's details. Rules require confirmedBy to be the editor, so it is re-stamped. */
export async function saveItem(householdId: string, itemId: string, item: ItemData): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'items', itemId), { ...item });
}

/**
 * Moves the premium or EMI to its next date, clears any snooze, and records the
 * payment in the family ledger (one atomic batch) so the cost-split stays current.
 */
export async function markPaid(
  householdId: string,
  item: Item,
  kind: 'premium' | 'emi',
  today: string,
  uid: string,
  payerMemberId: string | null,
): Promise<PaidUndo | null> {
  if (!item.dueDate) return null;
  const batch = writeBatch(db);
  const ledgerRef = payerMemberId && item.premium ? doc(collection(db, 'households', householdId, 'ledger')) : null;
  batch.update(doc(db, 'households', householdId, 'items', item.id), {
    dueDate: nextDueDate(kind, item.dueDate),
    lastPaidOn: today,
    snoozedUntil: null,
    confirmedBy: uid,
  });
  if (ledgerRef) {
    batch.set(ledgerRef, {
      payerMemberId,
      itemId: item.id,
      amount: item.premium,
      date: today,
      note: null,
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return {
    itemId: item.id,
    previous: { dueDate: item.dueDate, lastPaidOn: item.lastPaidOn ?? null, snoozedUntil: item.snoozedUntil ?? null },
    ledgerId: ledgerRef?.id ?? null,
  };
}

/** What "Mark paid" changed, so the toast's Undo can put it back. */
export interface PaidUndo {
  itemId: string;
  previous: Pick<Item, 'dueDate'> & { lastPaidOn: string | null; snoozedUntil: string | null };
  ledgerId: string | null;
}

export async function undoMarkPaid(householdId: string, undo: PaidUndo, uid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'households', householdId, 'items', undo.itemId), { ...undo.previous, confirmedBy: uid });
  if (undo.ledgerId) batch.delete(doc(db, 'households', householdId, 'ledger', undo.ledgerId));
  await batch.commit();
}

export async function addLedgerEntry(householdId: string, entry: Omit<LedgerEntry, 'id' | 'createdAt'>): Promise<void> {
  await setDoc(doc(collection(db, 'households', householdId, 'ledger')), { ...entry, createdAt: serverTimestamp() });
}

export async function deleteLedgerEntry(householdId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'households', householdId, 'ledger', id));
}

export function subscribeLedger(householdId: string, onData: (entries: LedgerEntry[]) => void, onError: (e: Error) => void): () => void {
  return onSnapshot(
    query(collection(db, 'households', householdId, 'ledger'), orderBy('date', 'desc')),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LedgerEntry, 'id'>) }))),
    onError,
  );
}

export async function snooze(householdId: string, itemId: string, today: string, days: number, uid: string): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'items', itemId), { snoozedUntil: addDays(today, days), confirmedBy: uid });
}

export async function unsnooze(householdId: string, itemId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'items', itemId), { snoozedUntil: null, confirmedBy: uid });
}

export async function deleteItem(householdId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'households', householdId, 'items', itemId));
}
