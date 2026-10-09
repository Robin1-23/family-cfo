import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Avatar, Button, HeroCard, Notice, Screen, Text } from '@/components/ui';
import { formatRupees } from '@/lib/items';
import { canEdit } from '@/lib/permissions';
import { taxTips } from '@/lib/tools';
import { useHousehold } from '@/providers/household-provider';
import { radius, space, type, usePalette } from '@/theme/tokens';

/** V2 "Tax helper (parents)": plain pointers from the family's own policies and deposits. */
export default function TaxScreen() {
  const { members, items, role } = useHousehold();
  const p = usePalette();
  const groups = taxTips(members, items);

  return (
    <Screen>
      <HeroCard tint="forest" icon="percent" back eyebrow="Tax helper" title="Parents’ tax, made simple" subtitle="What may apply this year, from what you’ve saved." />

      {groups.length === 0 ? (
        <View style={{ gap: space.sm, alignItems: 'center', paddingVertical: space.lg }}>
          <Text variant="heading">Add a parent first</Text>
          <Text variant="caption" tone="soft" style={{ textAlign: 'center' }}>
            Tips are based on each parent’s policies and deposits.
          </Text>
          {canEdit(role) ? <Button label="Add a parent" icon="user-plus" onPress={() => router.push('/member/add')} /> : null}
        </View>
      ) : (
        groups.map(({ memberId, tips }) => {
          const m = members.find((x) => x.id === memberId)!;
          return (
            <View key={memberId} style={{ backgroundColor: p.surface, borderRadius: radius.xl, padding: space.lg, gap: space.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Avatar name={m.name} size={38} />
                <Text variant="heading" style={{ flex: 1 }}>
                  {m.name}
                </Text>
              </View>
              {tips.map((t) => (
                <View key={t.title} style={{ flexDirection: 'row', gap: space.md }}>
                  <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: p.limeWash, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="check" size={14} color={p.lime} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                      <Text variant="label" style={{ fontSize: 14, flex: 1 }}>
                        {t.title}
                      </Text>
                      {t.amount ? (
                        <Text variant="label" style={[type.number, { color: p.lime }]}>
                          {formatRupees(t.amount)}
                        </Text>
                      ) : null}
                    </View>
                    <Text variant="caption" tone="soft" style={{ lineHeight: 18 }}>
                      {t.body}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          );
        })
      )}

      <Notice tone="primary">
        General information, not tax advice. Rules changed with the Income-tax Act, 2025, so confirm with a CA before filing.
      </Notice>
    </Screen>
  );
}
