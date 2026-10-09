import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { DocumentRow } from '@/components/document-row';
import { Avatar, Button, EmptyState, HeroCard, Screen, Text, memberStatus } from '@/components/ui';
import { canEdit } from '@/lib/permissions';
import { useHousehold } from '@/providers/household-provider';
import { MAX_FONT_SCALE, radius, space, type, usePalette } from '@/theme/tokens';

const ALL = '__all__';

export default function VaultScreen() {
  const { household, members, documents, role, refresh } = useHousehold();
  const p = usePalette();
  const [filter, setFilter] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const names = new Map(members.map((m) => [m.id, m.relation === 'self' ? 'You' : m.name.split(' ')[0]]));
  const q = search.trim().toLowerCase();
  const shown = documents
    .filter((d) => filter === ALL || d.memberId === filter)
    .filter((d) => !q || [d.title, d.fileName, d.extractedFields?.provider, names.get(d.memberId)].some((v) => v?.toLowerCase().includes(q)));

  return (
    <Screen
      edges={['top']}
      onRefresh={refresh}
      footer={canEdit(role) ? <Button label="Add a document" onPress={() => router.push('/upload')} /> : undefined}>
      <HeroCard tint="forest" icon="archive" title="Family vault">
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Pill icon="file-text" label={`${documents.length} ${documents.length === 1 ? 'document' : 'documents'}`} dark />
          <Pill icon="users" label={`${members.length} ${members.length === 1 ? 'person' : 'people'}`} />
        </View>
      </HeroCard>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          height: 46,
          paddingHorizontal: space.md,
          borderRadius: radius.pill,
          backgroundColor: p.surface,
          boxShadow: p.shadow,
        }}>
        <Feather name="search" size={16} color={p.inkFaint} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search policies, insurers, people"
          placeholderTextColor={p.inkFaint}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          returnKeyType="search"
          style={[type.body, { flex: 1, color: p.ink, paddingVertical: 0 }]}
        />
        {search ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} hitSlop={10}>
            <Feather name="x-circle" size={16} color={p.inkFaint} />
          </Pressable>
        ) : null}
      </View>

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
                  paddingLeft: o.id === ALL ? 14 : 4,
                  paddingRight: 14,
                  height: 40,
                  borderRadius: radius.pill,
                  backgroundColor: selected ? p.primary : p.surface,
                }}>
                {o.id === ALL ? null : <Avatar name={o.name} size={32} status={(() => { const m = members.find((x) => x.id === o.id); return m ? memberStatus(m) : undefined; })()} />}
                <Text variant="label" tone={selected ? 'onPrimary' : 'ink'} style={{ fontWeight: '500' }}>
                  {o.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {shown.length === 0 ? (
        <EmptyState
          icon={q ? 'search' : 'file-plus'}
          title={q ? 'Nothing matches that' : 'Start with a health policy'}
          body={q ? 'Try an insurer’s name or a person.' : 'Snap the first page, or pick the PDF your insurer emailed. We read the details for you.'}
          action={!q && canEdit(role) ? 'Add a document' : undefined}
          onAction={() => router.push('/upload')}
        />
      ) : (
        <View style={{ gap: space.md }}>
          {shown.map((d) => (
            <DocumentRow
              key={d.id}
              document={d}
              ownerName={filter === ALL ? names.get(d.memberId) : undefined}
              editable={canEdit(role)}
              householdId={household?.id}
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
        height: 38,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        backgroundColor: dark ? p.bar : p.lime,
      }}>
      <Feather name={icon} size={14} color={fg} />
      <Text variant="label" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}
