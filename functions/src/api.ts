import { HttpError, REGION, anthropicKey, db } from './admin';

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

import { todayInIndia } from './alerts';
import { ASK_SYSTEM, buildAskContext, validSources } from './ask';
import { inviteCodeFrom, inviteExpired, normalizeInviteCode } from './invite';

type Role = 'owner' | 'co_manager' | 'viewer';
type Body = Record<string, unknown>;

const SHARE_HOURS = 24;

function str(body: Body, key: string, max = 100): string {
  const v = body[key];
  if (typeof v !== 'string' || v.length === 0 || v.length > max) throw new HttpError(400, `Missing ${key}.`);
  return v;
}

async function roleIn(householdId: string, uid: string): Promise<{ role: Role; data: FirebaseFirestore.DocumentData }> {
  const snap = await db.doc(`households/${householdId}`).get();
  const role = snap.get(`roles.${uid}`) as Role | undefined;
  if (!snap.exists || !role) throw new HttpError(403, 'You’re not part of this family.');
  return { role, data: snap.data()! };
}

async function requireEditor(householdId: string, uid: string) {
  const r = await roleIn(householdId, uid);
  if (r.role === 'viewer') throw new HttpError(403, 'Only the family owner or a co-manager can do this.');
  return r;
}

/** Loads an invite and checks it belongs to the signed-in phone number. */
async function openInvite(rawCode: string, user: DecodedIdToken) {
  const code = normalizeInviteCode(rawCode);
  const ref = db.doc(`invites/${code}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'That invite code doesn’t exist. Check it and try again.');
  const invite = snap.data()!;
  if (inviteExpired((invite.createdAt as Timestamp).toMillis(), Date.now())) {
    throw new HttpError(410, 'This invite has expired. Ask your family to send a new one.');
  }
  if (invite.phone !== user.phone_number) {
    throw new HttpError(403, 'This invite is for a different number. Sign in with the number your family added.');
  }
  return { ref, invite };
}

const routes: Record<string, (user: DecodedIdToken, body: Body) => Promise<unknown>> = {
  /** Owner/co-manager creates a one-time code for a family member who has a phone number on their card. */
  async '/invite/create'(user, body) {
    const householdId = str(body, 'householdId');
    const memberId = str(body, 'memberId');
    await requireEditor(householdId, user.uid);
    const member = await db.doc(`households/${householdId}/members/${memberId}`).get();
    if (!member.exists) throw new HttpError(404, 'This person isn’t in your family.');
    if (member.get('relation') === 'self' || member.get('uid')) throw new HttpError(409, 'This person has already joined.');
    const phone = member.get('phone');
    if (!phone) throw new HttpError(400, 'Add their mobile number first, so only they can accept.');
    const code = inviteCodeFrom(randomBytes(8));
    await db.doc(`invites/${code}`).set({ householdId, memberId, phone, createdBy: user.uid, createdAt: FieldValue.serverTimestamp() });
    return { code };
  },

  /** What the invitee sees before deciding. */
  async '/invite/preview'(user, body) {
    const { invite } = await openInvite(str(body, 'code', 20), user);
    const [household, member, inviter] = await Promise.all([
      db.doc(`households/${invite.householdId}`).get(),
      db.doc(`households/${invite.householdId}/members/${invite.memberId}`).get(),
      db.collection(`households/${invite.householdId}/members`).where('uid', '==', invite.createdBy).limit(1).get(),
    ]);
    return {
      householdName: household.get('name'),
      memberName: member.get('name'),
      language: member.get('language'),
      inviterName: inviter.docs[0]?.get('name') ?? 'Your family',
    };
  },

  /** The invitee approves: link their account, grant consent, record it. Only the Admin SDK can do this. */
  async '/invite/accept'(user, body) {
    const { ref, invite } = await openInvite(str(body, 'code', 20), user);
    const hRef = db.doc(`households/${invite.householdId}`);
    const mRef = db.doc(`households/${invite.householdId}/members/${invite.memberId}`);
    await db.runTransaction(async (tx) => {
      const member = await tx.get(mRef);
      if (!member.exists || member.get('uid')) throw new HttpError(409, 'This invite has already been used.');
      tx.update(hRef, { [`roles.${user.uid}`]: 'viewer' });
      tx.update(mRef, { uid: user.uid, consentStatus: 'granted' });
      tx.set(hRef.collection('consents').doc(), {
        memberId: invite.memberId,
        source: 'family_link',
        purpose: 'Let my family see my policies, deposits and papers (read-only)',
        scope: ['vault', 'items', 'reminders'],
        grantedBy: user.uid,
        grantedAt: FieldValue.serverTimestamp(),
        expiresAt: null,
        revokedAt: null,
      });
      tx.set(db.doc(`users/${user.uid}`), { phone: user.phone_number, activeHouseholdId: invite.householdId }, { merge: true });
      tx.delete(ref);
    });
    return { householdId: invite.householdId };
  },

  async '/invite/decline'(user, body) {
    const { ref, invite } = await openInvite(str(body, 'code', 20), user);
    await db.doc(`households/${invite.householdId}/members/${invite.memberId}`).update({ consentStatus: 'declined' });
    await ref.delete();
    return {};
  },

  /** A linked family member withdraws consent and leaves. Owners delete the family instead. */
  async '/leave'(user, body) {
    const householdId = str(body, 'householdId');
    const { role } = await roleIn(householdId, user.uid);
    if (role === 'owner') throw new HttpError(400, 'Owners can’t leave. Delete the family from Settings instead.');
    await leave(householdId, user.uid);
    return {};
  },

  /** Short-lived links to hand documents to a hospital desk or a sibling. */
  async '/share-links'(user, body) {
    const householdId = str(body, 'householdId');
    await roleIn(householdId, user.uid);
    const ids = Array.isArray(body.docIds) ? body.docIds.filter((x): x is string => typeof x === 'string').slice(0, 20) : [];
    if (ids.length === 0) throw new HttpError(400, 'Choose at least one document.');
    const bucket = getStorage().bucket();
    const expires = Date.now() + SHARE_HOURS * 3_600_000;
    const links = await Promise.all(
      ids.map(async (id) => {
        const doc = await db.doc(`households/${householdId}/documents/${id}`).get();
        if (!doc.exists) return null;
        const [url] = await bucket.file(doc.get('storagePath')).getSignedUrl({ action: 'read', expires });
        return { docId: id, title: doc.get('title') as string, url };
      }),
    );
    return { links: links.filter(Boolean), hours: SHARE_HOURS };
  },

  /** Deletes the caller's account. An owner's family, its files and every member card go with it. */
  async '/delete-account'(user) {
    const profile = await db.doc(`users/${user.uid}`).get();
    const householdId = profile.get('activeHouseholdId') as string | null;
    if (householdId) {
      const household = await db.doc(`households/${householdId}`).get();
      if (household.get('ownerUid') === user.uid) {
        await getStorage().bucket().deleteFiles({ prefix: `households/${householdId}/` });
        await db.recursiveDelete(household.ref);
        // Linked members lose their pointer to the deleted family.
        const linked = Object.keys(household.get('roles') ?? {}).filter((uid) => uid !== user.uid);
        await Promise.all(linked.map((uid) => db.doc(`users/${uid}`).set({ activeHouseholdId: null }, { merge: true })));
      } else if (household.exists) {
        await leave(householdId, user.uid);
      }
    }
    await db.doc(`users/${user.uid}`).delete();
    await getAuth().deleteUser(user.uid);
    return {};
  },

  /** "Ask Family CFO": answers from the family's own confirmed data, citing items and documents. */
  async '/ask'(user, body) {
    const householdId = str(body, 'householdId');
    const question = str(body, 'question', 500);
    await roleIn(householdId, user.uid);
    const base = db.doc(`households/${householdId}`);
    const [members, items, docs] = await Promise.all(['members', 'items', 'documents'].map((c) => base.collection(c).get()));
    const rows = <T>(s: FirebaseFirestore.QuerySnapshot) => s.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
    const m = rows<{ id: string; name: string; relation: string; birthYear: number | null }>(members);
    const it = rows<{ id: string; memberId: string; type: string }>(items);
    const dc = rows<{ id: string; memberId: string; docType: string; title: string }>(docs);

    const client = new Anthropic({ apiKey: anthropicKey.value() });
    const response = await client.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      system: ASK_SYSTEM,
      messages: [{ role: 'user', content: `Family data:\n${buildAskContext(m, it, dc, todayInIndia())}\n\nQuestion: ${question}` }],
      output_config: { effort: 'low', format: zodOutputFormat(z.object({ answer: z.string(), sources: z.array(z.string()) })) },
    });
    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      throw new HttpError(502, 'Couldn’t answer that one. Try asking another way.');
    }
    return { answer: response.parsed_output.answer, sources: validSources(response.parsed_output.sources, it, dc) };
  },
};

async function leave(householdId: string, uid: string) {
  const hRef = db.doc(`households/${householdId}`);
  const linked = await hRef.collection('members').where('uid', '==', uid).get();
  const open = await hRef.collection('consents').where('revokedAt', '==', null).get();
  const memberIds = new Set(linked.docs.map((d) => d.id));
  const batch = db.batch();
  batch.update(hRef, { [`roles.${uid}`]: FieldValue.delete() });
  for (const d of linked.docs) batch.update(d.ref, { uid: null, consentStatus: 'declined' });
  for (const c of open.docs) if (memberIds.has(c.get('memberId'))) batch.update(c.ref, { revokedAt: FieldValue.serverTimestamp() });
  batch.set(db.doc(`users/${uid}`), { activeHouseholdId: null }, { merge: true });
  await batch.commit();
}

/** One HTTPS endpoint for every action that needs the Admin SDK. Auth: Firebase ID token as a Bearer header. */
export const api = onRequest({ region: REGION, secrets: [anthropicKey], timeoutSeconds: 120 }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }
  const route = routes[req.path];
  if (!route) {
    res.status(404).json({ error: 'Unknown action.' });
    return;
  }
  try {
    const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    const user = await getAuth()
      .verifyIdToken(token)
      .catch(() => {
        throw new HttpError(401, 'Your session has expired. Sign in again.');
      });
    res.json(await route(user, (req.body ?? {}) as Body));
  } catch (e) {
    if (e instanceof HttpError) {
      res.status(e.status).json({ error: e.message });
    } else {
      logger.error('api failed', { path: req.path, error: (e as Error).message });
      res.status(500).json({ error: 'Something went wrong. Try again.' });
    }
  }
});
