import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Share, View } from 'react-native';

import { Avatar, Button, HeroCard, IconTile, Panel, Screen, Text, pressFeedback } from '@/components/ui';
import { ROLE_HINTS, ROLE_LABELS } from '@/lib/catalog';
import { formatIndianMobile, maskPhone } from '@/lib/phone';
import type { ConsentRecord } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { useHousehold } from '@/providers/household-provider';
import { callApi } from '@/services/api';
import { signOut } from '@/services/auth';
import { subscribeConsents } from '@/services/households';
import { radius, space, usePalette } from '@/theme/tokens';

type Tint = 'lime' | 'amber' | 'dark';

const SOURCE_LABELS: Record<ConsentRecord['source'], string> = {
  family_link: 'Shared with family',
  vault_upload: 'Vault',
  digilocker: 'DigiLocker',
  account_aggregator: 'Bank sync (Account Aggregator)',
  gmail: 'Gmail',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
      <Text variant="caption" tone="soft">
        {label}
      </Text>
      <Text variant="label" style={{ flexShrink: 1, textAlign: 'right', fontWeight: '500' }}>
        {value}
      </Text>
    </View>
  );
}

function SectionTitle({ icon, tint, label }: { icon: 'user' | 'users' | 'lock' | 'shield'; tint: Tint; label: string }) {
  const p = usePalette();
  const bg = tint === 'lime' ? p.lime : tint === 'amber' ? p.amber : p.bar;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <IconTile name={icon} bg={bg} color={tint === 'dark' ? p.amber : p.onTint} size={30} />
      <Text variant="label" style={{ fontSize: 14 }}>
        {label}
      </Text>
    </View>
  );
}

