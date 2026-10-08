import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, ChipGroup, Field, HeroCard, Notice, Screen, Text } from '@/components/ui';
import { ITEM_TYPES, ITEM_TYPE_LABELS, buildItem, draftFromDocument, lowConfidenceFields, type ItemDraft } from '@/lib/items';
import { canEdit } from '@/lib/permissions';
import type { FieldKey, ItemType } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { useHousehold } from '@/providers/household-provider';
import { addItem } from '@/services/items';

const CHECK = 'We weren’t sure about this one. Check it against the document.';

/** Confirm details read from a vault document (?docId=…), or add an item by hand (?memberId=…). */
export default function NewItemScreen() {
  const params = useLocalSearchParams<{ docId?: string; memberId?: string }>();
  const { user } = useAuth();
  const { household, members, documents, role } = useHousehold();
  const source = documents.find((d) => d.id === params.docId) ?? null;
  const memberId = source?.memberId ?? params.memberId ?? null;
  const member = members.find((m) => m.id === memberId);

  const [draft, setDraft] = useState<ItemDraft>(() => draftFromDocument(source));
  const [errors, setErrors] = useState<Partial<Record<keyof ItemDraft, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const unsure = lowConfidenceFields(source);

  if (!member || !household || !user || !canEdit(role)) {
    return (
      <Screen>
        <Text variant="heading">This can’t be added right now</Text>
        <Text tone="soft">The person or document may have been removed, or you may only have view access.</Text>
        <Button label="Go back" kind="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const set = (key: keyof ItemDraft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const hint = (key: FieldKey) => (unsure.has(key) ? CHECK : undefined);

  async function save() {
    const result = buildItem(draft, { memberId: member!.id, uid: user!.uid, sourceDocId: source?.id ?? null });
    setErrors(result.errors ?? {});
    if (!result.item) return;
    setSaving(true);
    setSaveError(null);
    try {
      await addItem(household!.id, result.item);
      router.back();
    } catch {
      setSaving(false);
      setSaveError('Couldn’t save. Check your connection and try again.');
    }
  }

  const firstName = member.relation === 'self' ? 'you' : member.name.split(' ')[0];

  return (
    <>
      <Screen footer={<Button label="Save" onPress={save} loading={saving} />}>
        <HeroCard
          tint={source ? 'lavender' : 'peach'}
          icon={source ? 'check-circle' : 'edit-3'}
          back
          eyebrow={source ? source.title : `For ${firstName}`}
          title={source ? 'Confirm details' : 'Add a policy or deposit'}
          subtitle={
            source?.ocrStatus === 'extracted'
              ? 'We read these details from the document. Check each one — alerts and the Coverage Score use what you save here.'
              : source?.ocrStatus === 'failed'
                ? (source.ocrError ?? 'We couldn’t read this document.') + ' Fill in what you can see.'
                : source
                  ? 'Still reading this document. You can wait, or fill in the details yourself.'
                  : 'Fill in what you know. You can add the document later.'
          }
        />

        <ChipGroup<ItemType>
          label="What is it?"
          value={draft.type}
          onChange={(t) => setDraft((d) => ({ ...d, type: t }))}
          options={ITEM_TYPES.map((t) => ({ value: t, label: ITEM_TYPE_LABELS[t] }))}
        />
        {errors.type ? <Notice tone="danger">{errors.type}</Notice> : unsure.has('itemType') ? <Notice>{CHECK}</Notice> : null}

        <Field label="Insurer, bank or lender" value={draft.provider} onChangeText={set('provider')} hint={hint('provider')} />
        <Field
          label="Policy or account number — last 4 only"
          value={draft.numberLast4}
          onChangeText={set('numberLast4')}
          maxLength={4}
          autoCapitalize="characters"
          hint={hint('numberLast4') ?? 'We never store the full number.'}
        />
        <Field
          label="Cover, deposit or loan amount (₹)"
          value={draft.amount}
          onChangeText={set('amount')}
          keyboardType="numeric"
          error={errors.amount}
          hint={hint('amount')}
        />
        <Field
          label="Premium or EMI (₹)"
          value={draft.premium}
          onChangeText={set('premium')}
          keyboardType="numeric"
          error={errors.premium}
          hint={hint('premium')}
        />
        <Field
          label="Next due or renewal date"
          placeholder="DD/MM/YYYY"
          value={draft.dueDate}
          onChangeText={set('dueDate')}
          keyboardType="numbers-and-punctuation"
          error={errors.dueDate}
          hint={hint('dueDate')}
        />
        <Field
          label="Maturity date"
          placeholder="DD/MM/YYYY"
          value={draft.maturityDate}
          onChangeText={set('maturityDate')}
          keyboardType="numbers-and-punctuation"
          error={errors.maturityDate}
          hint={hint('maturityDate')}
        />
        <Field label="Nominee" value={draft.nominee} onChangeText={set('nominee')} hint={hint('nominee')} />

        {saveError ? <Notice tone="danger">{saveError}</Notice> : null}
      </Screen>
    </>
  );
}
