/// <reference types="node" />
/**
 * Firestore security-rules tests. Needs the emulator (Java 11+):
 *   npm run test:rules
 * which wraps: firebase emulators:exec --only firestore "tsx --test tests/firestore.rules.test.ts"
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, serverTimestamp, setDoc, getDoc, updateDoc, writeBatch, collection } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';

let env: RulesTestEnvironment;

const OWNER = { uid: 'owner', phone: '+919876543210' };
const OTHER = { uid: 'stranger', phone: '+919811111111' };

function as(user: { uid: string; phone: string }) {
  return env.authenticatedContext(user.uid, { phone_number: user.phone }).firestore();
}

/** The same batch createHousehold() sends from the app. */
async function createHouseholdAs(user: { uid: string; phone: string }, hid = 'h1') {
  const db = as(user);
  const batch = writeBatch(db);
  batch.set(doc(db, 'households', hid), {
    name: 'Sharma family',
    ownerUid: user.uid,
    plan: 'free',
    roles: { [user.uid]: 'owner' },
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, 'households', hid, 'members', 'self'), {
    name: 'Priya',
    relation: 'self',
    uid: user.uid,
    role: 'owner',
    language: 'en',
    consentStatus: 'self',
    birthYear: null,
    city: null,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, 'households', hid, 'members', 'mum'), {
    name: 'Sunita',
    relation: 'mother',
    uid: null,
    role: 'viewer',
    language: 'hi',
    consentStatus: 'pending',
    birthYear: 1966,
    city: 'Lucknow',
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users', user.uid), { phone: user.phone, activeHouseholdId: hid }, { merge: true });
  return batch.commit();
}

function vaultDoc(hid: string, did: string, overrides: Record<string, unknown> = {}) {
  return {
    memberId: 'mum',
    docType: 'health_policy',
    title: 'Star Health',
    fileName: 'policy.pdf',
    storagePath: `households/${hid}/members/mum/documents/${did}/policy.pdf`,
    contentType: 'application/pdf',
    sizeBytes: 1000,
    ocrStatus: 'pending',
    uploadedBy: OWNER.uid,
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'family-cfo-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
});

after(async () => {
  await env.cleanup();
});

describe('users', () => {
  it('lets a user create their own profile with their verified phone', async () => {
    await assertSucceeds(setDoc(doc(as(OWNER), 'users', OWNER.uid), { phone: OWNER.phone, activeHouseholdId: null }));
  });
  it('blocks a profile with someone else’s phone, or for another uid', async () => {
    await assertFails(setDoc(doc(as(OWNER), 'users', OWNER.uid), { phone: OTHER.phone, activeHouseholdId: null }));
    await assertFails(setDoc(doc(as(OWNER), 'users', OTHER.uid), { phone: OWNER.phone, activeHouseholdId: null }));
  });
  it('blocks pointing your profile at a household you don’t belong to', async () => {
    await createHouseholdAs(OWNER);
    await assertFails(setDoc(doc(as(OTHER), 'users', OTHER.uid), { phone: OTHER.phone, activeHouseholdId: 'h1' }));
  });
});

describe('households', () => {
  it('allows the onboarding batch', async () => {
    await assertSucceeds(createHouseholdAs(OWNER));
  });
  it('blocks creating a household that grants roles to others or a paid plan', async () => {
    const db = as(OWNER);
    await assertFails(
      setDoc(doc(db, 'households', 'h2'), {
        name: 'x', ownerUid: OWNER.uid, plan: 'free', roles: { [OWNER.uid]: 'owner', [OTHER.uid]: 'owner' },
      }),
    );
    await assertFails(
      setDoc(doc(db, 'households', 'h3'), { name: 'x', ownerUid: OWNER.uid, plan: 'pro', roles: { [OWNER.uid]: 'owner' } }),
    );
  });
  it('keeps households private to their members', async () => {
    await createHouseholdAs(OWNER);
    await assertSucceeds(getDoc(doc(as(OWNER), 'households', 'h1')));
    await assertFails(getDoc(doc(as(OTHER), 'households', 'h1')));
    await assertFails(getDoc(doc(as(OTHER), 'households', 'h1', 'members', 'mum')));
  });
  it('never lets the client upgrade the plan', async () => {
    await createHouseholdAs(OWNER);
    await assertFails(updateDoc(doc(as(OWNER), 'households', 'h1'), { plan: 'pro' }));
  });
});

describe('members', () => {
  it('starts new family members as pending-consent viewers', async () => {
    await createHouseholdAs(OWNER);
    const db = as(OWNER);
    const base = { name: 'Ramesh', relation: 'father', uid: null, language: 'hi', birthYear: null, city: null, createdAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(collection(db, 'households', 'h1', 'members')), { ...base, role: 'viewer', consentStatus: 'pending' }));
    await assertFails(setDoc(doc(collection(db, 'households', 'h1', 'members')), { ...base, role: 'co_manager', consentStatus: 'pending' }));
    await assertFails(setDoc(doc(collection(db, 'households', 'h1', 'members')), { ...base, role: 'viewer', consentStatus: 'granted' }));
  });
  it('does not let anyone flip consent from the client', async () => {
    await createHouseholdAs(OWNER);
    await assertFails(updateDoc(doc(as(OWNER), 'households', 'h1', 'members', 'mum'), { consentStatus: 'granted' }));
    await assertSucceeds(updateDoc(doc(as(OWNER), 'households', 'h1', 'members', 'mum'), { city: 'Kanpur' }));
  });
});

describe('health check answers', () => {
  const ok = { healthCover: 'yes', healthCoverBand: '5l_10l', loans: 'no', termCover: null, fixedDeposits: 'yes', papersWith: 'family' };
  it('lets an editor save well-formed answers on a member', async () => {
    await createHouseholdAs(OWNER);
    await assertSucceeds(updateDoc(doc(as(OWNER), 'households', 'h1', 'members', 'mum'), { healthCheck: ok }));
  });
  it('rejects answers that skip or contradict the conditional questions, and strangers', async () => {
    await createHouseholdAs(OWNER);
    const ref = doc(as(OWNER), 'households', 'h1', 'members', 'mum');
    await assertFails(updateDoc(ref, { healthCheck: { ...ok, healthCoverBand: null } }));
    await assertFails(updateDoc(ref, { healthCheck: { ...ok, healthCover: 'no' } }));
    await assertFails(updateDoc(ref, { healthCheck: { ...ok, loans: 'yes' } }));
    await assertFails(updateDoc(ref, { healthCheck: { ...ok, papersWith: 'me' } }));
    await assertFails(updateDoc(ref, { healthCheck: { ...ok, extra: 1 } }));
    await assertFails(updateDoc(doc(as(OTHER), 'households', 'h1', 'members', 'mum'), { healthCheck: ok }));
  });
});

describe('documents', () => {
  it('accepts a well-formed upload record from an editor', async () => {
    await createHouseholdAs(OWNER);
    await assertSucceeds(setDoc(doc(as(OWNER), 'households', 'h1', 'documents', 'd1'), vaultDoc('h1', 'd1')));
  });
  it('rejects records for strangers, other paths, fake uploaders or pre-set OCR status', async () => {
    await createHouseholdAs(OWNER);
    await assertFails(setDoc(doc(as(OTHER), 'households', 'h1', 'documents', 'd1'), vaultDoc('h1', 'd1', { uploadedBy: OTHER.uid })));
    const db = as(OWNER);
    await assertFails(setDoc(doc(db, 'households', 'h1', 'documents', 'd2'), vaultDoc('h1', 'd2', { storagePath: 'households/h9/x.pdf' })));
    await assertFails(setDoc(doc(db, 'households', 'h1', 'documents', 'd3'), vaultDoc('h1', 'd3', { uploadedBy: OTHER.uid })));
    await assertFails(setDoc(doc(db, 'households', 'h1', 'documents', 'd4'), vaultDoc('h1', 'd4', { ocrStatus: 'confirmed' })));
    await assertFails(setDoc(doc(db, 'households', 'h1', 'documents', 'd5'), vaultDoc('h1', 'd5', { memberId: 'ghost', storagePath: 'households/h1/members/ghost/documents/d5/policy.pdf' })));
  });
});

describe('items', () => {
  const item = (overrides: Record<string, unknown> = {}) => ({
    type: 'health_policy', memberId: 'mum', provider: 'Star Health', numberLast4: '4567', amount: 500000,
    premium: 18000, dueDate: '2026-08-15', maturityDate: null, nominee: 'Ramesh', sourceDocId: null,
    confirmedBy: OWNER.uid, createdAt: serverTimestamp(), ...overrides,
  });

  it('accepts a manual item and one confirmed from the same member’s document', async () => {
    await createHouseholdAs(OWNER);
    const db = as(OWNER);
    await assertSucceeds(setDoc(doc(db, 'households', 'h1', 'items', 'i1'), item()));
    await setDoc(doc(db, 'households', 'h1', 'documents', 'd1'), vaultDoc('h1', 'd1'));
    await assertSucceeds(setDoc(doc(db, 'households', 'h1', 'items', 'i2'), item({ sourceDocId: 'd1' })));
  });
  it('rejects full numbers, bad amounts or dates, strangers, and another member’s document', async () => {
    await createHouseholdAs(OWNER);
    const db = as(OWNER);
    await setDoc(doc(db, 'households', 'h1', 'documents', 'd1'), vaultDoc('h1', 'd1'));
    const bad = [
      item({ numberLast4: '1234567890' }),
      item({ amount: -1 }),
      item({ amount: 12.5 }),
      item({ dueDate: '15/08/2026' }),
      item({ type: 'savings_account' }),
      item({ confirmedBy: OTHER.uid }),
      item({ memberId: 'self', sourceDocId: 'd1' }),
      item({ extra: true }),
    ];
    for (const [n, data] of bad.entries()) {
      await assertFails(setDoc(doc(db, 'households', 'h1', 'items', `bad${n}`), data));
    }
    await assertFails(setDoc(doc(as(OTHER), 'households', 'h1', 'items', 'x'), item({ confirmedBy: OTHER.uid })));
  });
  it('lets editors fix details but not re-point the source document', async () => {
    await createHouseholdAs(OWNER);
    const db = as(OWNER);
    await setDoc(doc(db, 'households', 'h1', 'items', 'i1'), item());
    await assertSucceeds(updateDoc(doc(db, 'households', 'h1', 'items', 'i1'), { premium: 19000 }));
    await assertFails(updateDoc(doc(db, 'households', 'h1', 'items', 'i1'), { sourceDocId: 'd9' }));
  });
});

describe('consents', () => {
  it('are read-only for clients', async () => {
    await createHouseholdAs(OWNER);
    await assertFails(setDoc(doc(as(OWNER), 'households', 'h1', 'consents', 'c1'), { memberId: 'mum' }));
  });
});
