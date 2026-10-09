/**
 * Pure context builder for "Ask Family CFO". Sends the model only what the app
 * already shows: first names, relations, confirmed items (last-4 numbers only)
 * and document titles. Never file contents.
 */

interface AskMember {
  id: string;
  name: string;
  relation: string;
  birthYear?: number | null;
}
interface AskItem {
  id: string;
  memberId: string;
  type: string;
  provider?: string | null;
  numberLast4?: string | null;
  amount?: number | null;
  premium?: number | null;
  dueDate?: string | null;
  maturityDate?: string | null;
  nominee?: string | null;
  sourceDocId?: string | null;
}
interface AskDoc {
  id: string;
  memberId: string;
  docType: string;
  title: string;
}

export function buildAskContext(members: AskMember[], items: AskItem[], docs: AskDoc[], today: string): string {
  const first = (id: string) => members.find((m) => m.id === id)?.name.split(' ')[0] ?? 'unknown';
  return JSON.stringify({
    today,
    people: members.map((m) => ({ id: m.id, name: m.name.split(' ')[0], relation: m.relation, birthYear: m.birthYear ?? null })),
    items: items.map((i) => ({
      id: `item:${i.id}`,
      person: first(i.memberId),
      type: i.type,
      provider: i.provider ?? null,
      last4: i.numberLast4 ?? null,
      amount: i.amount ?? null,
      premium: i.premium ?? null,
      dueDate: i.dueDate ?? null,
      maturityDate: i.maturityDate ?? null,
      nominee: i.nominee ?? null,
      document: i.sourceDocId ? `doc:${i.sourceDocId}` : null,
    })),
    documents: docs.map((d) => ({ id: `doc:${d.id}`, person: first(d.memberId), type: d.docType, title: d.title })),
  });
}

/** Keeps only source ids that exist in this household. */
export function validSources(sources: string[], items: { id: string }[], docs: { id: string }[]): { kind: 'item' | 'doc'; id: string }[] {
  const known = new Set([...items.map((i) => `item:${i.id}`), ...docs.map((d) => `doc:${d.id}`)]);
  return [...new Set(sources)].filter((s) => known.has(s)).map((s) => ({ kind: s.startsWith('item:') ? 'item' : 'doc', id: s.slice(s.indexOf(':') + 1) }));
}

export const ASK_SYSTEM = `You answer questions about one Indian family's finances, using only the JSON data provided.
Rules:
- Answer in 1 to 3 short sentences, in the language of the question (Hindi or English; Hinglish is fine).
- Use only facts in the data. If the data doesn't say, say so and suggest adding the document.
- Never recommend a specific product, insurer, fund or bank. General education is fine.
- Dates in DD/MM/YYYY. Amounts in rupees with Indian grouping (₹5,00,000) or lakh/crore.
- List in "sources" the ids (item:… or doc:…) your answer relies on.`;
