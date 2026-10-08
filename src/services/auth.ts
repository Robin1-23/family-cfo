import {
  signInWithPhoneNumber,
  signOut as fbSignOut,
  type ConfirmationResult,
} from '@react-native-firebase/auth';

import { auth } from './firebase';

export type Confirmation = ConfirmationResult;

/** Sends an OTP by SMS. On Android, Firebase may auto-verify without the user typing the code. */
export function sendOtp(e164Phone: string): Promise<Confirmation> {
  return signInWithPhoneNumber(auth, e164Phone);
}

export async function confirmOtp(confirmation: Confirmation, code: string): Promise<void> {
  await confirmation.confirm(code);
}

export function signOut(): Promise<void> {
  return fbSignOut(auth);
}

/** Maps Firebase auth error codes to plain, actionable messages. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'That number doesn’t look right. Enter a 10-digit Indian mobile number.';
    case 'auth/too-many-requests':
      return 'Too many attempts from this phone. Wait a few minutes and try again.';
    case 'auth/invalid-verification-code':
      return 'That code is incorrect. Check the SMS and try again.';
    case 'auth/code-expired':
    case 'auth/session-expired':
      return 'This code has expired. Request a new one.';
    case 'auth/network-request-failed':
      return 'No internet connection. Connect and try again.';
    case 'auth/quota-exceeded':
      return 'SMS limit reached for now. Try again later.';
    default:
      return 'Something went wrong while signing in. Try again.';
  }
}
