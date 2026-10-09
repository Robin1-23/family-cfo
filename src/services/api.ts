import { getApp } from '@react-native-firebase/app';

import { auth } from './firebase';

/**
 * Calls the `api` Cloud Function (asia-south1) with the user's ID token.
 * Everything that needs the Admin SDK goes through here: invites, consent,
 * share links, account deletion, Ask Family CFO.
 */
export async function callApi<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in again to continue.');
  const token = await user.getIdToken();
  const url = `https://asia-south1-${getApp().options.projectId}.cloudfunctions.net/api${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('No internet connection. Connect and try again.');
  }
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? 'Something went wrong. Try again.');
  return json;
}

export interface InvitePreview {
  householdName: string;
  memberName: string;
  inviterName: string;
  language: 'en' | 'hi';
}

export interface ShareLink {
  docId: string;
  title: string;
  url: string;
}

export interface AskAnswer {
  answer: string;
  sources: { kind: 'item' | 'doc'; id: string }[];
}
