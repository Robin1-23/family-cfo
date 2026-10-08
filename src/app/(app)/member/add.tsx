import { router } from 'expo-router';
import { useState } from 'react';

import { Button, ChipGroup, Field, Screen, Text } from '@/components/ui';
import { RELATION_LABELS, RELATION_ORDER } from '@/lib/catalog';
import type { Language, Relation } from '@/lib/types';
import { useHousehold } from '@/providers/household-provider';
import { addMember } from '@/services/households';

const currentYear = new Date().getFullYear();

export default function AddMemberScreen() {
  const { household } = useHousehold();
  const [name, setName] = useState('');
  const [relation, setRelation] = useState<Relation | null>(null);
  const [language, setLanguage] = useState<Language>('hi');
  const [birthYear, setBirthYear] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!household) return;
    if (!name.trim()) return setError('Add their name.');
    if (!relation) return setError('Choose how they’re related to you.');
    let year: number | null = null;
    if (birthYear.trim()) {
      year = Number(birthYear);
      if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
        return setError(`Birth year should be between 1900 and ${currentYear}.`);
      }
    }
    setBusy(true);
    setError(null);
    try {
      await addMember(household.id, { name, relation, language, birthYear: year, city });
      router.back();
    } catch (e) {
      setError((e as Error).message || 'Couldn’t add this person. Try again.');
      setBusy(false);
    }
  }

  return (
    <Screen edges={['bottom']} footer={<Button label="Add to family" onPress={save} loading={busy} />}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Sunita Sharma" autoFocus />
      <ChipGroup<Relation>
        label="Relation to you"
        value={relation}
        onChange={setRelation}
        options={RELATION_ORDER.filter((r) => r !== 'self').map((r) => ({ value: r, label: RELATION_LABELS[r] }))}
      />
      <ChipGroup<Language>
        label="Their language for reminders"
        value={language}
        onChange={setLanguage}
        options={[
          { value: 'hi', label: 'हिन्दी' },
          { value: 'en', label: 'English' },
        ]}
      />
      <Field
        label="Birth year (optional)"
        value={birthYear}
        onChangeText={(t) => setBirthYear(t.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        placeholder="1966"
        hint="Used later to check if their health cover fits their age."
      />
      <Field label="City (optional)" value={city} onChangeText={setCity} placeholder="Lucknow" />
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
    </Screen>
  );
}