function ActionRow({ icon, label, hint, onPress, danger = false }: { icon: 'download' | 'trash-2' | 'log-out' | 'user-x' | 'edit-2'; label: string; hint?: string; onPress: () => void; danger?: boolean }) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, ...pressFeedback(pressed) })}>
      <Feather name={icon} size={16} color={danger ? p.danger : p.ink} />
      <View style={{ flex: 1 }}>
        <Text variant="label" style={{ fontSize: 14, color: danger ? p.danger : p.ink }}>
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" tone="faint">
            {hint}
          </Text>
        ) : null}
      </View>
      <Feather name="chevron-right" size={16} color={p.inkFaint} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { user } = useAuth();
  const { household, members, items, documents, role } = useHousehold();
  const p = usePalette();
  const me = members.find((m) => m.uid === user?.uid) ?? members.find((m) => m.relation === 'self');
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const isOwner = role === 'owner';

  const householdId = household?.id;
  useEffect(() => {
    if (!householdId) return;
    return subscribeConsents(householdId, setConsents, () => setConsents([]));
  }, [householdId]);

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Your family’s data stays safe. Sign in again with the same number to see it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  /** Everything the family has entered, as JSON, through the share sheet. Files stay in the vault. */
  async function exportData() {
    const data = {
      exportedAt: new Date().toISOString(),
      household: household && { name: household.name, plan: household.plan },
      members: members.map(({ id, name, relation, language, birthYear, city, consentStatus }) => ({ id, name, relation, language, birthYear, city, consentStatus })),
      items: items.map(({ createdAt, ...rest }) => rest),
      documents: documents.map(({ id, memberId, docType, title, fileName, contentType, sizeBytes, ocrStatus, extractedFields }) => ({ id, memberId, docType, title, fileName, contentType, sizeBytes, ocrStatus, extractedFields })),
      consents: consents.map((c) => ({ memberId: c.memberId, source: c.source, purpose: c.purpose, scope: c.scope, grantedAt: c.grantedAt?.toMillis() ?? null, revokedAt: c.revokedAt?.toMillis() ?? null })),
    };
    await Share.share({ title: 'Family CFO export', message: JSON.stringify(data, null, 2) });
  }

  function leaveOrDelete() {
    if (!household) return;
    const title = isOwner ? 'Delete your family and account?' : 'Leave this family?';
    const body = isOwner
      ? 'This permanently deletes every person, policy, reminder and file in the vault. It can’t be undone. Export first if you want a copy.'
      : 'You’ll stop seeing this family, and they’ll stop seeing anything you shared.';
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isOwner ? 'Delete everything' : 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            if (isOwner) {
              await callApi('/delete-account');
              await signOut();
            } else {
              await callApi('/leave', { householdId: household.id });
            }
          } catch (e) {
            Alert.alert('Couldn’t finish', (e as Error).message);
          }
        },
      },
    ]);
  }

  const fmt = (ms?: number) => (ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

  return (
    <Screen edges={['top']}>
      <HeroCard tint="dark" icon="settings" title="Settings">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Avatar name={me?.name ?? 'You'} size={40} />
          <View style={{ flex: 1 }}>
            <Text variant="label" style={{ color: p.onBar, fontSize: 14 }} numberOfLines={1}>
              {me?.name ?? 'You'}
            </Text>
            <Text variant="caption" style={{ color: p.onBar, opacity: 0.7 }} numberOfLines={1}>
              {household?.name}
            </Text>
          </View>
        </View>
      </HeroCard>

      <Panel>
        <SectionTitle icon="user" tint="lime" label="You" />
        <Row label="Mobile" value={user?.phoneNumber ? formatIndianMobile(user.phoneNumber) : '—'} />
        <Row label="Your role" value={role ? ROLE_LABELS[role] : '—'} />
        {role ? (
          <Text variant="caption" tone="faint">
            {ROLE_HINTS[role]}
          </Text>
        ) : null}
        {me ? <ActionRow icon="edit-2" label="Edit your details" hint="Name, language, WhatsApp number" onPress={() => router.push({ pathname: '/member/add', params: { id: me.id } })} /> : null}
      </Panel>

      <Panel>
        <SectionTitle icon="users" tint="amber" label="Family" />
        <Row label="Name" value={household?.name ?? '—'} />
        <Row label="People" value={String(members.length)} />
        <Row label="Plan" value={household?.plan === 'free' ? 'Free' : household?.plan === 'pro' ? 'Family Pro' : 'Family Pro+'} />
      </Panel>

      <Panel>
        <SectionTitle icon="shield" tint="dark" label="Consent centre" />
        <Text variant="caption" tone="soft">
          Every connection to someone’s data, and who approved it. Each adult approves for themselves.
        </Text>
        {members
          .filter((m) => m.relation !== 'self')
          .map((m) => {
            const record = consents.find((c) => c.memberId === m.id && c.source === 'family_link' && !c.revokedAt);
            const status =
              m.consentStatus === 'granted' ? `Approved ${fmt(record?.grantedAt?.toMillis())}` : m.consentStatus === 'declined' ? 'Declined or stopped' : 'Not asked yet';
            return (
              <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 4 }}>
                <Avatar name={m.name} size={32} />
                <View style={{ flex: 1 }}>
                  <Text variant="label" numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Text variant="caption" tone="faint" numberOfLines={1}>
                    {status}
                    {m.phone ? ` · ${maskPhone(m.phone)}` : ''}
                  </Text>
                </View>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: m.consentStatus === 'granted' ? p.lime : m.consentStatus === 'declined' ? p.danger : p.amber,
                  }}
                />
              </View>
            );
          })}
        <View style={{ height: 1, backgroundColor: p.line }} />
        {(['digilocker', 'account_aggregator'] as const).map((src) => {
          const active = consents.find((c) => c.source === src && !c.revokedAt);
          return (
            <View key={src} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="label" style={{ fontWeight: '500' }}>
                {SOURCE_LABELS[src]}
              </Text>
              <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: active ? p.limeWash : p.surfaceSunk }}>
                <Text variant="caption" style={{ fontSize: 11, fontWeight: '600' }} tone={active ? 'ink' : 'faint'}>
                  {active ? `Until ${fmt(active.expiresAt?.toMillis()) || 'revoked'}` : 'Coming soon'}
                </Text>
              </View>
            </View>
          );
        })}
      </Panel>

      <Panel>
        <SectionTitle icon="lock" tint="amber" label="Your data" />
        <ActionRow icon="download" label="Export all data" hint="Everything you’ve entered, as a file to save" onPress={exportData} />
        <ActionRow
          icon={isOwner ? 'trash-2' : 'user-x'}
          label={isOwner ? 'Delete family and account' : 'Leave this family'}
          hint={isOwner ? 'Removes everything, permanently' : 'Stops sharing both ways'}
          onPress={leaveOrDelete}
          danger
        />
      </Panel>

      <Button label="Sign out" kind="secondary" icon="log-out" onPress={confirmSignOut} />
      <Text variant="caption" tone="faint" style={{ textAlign: 'center' }}>
        Read-only, always. Data stored in India (Mumbai).
      </Text>
    </Screen>
  );
}
