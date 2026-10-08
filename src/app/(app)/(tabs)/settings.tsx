import { Alert, View } from 'react-native';

import { Button, Panel, Screen, Text } from '@/components/ui';
import { ROLE_HINTS, ROLE_LABELS } from '@/lib/catalog';
import { formatIndianMobile } from '@/lib/phone';
import { useAuth } from '@/providers/auth-provider';
import { useHousehold } from '@/providers/household-provider';
import { signOut } from '@/services/auth';
import { space } from '@/theme/tokens';

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

export default function SettingsScreen() {
  const { user } = useAuth();
  const { household, members, role } = useHousehold();

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Your family’s data stays safe. Sign in again with the same number to see it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <Screen edges={['top']}>
      <Text variant="title">Settings</Text>

      <Panel>
        <Text variant="heading">You</Text>
        <Row label="Mobile" value={user?.phoneNumber ? formatIndianMobile(user.phoneNumber) : '—'} />
        <Row label="Your role" value={role ? ROLE_LABELS[role] : '—'} />
        {role ? (
          <Text variant="caption" tone="faint">
            {ROLE_HINTS[role]}
          </Text>
        ) : null}
      </Panel>

      <Panel>
        <Text variant="heading">Family</Text>
        <Row label="Name" value={household?.name ?? '—'} />
        <Row label="People" value={String(members.length)} />
        <Row label="Plan" value={household?.plan === 'free' ? 'Free' : household?.plan === 'pro' ? 'Family Pro' : 'Family Pro+'} />
      </Panel>

      <Panel>
        <Text variant="heading">Data and consent</Text>
        <Text tone="soft">
          No banks, insurers or DigiLocker are connected yet. When you connect one, it will appear here with its
          expiry date and a button to switch it off.
        </Text>
      </Panel>

      <Button label="Sign out" kind="secondary" onPress={confirmSignOut} />
    </Screen>
  );
}
