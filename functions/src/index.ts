import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { z } from 'zod';

import { ITEM_TYPES, normalizeExtraction } from './extraction';

initializeApp();
const db = getFirestore();
const anthropicKey = defineSecret('ANTHROPIC_API_KEY');

const REGION = 'asia-south1';
// Insurance doc types worth reading; ID copies, property papers etc. are stored only.
const EXTRACTABLE = new Set([
  'health_policy', 'term_policy', 'life_policy', 'vehicle_policy', 'fixed_deposit', 'loan', 'mutual_fund', 'other',
]);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const conf = z.number().describe('0 to 1: how sure you are this value is printed on the document');
const RawSchema = z.object({
  itemType: z.enum(ITEM_TYPES).nullable(),
  provider: z.string().nullable().describe('Insurer, bank or lender name'),
  policyOrAccountNumber: z.string().nullable(),
  amount: z.string().nullable().describe('Sum assured / cover amount, FD principal, or loan amount, as printed'),
  premium: z.string().nullable().describe('Premium or EMI per period, as printed'),
  dueDate: z.string().nullable().describe('Next premium due date or policy renewal/expiry date, as printed'),
  maturityDate: z.string().nullable(),
  nominee: z.string().nullable(),
  confidence: z.object({
    itemType: conf, provider: conf, policyOrAccountNumber: conf, amount: conf,
    premium: conf, dueDate: conf, maturityDate: conf, nominee: conf,
  }),
});

const PROMPT = `This is an Indian financial document (insurance policy, FD receipt, LIC bond or loan letter).
Extract only what is printed on it. Use null for anything not present or not legible; never guess.
Dates: copy them as printed (Indian documents are usually DD/MM/YYYY).
Amounts: copy them as printed, including "lakh" or "crore" if used.
"health_policy" includes mediclaim and super top-up; "critical_illness_policy" and "accident_policy" are standalone covers.`;

/** Reads a newly uploaded vault document and stores suggested fields for the user to confirm. */
export const extractDocument = onDocumentCreated(
  { document: 'households/{hid}/documents/{did}', region: REGION, secrets: [anthropicKey], timeoutSeconds: 300, memory: '1GiB' },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const d = snap.data();
    if (d.ocrStatus !== 'pending' || !EXTRACTABLE.has(d.docType)) return;

    const isPdf = d.contentType === 'application/pdf';
    if (!isPdf && !IMAGE_TYPES.has(d.contentType)) {
      await snap.ref.update({ ocrStatus: 'failed', ocrError: 'This photo format can’t be read automatically. Enter the details yourself.' });
      return;
    }

    await snap.ref.update({ ocrStatus: 'processing' });
    try {
      const [bytes] = await getStorage().bucket().file(d.storagePath).download();
      const data = bytes.toString('base64');
      const file: Anthropic.ContentBlockParam = isPdf
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
        : { type: 'image', source: { type: 'base64', media_type: d.contentType, data } };

      const client = new Anthropic({ apiKey: anthropicKey.value() });
      const response = await client.messages.parse({
        model: 'claude-opus-5-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: [file, { type: 'text', text: PROMPT }] }],
        output_config: { effort: 'low', format: zodOutputFormat(RawSchema) },
      });
      if (!response.parsed_output) throw new Error(`No structured output (stop_reason: ${response.stop_reason})`);

      await snap.ref.update({
        ocrStatus: 'extracted',
        extractedFields: normalizeExtraction(response.parsed_output),
      });
    } catch (e) {
      // Log the reason, never the document contents.
      logger.error('extractDocument failed', { path: snap.ref.path, error: (e as Error).message });
      await snap.ref.update({ ocrStatus: 'failed', ocrError: 'We couldn’t read this document. Enter the details yourself.' });
    }
  },
);

/** Confirming an item from a document marks that document's details as confirmed. */
export const onItemCreated = onDocumentCreated(
  { document: 'households/{hid}/items/{iid}', region: REGION },
  async (event) => {
    const item = event.data?.data();
    if (!item?.sourceDocId) return;
    const ref = db.doc(`households/${event.params.hid}/documents/${item.sourceDocId}`);
    const docSnap = await ref.get();
    if (!docSnap.exists || docSnap.get('memberId') !== item.memberId) return;
    await ref.update({ ocrStatus: 'confirmed', ocrError: FieldValue.delete() });
  },
);
