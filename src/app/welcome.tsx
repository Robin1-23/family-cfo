import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { SafetyStrip } from '@/components/safety-strip';
import { Button, HeroCard, IconTile, Screen, Text } from '@/components/ui';
import { radius, space, usePalette } from '@/theme/tokens';

type Tint = 'amber' | 'lime' | 'dark';

const PROMISES: { icon: ComponentProps<typeof Feather>['name']; tint: Tint; title: string; body: string }[] = [
  { icon: 'eye', tint: 'lime', title: 'Read-only', body: 'Never moves money or asks for passwords.' },
  { icon: 'lock', tint: 'amber', title: 'Private, kept in India', body: 'Encrypted in Mumbai. Family-only.' },
  { icon: 'slash', tint: 'dark', title: 'Nothing to sell you', body: 'No policies, funds or commissions.' },
];

export default function WelcomeScreen() {
  const p = usePalette();
  const tile = (t: Tint) =>
    t === 'amber' ? { bg: p.amber, color: p.onTint } : t === 'lime' ? { bg: p.lime, color: p.onTint } : { bg: p.bar, color: p.amber };

  return (
    <Screen footer={<Button label="Start your family’s money map" onPress={() => router.push('/sign-in')} />}>
      <HeroCard
        tint="lime"
        icon="shield"
        eyebrow="Family CFO"
        title="Your family’s money, in one place"
        subtitle="Policies, deposits and papers for everyone you look after.">
        <View style={{ backgroundColor: p.surface, borderRadius: radius.md, padding: space.md, gap: space.sm, marginTop: space.md }}>
          <SafetyStrip present={['health_policy']} />
          <Text variant="caption" tone="soft">
            Mummy: health cover in, term and ID missing
          </Text>
        </View>
      </HeroCard>

      <View style={{ gap: space.sm }}>
        {PROMISES.map((x) => (
          <View
            key={x.title}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: p.surface, borderRadius: radius.lg, padding: space.md, boxShadow: p.shadow }}>
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
