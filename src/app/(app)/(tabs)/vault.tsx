import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DocumentRow } from '@/components/document-row';
import { Button, ChipGroup, Screen, Text } from '@/components/ui';
import { canEdit } from '@/lib/permissions';
import { useHousehold } from '@/providers/household-provider';
import { space } from '@/theme/tokens';

const ALL = '__all__';

export default function VaultScreen() {
  const { members, documents, role } = useHousehold();
  const [filter, setFilter] = useState<string>(ALL);
  const names = new Map(members.map((m) => [m.id, m.relation === 'self' ? 'You' : m.name.split(' ')[0]]));
  const shown = filter === ALL ? documents : documents.filter((d) => d.memberId === filter);

  return (
    <Screen
      edges={['top']}
      footer={canEdit(role) ? <Button label="Add a document" onPress={() => router.push('/upload')} /> : undefined}>
      <View style={{ gap: space.xs }}>
        <Text variant="title">Vault</Text>
        <Text tone="soft">
          {documents.length} {documents.length === 1 ? 'document' : 'documents'} across {members.length}{' '}
          {members.length === 1 ? 'person' : 'people'}
        </Text>
      </View>

      {members.length > 1 ? (
        <ChipGroup<string>
          value={filter}
          onChange={setFilter}
          options={[{ value: ALL, label: 'Everyone' }, ...members.map((m) => ({ value: m.id, label: names.get(m.id) ?? m.name }))]}
        />
      ) : null}

      {shown.length === 0 ? (
        <View style={{ gap: space.sm, paddingVertical: space.xl }}>
          <Text variant="heading">Nothing here yet</Text>
          <Text tone="soft">
            Start with a health insurance policy. Snap the first page or pick the PDF your insurer emailed.
          </Text>
        </View>
      ) : (
        <View>
          {shown.map((d) => (
            <DocumentRow key={d.id} document={d} ownerName={filter === ALL ? names.get(d.memberId) : undefined} />
          ))}
        </View>
      )}
    </Screen>
  );
}
