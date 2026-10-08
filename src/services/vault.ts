import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';
import { getDownloadURL, putFile, ref } from '@react-native-firebase/storage';

import { documentStoragePath, safeFileName, validateUpload } from '@/lib/files';
import type { DocType, VaultDocument } from '@/lib/types';
import { db, storage } from './firebase';

export interface UploadInput {
  householdId: string;
  memberId: string;
  uid: string;
  docType: DocType;
  title: string;
  localUri: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  onProgress?: (fraction: number) => void;
}

/**
 * Uploads the file to Storage, then records it in Firestore with ocrStatus
 * "pending" so the extraction function (next sprint) can pick it up.
 */
export async function uploadDocument(input: UploadInput): Promise<string> {
  const error = validateUpload(input);
  if (error) throw new Error(error);

  const docRef = doc(collection(db, 'households', input.householdId, 'documents'));
  const path = documentStoragePath(input.householdId, input.memberId, docRef.id, input.fileName);

  const task = putFile(ref(storage, path), input.localUri, {
    contentType: input.contentType,
    customMetadata: { householdId: input.householdId, memberId: input.memberId, uploadedBy: input.uid },
  });
  task.on('state_changed', (s) => {
    if (s.totalBytes > 0) input.onProgress?.(s.bytesTransferred / s.totalBytes);
  });
  await task;

  await setDoc(docRef, {
    memberId: input.memberId,
    docType: input.docType,
    title: (input.title.trim() || safeFileName(input.fileName)).slice(0, 120),
    fileName: safeFileName(input.fileName),
    storagePath: path,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    ocrStatus: 'pending',
    uploadedBy: input.uid,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export function subscribeDocuments(
  householdId: string,
  onData: (docs: VaultDocument[]) => void,
  onError: (e: Error) => void,
): () => void {
  return onSnapshot(
    query(collection(db, 'households', householdId, 'documents'), orderBy('createdAt', 'desc')),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VaultDocument, 'id'>) }))),
    onError,
  );
}

export function documentUrl(storagePath: string): Promise<string> {
  return getDownloadURL(ref(storage, storagePath));
}
