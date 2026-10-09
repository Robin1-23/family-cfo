import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Amount, Avatar, GradientFill, IconTile, Screen, SectionHeader, Text, memberStatus, pressFeedback } from '@/components/ui';
import { formatCompactRupees } from '@/lib/items';
import { canEdit } from '@/lib/permissions';
import { coverageRadar, hasDependants, radarGaps, type CoverStatus, type RadarRow } from '@/lib/radar';
import { useHousehold } from '@/providers/household-provider';
import { radius, space, type, usePalette, type Palette } from '@/theme/tokens';

const STATUS_TEXT: Record<CoverStatus, string> = {
  ok: 'Covered',
  low: 'Too low',
  missing: 'Missing',
  optional: 'Optional',
  self_reported: 'Not added',
};

function statusColors(p: Palette, s: CoverStatus) {
  if (s === 'ok') return { bg: p.limeWash, fg: p.limeDeep };
  if (s === 'optional') return { bg: p.surfaceSunk, fg: p.inkSoft };
  return { bg: p.amberWash, fg: p.amberDeep };
}

export default function RadarScreen() {
  const { members, items, role, refresh } = useHousehold();
  const p = usePalette();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const dependants = hasDependants(members);
  const member = members.find((m) => m.id === memberId) ?? members.find((m) => m.relation !== 'self') ?? members[0];

  if (!member) return <Screen edges={['top']}>{null}</Screen>;

  const rows = coverageRadar(member, items, { hasDependants: dependants });
  const gaps = radarGaps(rows);
  const insured = rows.reduce((n, r) => n + r.actual, 0);
  const firstName = member.relation === 'self' ? 'You' : member.name.split(' ')[0];

  return (
    <Screen edges={['top']} onRefresh={refresh}>
      <View>
        <Text variant="overline" tone="faint">
          Coverage radar
        </Text>
        <Text variant="title" style={{ fontSize: 26, lineHeight: 31 }}>
          Who’s covered
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {members.map((m) => {
          const selected = m.id === member.id;
          return (
            <Pressable
              key={m.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                setMemberId(m.id);
                setOpen(null);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                paddingLeft: 4,
                paddingRight: 14,
                height: 40,
                borderRadius: radius.pill,
                backgroundColor: selected ? p.primary : p.surface,
              }}>
              <Avatar name={m.name} size={32} status={memberStatus(m)} />
              <Text variant="label" tone={selected ? 'onPrimary' : 'ink'} style={{ fontWeight: '500' }}>
                {m.relation === 'self' ? 'You' : m.name.split(' ')[0]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ backgroundColor: p.lime, borderRadius: radius.xl, padding: space.lg, gap: space.lg, overflow: 'hidden' }}>
        <GradientFill tint="lime" />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconTile name="target" bg={p.bar} color={p.lime} size={32} />
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: gaps.length === 0 ? p.forest : p.bar,
            }}>
            <Text variant="caption" style={{ color: p.lime, fontWeight: '600' }}>
              {gaps.length === 0 ? 'No gaps' : `${gaps.length} ${gaps.length === 1 ? 'gap' : 'gaps'}`}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Amount value={insured > 0 ? formatCompactRupees(insured) : '₹0'} size={30} color={p.onTint} />
          <Text variant="caption" style={{ color: p.onTint, opacity: 0.75 }}>
            total cover for {firstName.toLowerCase() === 'you' ? 'you' : firstName}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 132 }}>
          {rows.map((r) => (
            <Bar key={r.kind} row={r} />
          ))}
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <SectionHeader title="What each cover means" />
        {rows.map((r) => {
          const c = statusColors(p, r.status);
          const expanded = open === r.kind;
          const actionable = canEdit(role) && r.status !== 'ok';
          return (
            <Pressable
              key={r.kind}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setOpen(expanded ? null : r.kind)}
              style={({ pressed }) => ({
                backgroundColor: p.surface,
                borderRadius: radius.lg,
                padding: space.md,
                gap: space.sm,
                boxShadow: p.shadow,
                ...pressFeedback(pressed),
              })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={{ flex: 1 }}>
                  <Text variant="label" style={{ fontSize: 14 }}>
                    {r.label}
                  </Text>
                  <Text variant="caption" tone="faint" style={type.number}>
                    {r.actual > 0 ? formatCompactRupees(r.actual) : 'None added'}
                    {r.suggested ? ` · guide ${formatCompactRupees(r.suggested)}` : ''}
                  </Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: c.bg }}>
                  <Text variant="caption" style={{ color: c.fg, fontWeight: '600', fontSize: 11 }}>
                    {STATUS_TEXT[r.status]}
                  </Text>
                </View>
                <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={p.inkFaint} />
              </View>
              {expanded ? (
                <View style={{ gap: space.sm }}>
                  <Text variant="caption" tone="soft" style={{ fontSize: 13, lineHeight: 19 }}>
                    {r.why}
                  </Text>
                  {actionable ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push({ pathname: '/item/new', params: { memberId: member.id } })}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
                      <Feather name="plus-circle" size={14} color={p.ink} />
                      <Text variant="label">Add a {r.label.toLowerCase()} policy</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Text variant="caption" tone="faint" style={{ textAlign: 'center' }}>
        General guidelines, not advice. We never sell policies.
      </Text>
    </Screen>
  );
}

/** One pill bar: filled to the share of the guideline covered; dashed when nothing is there. */
function Bar({ row }: { row: RadarRow }) {
  const p = usePalette();
  const share = row.suggested ? Math.min(row.actual / row.suggested, 1) : row.actual > 0 ? 1 : 0;
  const empty = row.actual === 0;
  return (
    <View style={{ alignItems: 'center', gap: 6, width: '22%' }}>
      <View style={{ width: 40, height: 104, justifyContent: 'flex-end', borderRadius: radius.pill, backgroundColor: p.limeSoft }}>
        <View
          style={{
            height: empty ? 34 : Math.max(34, 104 * share),
            borderRadius: radius.pill,
            backgroundColor: empty ? 'transparent' : row.status === 'ok' ? p.bar : p.amber,
            borderWidth: empty ? 1.5 : 0,
            borderStyle: 'dashed',
            borderColor: p.bar,
            alignItems: 'center',
            paddingTop: 8,
          }}>
          <Feather
            name={row.status === 'ok' ? 'check' : empty ? 'plus' : 'alert-circle'}
            size={13}
            color={empty ? p.bar : row.status === 'ok' ? p.lime : p.onTint}
          />
        </View>
      </View>
      <Text variant="caption" style={{ color: p.onTint, fontWeight: '600', fontSize: 11 }} numberOfLines={1}>
        {row.label.split(' ')[0]}
      </Text>
    </View>
  );
}
