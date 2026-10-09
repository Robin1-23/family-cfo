import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { EmptyState, HeroCard, Notice, Screen, SectionHeader, Text, pressFeedback } from '@/components/ui';
import { ITEM_GROUP, ITEM_TYPE_LABELS } from '@/lib/items';
import { canEdit } from '@/lib/permissions';
import { useHousehold } from '@/providers/household-provider';
import { radius, space, usePalette } from '@/theme/tokens';

const WILL_STEPS = [
  'Every policy, deposit and account has a nominee',
  'Nominees know these papers are in Family CFO',
  'A written will says who inherits what. A nominee doesn’t always inherit',
  'The will is signed by two witnesses and kept somewhere the family knows',
  'Someone you trust can open this app in an emergency',
];

/** V3 "Succession kit", first part: a nominee audit across everything, and a will checklist. */
export default function NomineesScreen() {
  const { members, items, role } = useHousehold();
  const p = usePalette();
  const relevant = items.filter((i) => ITEM_GROUP[i.type] === 'insurance' || ITEM_GROUP[i.type] === 'asset');
  const missing = relevant.filter((i) => !i.nominee);
  const done = relevant.length - missing.length;
  const name = (id: string) => {
    const m = members.find((x) => x.id === id);
    return !m ? '' : m.relation === 'self' ? 'You' : m.name.split(' ')[0];
  };

  return (
    <Screen>
      <HeroCard
        tint={missing.length ? 'forest' : 'lime'}
        icon="user-check"
        back
        eyebrow="Nominee audit"
        title={relevant.length === 0 ? 'Nothing to check yet' : missing.length === 0 ? 'Every nominee is in place' : `${missing.length} missing nominees`}
        subtitle={relevant.length ? `${done} of ${relevant.length} policies and deposits have one.` : 'Add policies and deposits to audit them.'}
      />

      {relevant.length === 0 ? (
        <EmptyState
          icon="user-check"
          title="Nothing to audit yet"
          body="Once policies and deposits are saved, we check each one has a nominee."
          action={canEdit(role) ? 'Add a document' : undefined}
          onAction={() => router.push('/upload')}
        />
      ) : null}

      {missing.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionHeader title="Needs a nominee" />
          {missing.map((i) => (
            <Pressable
              key={i.id}
              accessibilityRole="button"
              disabled={!canEdit(role)}
              onPress={() => router.push({ pathname: '/item/new', params: { itemId: i.id } })}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: p.surface, borderRadius: radius.lg, padding: space.md, ...pressFeedback(pressed) })}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: p.amberWash, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="user-x" size={16} color={p.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label" style={{ fontSize: 14 }} numberOfLines={1}>
                  {i.provider ?? ITEM_TYPE_LABELS[i.type]}
                </Text>
                <Text variant="caption" tone="faint">
                  {ITEM_TYPE_LABELS[i.type]} · {name(i.memberId)}
                </Text>
              </View>
              {canEdit(role) ? <Feather name="chevron-right" size={16} color={p.inkFaint} /> : null}
            </Pressable>
          ))}
          <Text variant="caption" tone="faint">
            Update the nominee with the insurer or bank, then add it here.
          </Text>
        </View>
      ) : null}

      {done > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionHeader title="In place" />
          {relevant
            .filter((i) => i.nominee)
            .map((i) => (
              <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6 }}>
                <Feather name="check-circle" size={16} color={p.lime} />
                <Text variant="label" style={{ flex: 1 }} numberOfLines={1}>
                  {i.provider ?? ITEM_TYPE_LABELS[i.type]} · {name(i.memberId)}
                </Text>
                <Text variant="caption" tone="soft" numberOfLines={1}>
                  {i.nominee}
                </Text>
              </View>
            ))}
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <SectionHeader title="Will readiness" />
        <View style={{ backgroundColor: p.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md }}>
          {WILL_STEPS.map((s, i) => (
            <View key={s} style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: p.limeWash, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="caption" style={{ color: p.lime, fontWeight: '700', fontSize: 11 }}>
                  {i + 1}
                </Text>
              </View>
              <Text variant="caption" style={{ flex: 1, fontSize: 13, lineHeight: 19 }}>
                {s}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Notice tone="primary">General information, not legal advice. A lawyer can draft or check a will.</Notice>
    </Screen>
  );
}
