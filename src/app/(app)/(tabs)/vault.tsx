import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';

import { DocumentRow } from '@/components/document-row';
import { Avatar, Button, HeroCard, Screen, Text } from '@/components/ui';
import { canEdit } from '@/lib/permissions';
import { useHousehold } from '@/providers/household-provider';
import { radius, space, type, usePalette } from '@/theme/tokens';

const ALL = '__all__';

export default function VaultScreen() {
  const { members, documents, role } = useHousehold();
  const p = usePalette();
  const [filter, setFilter] = useState<string>(ALL);
  const names = new Map(members.map((m) => [m.id, m.relation === 'self' ? 'You' : m.name.split(' ')[0]]));
  const shown = filter === ALL ? documents : documents.filter((d) => d.memberId === filter);

  return (
    <Screen
      edges={['top']}
      footer={canEdit(role) ? <Button label="Add a document" onPress={() => router.push('/upload')} /> : undefined}>
      <HeroCard tint="peach" icon="archive" title="Family vault">
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Pill icon="file-text" label={`${documents.length} ${documents.length === 1 ? 'document' : 'documents'}`} dark />
          <Pill icon="users" label={`${members.length} ${members.length === 1 ? 'person' : 'people'}`} />
        </View>
      </HeroCard>

      {members.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {[{ id: ALL, name: 'Everyone' }, ...members.map((m) => ({ id: m.id, name: names.get(m.id) ?? m.name }))].map((o) => {
            const selected = o.id === filter;
            return (
              <Pressable
                key={o.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setFilter(o.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  paddingLeft: o.id === ALL ? space.lg : 6,
                  paddingRight: space.lg,
                  height: 48,
                  borderRadius: radius.pill,
                  backgroundColor: selected ? p.primary : p.surface,
                }}>
                {o.id === ALL ? null : <Avatar name={o.name} size={36} />}
                <Text variant="label" tone={selected ? 'onPrimary' : 'ink'}>
                  {o.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {shown.length === 0 ? (
        <View style={{ gap: space.sm, paddingVertical: space.xl }}>
          <Text variant="heading">Start with a health policy</Text>
          <Text tone="soft">Snap the first page, or pick the PDF your insurer emailed.</Text>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          {shown.map((d) => (
            <DocumentRow
              key={d.id}
              document={d}
              ownerName={filter === ALL ? names.get(d.memberId) : undefined}
              editable={canEdit(role)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function Pill({ icon, label, dark = false }: { icon: 'file-text' | 'users'; label: string; dark?: boolean }) {
  const p = usePalette();
  const fg = dark ? p.onBar : p.onTint;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        height: 48,
        paddingHorizontal: space.lg,
        borderRadius: radius.pill,
        backgroundColor: dark ? p.bar : p.peachWash,
      }}>
      <Feather name={icon} size={16} color={fg} />
      <RNText style={[type.label, { color: fg }]}>{label}</RNText>
    </View>
  );
}
