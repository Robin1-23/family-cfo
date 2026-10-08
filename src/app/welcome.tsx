import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { SafetyStrip } from '@/components/safety-strip';
import { Button, HeroCard, IconTile, Screen, Text } from '@/components/ui';
import { radius, space, usePalette } from '@/theme/tokens';

type Tint = 'peach' | 'lavender' | 'dark';

const PROMISES: { icon: ComponentProps<typeof Feather>['name']; tint: Tint; title: string; body: string }[] = [
  { icon: 'eye', tint: 'lavender', title: 'Read-only', body: 'We never move money, pay bills or ask for bank passwords.' },
  { icon: 'lock', tint: 'peach', title: 'Encrypted, kept in India', body: 'Stored in Mumbai. Only your family can see it.' },
  { icon: 'slash', tint: 'dark', title: 'Nothing to sell you', body: 'No policies, no funds, no commissions.' },
];

export default function WelcomeScreen() {
  const p = usePalette();
  const tile = (t: Tint) =>
    t === 'peach' ? { bg: p.peach, color: p.onTint } : t === 'lavender' ? { bg: p.lavender, color: p.onTint } : { bg: p.bar, color: p.peach };

  return (
    <Screen footer={<Button label="Start your family’s money map" onPress={() => router.push('/sign-in')} />}>
      <HeroCard
        tint="lavender"
        icon="shield"
        eyebrow="Family CFO"
        title="Your family’s money, in one screen"
        subtitle="Know everything your family owns, owes and is covered for, before something goes wrong.">
        <View style={{ backgroundColor: p.surface, borderRadius: radius.md, padding: space.md, gap: space.sm, marginTop: space.sm }}>
          <SafetyStrip present={['health_policy']} />
          <Text variant="caption" tone="soft">
            Mummy’s health cover is in. Term cover and ID are still missing.
          </Text>
        </View>
      </HeroCard>

      <View style={{ gap: space.sm }}>
        {PROMISES.map((x) => (
          <View
            key={x.title}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: p.surface, borderRadius: radius.lg, padding: space.md }}>
            <IconTile name={x.icon} {...tile(x.tint)} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label">{x.title}</Text>
              <Text variant="caption" tone="soft">
                {x.body}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}
