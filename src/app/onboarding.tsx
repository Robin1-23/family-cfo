import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, ChipGroup, Field, HeroCard, Panel, Screen, Text } from '@/components/ui';
import { RELATION_LABELS } from '@/lib/catalog';
import type { Language, Relation } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { signOut } from '@/services/auth';
import { createHousehold } from '@/services/households';
import { space, usePalette } from '@/theme/tokens';

type Row = { key: number; relation: Relation; name: string };

const QUICK_ADD: Relation[] = ['mother', 'father', 'spouse', 'sibling', 'child', 'grandparent'];

export default function OnboardingScreen() {
  const { user } = useAuth();
  const p = usePalette();
  const [ownerName, setOwnerName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const [rows, setRows] = useState<Row[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');

  const suggestedHouseholdName = ownerName.trim() ? `${ownerName.trim().split(' ')[0]}'s family` : 'My family';

  function addRow(relation: Relation) {
    setRows((r) => [...r, { key: nextKey, relation, name: '' }]);
    setNextKey((k) => k + 1);
  }

  async function submit() {
    if (!user?.phoneNumber) return;
    if (!ownerName.trim()) {
      setError('Add your name so your family knows who set this up.');
      return;
    }
    const unnamed = rows.find((r) => !r.name.trim());
    if (unnamed) {
      setError(`Add a name for ${RELATION_LABELS[unnamed.relation].toLowerCase()}, or remove that row.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createHousehold({
        uid: user.uid,
        phone: user.phoneNumber,
        ownerName,
        ownerLanguage: language,
        householdName: householdName.trim() || suggestedHouseholdName,
        family: rows.map((r) => ({ name: r.name, relation: r.relation })),
      });
      // The profile listener switches the app to the dashboard.
    } catch (e) {
      setError((e as Error).message || 'Couldn’t create your family. Try again.');
      setBusy(false);
    }
  }

  return (
    <Screen footer={<Button label="Create my family" onPress={submit} loading={busy} />}>
      <HeroCard
        tint="lime"
        icon="users"
        title="Set up your family"
        subtitle="You can add more people later."
      />

      <Panel style={{ gap: space.sm }}>
        <Text variant="label">Joining your family instead?</Text>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Invite code"
              value={inviteCode}
              onChangeText={(t) => setInviteCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
              placeholder="ABCD2345"
              autoCapitalize="characters"
            />
          </View>
          <Button
            label="Join"
            kind="secondary"
            disabled={inviteCode.length !== 8}
            onPress={() => router.push({ pathname: '/join/[code]', params: { code: inviteCode } })}
          />
        </View>
      </Panel>

      <Field label="Your name" value={ownerName} onChangeText={setOwnerName} placeholder="Priya Sharma" autoComplete="name" />
      <Field
        label="Family name"
        value={householdName}
        onChangeText={setHouseholdName}
        placeholder={suggestedHouseholdName}
        hint="Only your family sees this."
      />
      <ChipGroup<Language>
        label="App language for you"
        value={language}
        onChange={setLanguage}
        options={[
          { value: 'en', label: 'English' },
          { value: 'hi', label: 'हिन्दी' },
        ]}
      />

      <View style={{ gap: space.md }}>
        <Text variant="heading">Who do you look after?</Text>
        {rows.map((row) => (
          <Panel key={row.key} style={{ padding: space.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="label">{RELATION_LABELS[row.relation]}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${RELATION_LABELS[row.relation]}`}
                hitSlop={12}
                onPress={() => setRows((r) => r.filter((x) => x.key !== row.key))}>
                <Text variant="label" tone="faint">
                  Remove
                </Text>
              </Pressable>
            </View>
            <Field
              label="Name"
              value={row.name}
              onChangeText={(t) => setRows((r) => r.map((x) => (x.key === row.key ? { ...x, name: t } : x)))}
              placeholder={row.relation === 'mother' ? 'Sunita Sharma' : row.relation === 'father' ? 'Ramesh Sharma' : 'Name'}
            />
          </Panel>
        ))}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {QUICK_ADD.map((rel) => (
            <Pressable
              key={rel}
              accessibilityRole="button"
              onPress={() => addRow(rel)}
              style={{
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                borderRadius: 999,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: p.amber,
                backgroundColor: p.amberWash,
              }}>
              <Text variant="label">
                + {RELATION_LABELS[rel]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}

      <Button label="Sign out" kind="quiet" onPress={signOut} />
    </Screen>
  );
}
