import { Alert, View } from 'react-native';

import { Avatar, Button, HeroCard, IconTile, Panel, Screen, Text } from '@/components/ui';
import { ROLE_HINTS, ROLE_LABELS } from '@/lib/catalog';
import { formatIndianMobile } from '@/lib/phone';
import { useAuth } from '@/providers/auth-provider';
import { useHousehold } from '@/providers/household-provider';
import { signOut } from '@/services/auth';
import { space, usePalette } from '@/theme/tokens';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
      <Text tone="soft">{label}</Text>
      <Text variant="label" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

function SectionTitle({ icon, tint, label }: { icon: 'user' | 'users' | 'lock'; tint: 'lavender' | 'peach' | 'dark'; label: string }) {
  const p = usePalette();
  const bg = tint === 'lavender' ? p.lavender : tint === 'peach' ? p.peach : p.bar;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <IconTile name={icon} bg={bg} color={tint === 'dark' ? p.peach : p.onTint} />
      <Text variant="heading">{label}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { user } = useAuth();
  const { household, members, role } = useHousehold();
  const p = usePalette();
  const me = members.find((m) => m.relation === 'self');

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Your family’s data stays safe. Sign in again with the same number to see it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <Screen edges={['top']}>
      <HeroCard tint="dark" icon="settings" title="Settings">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Avatar name={me?.name ?? 'You'} size={48} />
          <View style={{ flex: 1 }}>
            <Text variant="heading" style={{ color: p.onBar }}>
              {me?.name ?? 'You'}
            </Text>
            <Text variant="caption" style={{ color: p.onBar }}>
              {household?.name}
            </Text>
          </View>
        </View>
      </HeroCard>

      <Panel>
        <SectionTitle icon="user" tint="lavender" label="You" />
        <Row label="Mobile" value={user?.phoneNumber ? formatIndianMobile(user.phoneNumber) : '—'} />
        <Row label="Your role" value={role ? ROLE_LABELS[role] : '—'} />
        {role ? (
          <Text variant="caption" tone="faint">
            {ROLE_HINTS[role]}
          </Text>
        ) : null}
      </Panel>

      <Panel>
        <SectionTitle icon="users" tint="peach" label="Family" />
        <Row label="Name" value={household?.name ?? '—'} />
        <Row label="People" value={String(members.length)} />
        <Row label="Plan" value={household?.plan === 'free' ? 'Free' : household?.plan === 'pro' ? 'Family Pro' : 'Family Pro+'} />
      </Panel>

      <Panel>
        <SectionTitle icon="lock" tint="dark" label="Data and consent" />
        <Text tone="soft">
          No banks, insurers or DigiLocker are connected yet. When you connect one, it will appear here with its
          expiry date and a button to switch it off.
        </Text>
      </Panel>

      <Button label="Sign out" kind="secondary" onPress={confirmSignOut} />
    </Screen>
  );
}
