import { router } from 'expo-router';
import { View } from 'react-native';

import { Avatar, Button, EmptyState, HeroCard, Screen, SectionHeader, Text } from '@/components/ui';
import { formatCompactRupees, formatRupees } from '@/lib/items';
import { netWorth } from '@/lib/networth';
import { canEdit } from '@/lib/permissions';
import { useHousehold } from '@/providers/household-provider';
import { radius, space, type, usePalette } from '@/theme/tokens';

/** Screen 12: household balance sheet from what the family has entered. Bank sync (Account Aggregator) fills it in V2. */
export default function NetWorthScreen() {
  const { members, items, role } = useHousehold();
  const p = usePalette();
  const nw = netWorth(items);
  const self = members.find((m) => m.relation === 'self');
  const maxClass = Math.max(1, ...nw.byClass.map((l) => l.amount));
  const tints = [p.lime, p.amber, p.bar, p.limeDeep, p.amberDeep, p.inkFaint];

  return (
    <Screen>
      <HeroCard tint="dark" icon="pie-chart" back eyebrow="Net worth map" title={nw.net === 0 ? '₹0' : `${nw.net < 0 ? '−' : ''}${formatCompactRupees(Math.abs(nw.net))}`}>
        <View style={{ flexDirection: 'row', gap: space.lg, marginTop: space.xs }}>
          <View>
            <Text variant="caption" style={{ color: p.onBar, opacity: 0.6 }}>
              Savings and assets
            </Text>
            <Text variant="heading" style={[type.number, { color: p.onBar }]}>
              {formatRupees(nw.assets) || '₹0'}
            </Text>
          </View>
          <View>
            <Text variant="caption" style={{ color: p.onBar, opacity: 0.6 }}>
              Loans
            </Text>
            <Text variant="heading" style={[type.number, { color: p.amber }]}>
              {nw.liabilities > 0 ? `−${formatRupees(nw.liabilities)}` : '₹0'}
            </Text>
          </View>
        </View>
        {nw.net < 0 ? (
          <Text variant="caption" style={{ color: p.amber }}>
            Loans are more than savings right now.
          </Text>
        ) : null}
      </HeroCard>

      {nw.byClass.length === 0 && nw.loans.length === 0 ? (
        <EmptyState
          icon="pie-chart"
          title="Map what the family owns"
          body="FDs, savings, mutual funds, EPF, PPF, gold, property and loans. Joint accounts too."
        />
      ) : null}

      {nw.byClass.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionHeader title="By type" />
          <View style={{ backgroundColor: p.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md, boxShadow: p.shadow }}>
            {nw.byClass.map((l, i) => (
              <View key={l.type} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="label">{l.label}</Text>
                  <Text variant="label" tone="soft" style={type.number}>
                    {formatCompactRupees(l.amount)}
                  </Text>
                </View>
                <View style={{ height: 10, borderRadius: radius.pill, backgroundColor: p.surfaceSunk, overflow: 'hidden' }}>
                  <View style={{ width: `${(l.amount / maxClass) * 100}%`, height: '100%', borderRadius: radius.pill, backgroundColor: tints[i % tints.length] }} />
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {nw.byMember.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionHeader title="By person" />
          {nw.byMember.map((row) => {
            const m = members.find((x) => x.id === row.memberId);
            if (!m) return null;
            return (
              <View key={row.memberId} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: p.surface, borderRadius: radius.lg, padding: space.md, boxShadow: p.shadow }}>
                <Avatar name={m.name} size={38} />
                <View style={{ flex: 1 }}>
                  <Text variant="label" style={{ fontSize: 14 }}>
                    {m.relation === 'self' ? 'You' : m.name}
                  </Text>
                  <Text variant="caption" tone="faint" style={type.number}>
                    {formatCompactRupees(row.assets)} saved{row.liabilities ? ` · ${formatCompactRupees(row.liabilities)} owed` : ''}
                  </Text>
                </View>
                <Text variant="heading" style={[type.number, { color: row.net < 0 ? p.danger : p.ink }]}>
                  {row.net < 0 ? '−' : ''}
                  {formatCompactRupees(Math.abs(row.net))}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {canEdit(role) && self ? (
        <Button label="Add savings, an asset or a loan" icon="plus" onPress={() => router.push({ pathname: '/item/new', params: { memberId: self.id } })} />
      ) : null}

      <Text variant="caption" tone="faint" style={{ textAlign: 'center' }}>
        From what you’ve entered. Bank sync comes later, with consent.
      </Text>
    </Screen>
  );
}
