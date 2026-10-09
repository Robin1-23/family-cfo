import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { success } from '@/components/haptics';
import { useToast } from '@/components/toast';
import { Button, ChipGroup, Field, HeroCard, Notice, Screen, Text } from '@/components/ui';
import {
  AMOUNT_LABEL,
  GROUP_LABELS,
  ITEM_GROUP,
  ITEM_TYPES,
  ITEM_TYPE_LABELS,
  buildItem,
  draftFromDocument,
  draftFromItem,
  lowConfidenceFields,
  type ItemDraft,
  type ItemGroup,
} from '@/lib/items';
import { canEdit } from '@/lib/permissions';
import type { FieldKey, ItemType } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { useHousehold } from '@/providers/household-provider';
import { addItem, deleteItem, saveItem } from '@/services/items';
import { space } from '@/theme/tokens';

const CHECK = 'Not sure about this one. Please check.';
const GROUPS: ItemGroup[] = ['insurance', 'asset', 'loan', 'other'];
const WITH_MATURITY = new Set<ItemType>(['life_policy', 'term_policy', 'fixed_deposit', 'ppf', 'other']);

/**
 * Confirm details read from a vault document (?docId=…), add one by hand
 * (?memberId=…), or edit a saved one (?itemId=…).
 */
export default function ItemScreen() {
  const params = useLocalSearchParams<{ docId?: string; memberId?: string; itemId?: string }>();
  const { user } = useAuth();
  const { household, members, documents, items, role } = useHousehold();
  const existing = items.find((i) => i.id === params.itemId) ?? null;
  const source = documents.find((d) => d.id === (existing?.sourceDocId ?? params.docId)) ?? null;
  const memberId = existing?.memberId ?? source?.memberId ?? params.memberId ?? null;
  const member = members.find((m) => m.id === memberId);

  const [draft, setDraft] = useState<ItemDraft>(() => (existing ? draftFromItem(existing) : draftFromDocument(source)));
  const [group, setGroup] = useState<ItemGroup>(draft.type ? ITEM_GROUP[draft.type] : 'insurance');
  const [errors, setErrors] = useState<Partial<Record<keyof ItemDraft, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const toast = useToast();
  const unsure = existing ? new Set<FieldKey>() : lowConfidenceFields(source);

  if (!member || !household || !user || !canEdit(role)) {
    return (
      <Screen>
        <Text variant="heading">This can’t be changed right now</Text>
        <Text variant="caption" tone="soft">
          It may have been removed, or you may only have view access.
        </Text>
        <Button label="Go back" kind="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const set = (key: keyof ItemDraft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const hint = (key: FieldKey) => (unsure.has(key) ? CHECK : undefined);
  const g = draft.type ? ITEM_GROUP[draft.type] : group;
  const showPremium = g === 'insurance' || g === 'loan';
  const showMaturity = !!draft.type && (g === 'asset' ? draft.type === 'fixed_deposit' || draft.type === 'ppf' : WITH_MATURITY.has(draft.type));

  async function save() {
    // Fields hidden for this kind are cleared, so nothing stale is saved.
    const visible: ItemDraft = {
      ...draft,
      premium: showPremium ? draft.premium : '',
      dueDate: showPremium ? draft.dueDate : '',
      maturityDate: showMaturity ? draft.maturityDate : '',
      helpline: g === 'insurance' ? draft.helpline : '',
      payerMemberId: showPremium ? draft.payerMemberId : null,
    };
    const result = buildItem(visible, {
      memberId: member!.id,
      uid: user!.uid,
      sourceDocId: existing ? existing.sourceDocId : (source?.id ?? null),
      lastPaidOn: existing?.lastPaidOn,
      snoozedUntil: existing?.snoozedUntil,
    });
    setErrors(result.errors ?? {});
    if (!result.item) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (existing) await saveItem(household!.id, existing.id, result.item);
      else await addItem(household!.id, result.item);
      success();
      toast({ message: existing ? 'Changes saved' : `${ITEM_TYPE_LABELS[result.item.type]} saved` });
      router.back();
    } catch {
      setSaving(false);
      setSaveError('Couldn’t save. Check your connection and try again.');
    }
  }

  function remove() {
    if (!existing) return;
    Alert.alert('Delete this?', 'It will disappear from the radar, timeline and reminders. The document stays in the vault.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteItem(household!.id, existing.id).then(
            () => router.back(),
            () => Alert.alert('Couldn’t delete', 'Check your connection and try again.'),
          ),
      },
    ]);
  }

  const firstName = member.relation === 'self' ? 'you' : member.name.split(' ')[0];

  return (
    <Screen footer={<Button label={existing ? 'Save changes' : 'Save'} icon="check" onPress={save} loading={saving} />}>
      <HeroCard
        tint={source && !existing ? 'lime' : 'forest'}
        icon={source && !existing ? 'check-circle' : 'edit-3'}
        back
        eyebrow={source ? source.title : `For ${firstName}`}
        title={existing ? 'Edit details' : source ? 'Confirm details' : 'Add details'}
        subtitle={
          existing
            ? 'Changes update reminders and the radar.'
            : source?.ocrStatus === 'extracted'
              ? 'Read from your document. Check before saving.'
              : source?.ocrStatus === 'failed'
                ? (source.ocrError ?? 'We couldn’t read it.') + ' Fill in what you can.'
                : source
                  ? 'Still reading. Or fill it in yourself.'
                  : 'Add what you know. The document can come later.'
        }
      />

      <ChipGroup<ItemGroup>
        label="What kind?"
        value={g}
        onChange={(next) => {
          setGroup(next);
          setDraft((d) => ({ ...d, type: d.type && ITEM_GROUP[d.type] === next ? d.type : null }));
        }}
        options={GROUPS.map((x) => ({ value: x, label: GROUP_LABELS[x] }))}
      />
      <ChipGroup<ItemType>
        value={draft.type}
        onChange={(t) => setDraft((d) => ({ ...d, type: t }))}
        options={ITEM_TYPES.filter((t) => ITEM_GROUP[t] === g).map((t) => ({ value: t, label: ITEM_TYPE_LABELS[t] }))}
      />
      {errors.type ? <Notice tone="danger">{errors.type}</Notice> : unsure.has('itemType') ? <Notice>{CHECK}</Notice> : null}

      <Field
        label={g === 'asset' ? 'Bank, fund or platform' : g === 'loan' ? 'Lender' : 'Insurer'}
        value={draft.provider}
        onChangeText={set('provider')}
        hint={hint('provider')}
      />
      <Field
        label="Number — last 4 only"
        value={draft.numberLast4}
        onChangeText={set('numberLast4')}
        maxLength={4}
        autoCapitalize="characters"
        hint={hint('numberLast4') ?? 'We never store the full number.'}
      />
      <Field label={AMOUNT_LABEL[g]} value={draft.amount} onChangeText={set('amount')} keyboardType="numeric" error={errors.amount} hint={hint('amount')} />

      {showPremium ? (
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Field
              label={g === 'loan' ? 'EMI (₹)' : 'Premium (₹)'}
              value={draft.premium}
              onChangeText={set('premium')}
              keyboardType="numeric"
              error={errors.premium}
              hint={hint('premium')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label={g === 'loan' ? 'Next EMI' : 'Next due'}
              placeholder="DD/MM/YYYY"
              value={draft.dueDate}
              onChangeText={set('dueDate')}
              keyboardType="numbers-and-punctuation"
              error={errors.dueDate}
              hint={hint('dueDate')}
            />
          </View>
        </View>
      ) : null}

      {showMaturity ? (
        <Field
          label="Maturity date"
          placeholder="DD/MM/YYYY"
          value={draft.maturityDate}
          onChangeText={set('maturityDate')}
          keyboardType="numbers-and-punctuation"
          error={errors.maturityDate}
          hint={hint('maturityDate')}
        />
      ) : null}

      {g !== 'loan' ? <Field label="Nominee" value={draft.nominee} onChangeText={set('nominee')} hint={hint('nominee') ?? (draft.nominee ? undefined : 'Missing nominees slow down claims.')} /> : null}

      {g === 'insurance' ? (
        <Field
          label="Helpline (from the policy card)"
          placeholder="1800 425 2255"
          value={draft.helpline}
          onChangeText={set('helpline')}
          keyboardType="phone-pad"
          error={errors.helpline}
          hint={hint('helpline') ?? 'Shown as a call button in Emergency Mode.'}
        />
      ) : null}

      {showPremium && members.length > 1 ? (
        <ChipGroup<string>
          label="Who pays? Reminders go to them"
          value={draft.payerMemberId ?? members.find((m) => m.relation === 'self')?.id ?? null}
          onChange={(id) => setDraft((d) => ({ ...d, payerMemberId: id }))}
          options={members.map((m) => ({ value: m.id, label: m.relation === 'self' ? 'You' : m.name.split(' ')[0] }))}
        />
      ) : null}

      {saveError ? <Notice tone="danger">{saveError}</Notice> : null}
      {existing ? <Button label="Delete" kind="quiet" icon="trash-2" onPress={remove} /> : null}
    </Screen>
  );
}
