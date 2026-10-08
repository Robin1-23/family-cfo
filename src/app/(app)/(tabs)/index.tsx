import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { MemberRow } from '@/components/member-row';
import { Button, Panel, Screen, Text } from '@/components/ui';
import { DOC_TYPE_LABELS, ESSENTIAL_DOC_TYPES } from '@/lib/catalog';
import { canEdit } from '@/lib/permissions';
import { familyReadiness, memberReadiness, nextActions } from '@/lib/readiness';
import { useHousehold } from '@/providers/household-provider';
import { radius, space, type, usePalette } from '@/theme/tokens';

export default function FamilyScreen() {
  const { household, members, documents, role } = useHousehold();
  const p = usePalette();
  const score = familyReadiness(members, documents);
  const actions = nextActions(members, documents);
  const editable = canEdit(role);
  const byId = new Map(members.map((m) => [m.id, m]));

  return (
    <Screen edges={['top']}>
      <View style={{ gap: space.xs }}>
        <Text variant="label" tone="soft">
          {household?.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
          <Text variant="display" style={[type.number, { fontSize: 56, lineHeight: 60 }]}>
            {score}%
          </Text>
          <Text tone="soft" style={{ paddingBottom: 8, flex: 1 }}>
            of essential papers are in the vault
          </Text>
        </View>
        <Text variant="caption" tone="faint">
          Essentials for each person: {ESSENTIAL_DOC_TYPES.map((t) => DOC_TYPE_LABELS[t].toLowerCase()).join(', ')}.
        </Text>
      </View>

      {editable && actions.length > 0 ? (
        <Panel>
          <Text variant="heading">Do next</Text>
          {actions.map((a) => {
            const m = byId.get(a.memberId);
            if (!m) return null;
            return (
              <Pressable
                key={`${a.memberId}-${a.docType}`}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/upload', params: { memberId: a.memberId, docType: a.docType } })}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  paddingVertical: space.sm,
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View style={{ width: 10, height: 10, borderRadius: radius.pill, borderWidth: 1.5, borderColor: p.due }} />
                <Text style={{ flex: 1 }}>
                  Add {m.relation === 'self' ? 'your' : `${m.name.split(' ')[0]}’s`} {DOC_TYPE_LABELS[a.docType].toLowerCase()}
                </Text>
                <Text variant="label" tone="primary">
                  Add
                </Text>
              </Pressable>
            );
          })}
        </Panel>
      ) : null}

      <View style={{ gap: space.md }}>
        <Text variant="heading">Your family</Text>
        {members.map((m) => (
          <MemberRow key={m.id} member={m} readiness={memberReadiness(m, documents)} />
        ))}
        {editable ? (
          <Button label="Add family member" kind="secondary" onPress={() => router.push('/member/add')} />
        ) : null}
      </View>
    </Screen>
  );
}
