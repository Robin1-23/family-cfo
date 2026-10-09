import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';

// Imported first by every function module, so the Admin SDK is ready before use.
initializeApp();

export const db = getFirestore();
export const REGION = 'asia-south1';

export const anthropicKey = defineSecret('ANTHROPIC_API_KEY');
/** WhatsApp Business Platform (Cloud API) access token and sender phone-number id. */
export const whatsappToken = defineSecret('WHATSAPP_TOKEN');
export const whatsappPhoneId = defineSecret('WHATSAPP_PHONE_ID');

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
