import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MemberRow } from '@/components/member-row';
import { heavy, tap } from '@/components/haptics';
import { Avatar, GradientFill, IconTile, ScoreRing, SectionHeader, Screen, Text, memberStatus, pressFeedback, useCountUp } from '@/components/ui';
import { checkTargets, familyCoverageScore, memberCoverageScore } from '@/lib/health-check';
import { ITEM_TYPE_LABELS, formatRupees } from '@/lib/items';
import { canEdit } from '@/lib/permissions';
import { familyReadiness, memberReadiness } from '@/lib/readiness';
import { coverageRadar, hasDependants, radarGaps } from '@/lib/radar';
import { KIND_LABELS, relativeDay, timeline, todayInIndia } from '@/lib/timeline';
import { insights, type Insight } from '@/lib/tools';
import { useHousehold } from '@/providers/household-provider';
import { radius, space, type, usePalette, type Palette } from '@/theme/tokens';

type IconName = ComponentProps<typeof Feather>['name'];

function greeting(hour = new Date().getHours()) {
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

/** Screen 6: the family dashboard. A lime panel with the score and four actions, then family and dues on dark. */
export default function FamilyScreen() {
  const { household, members, documents, items, role, refresh } = useHousehold();
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const editable = canEdit(role);
  const me = members.find((m) => m.relation === 'self');
  const readiness = familyReadiness(members, documents);
  const targets = checkTargets(members);
  const coverage = familyCoverageScore(targets);
  const gapCount = targets.reduce((n, m) => n + (m.healthCheck ? memberCoverageScore(m.healthCheck, m).gaps.length : 0), 0);
  const toConfirm = documents.filter((d) => d.ocrStatus === 'extracted').length;
  const shownScore = useCountUp(coverage ?? readiness);
  const today = todayInIndia();
  const dueSoon = timeline(items, members, today).filter((e) => e.daysLeft <= 30 && !e.snoozed);
  const dependants = hasDependants(members);
  const radarGapCount = members.reduce((n, m) => n + radarGaps(coverageRadar(m, items, { hasDependants: dependants })).length, 0);
  const cards = insights({ members, items, documents, radarGapCount, today }).filter((c) => editable || c.route !== '/upload');

  const actions: { icon: IconName; label: string; onPress: () => void; show: boolean }[] = [
    { icon: 'camera', label: 'Scan', onPress: () => router.push('/upload'), show: editable },
    { icon: 'plus', label: 'Add', onPress: () => router.push({ pathname: '/item/new', params: { memberId: me?.id } }), show: editable && !!me },
    { icon: 'activity', label: 'Check-up', onPress: () => router.push('/health-check'), show: editable },
    { icon: 'message-circle', label: 'Ask', onPress: () => router.push('/ask'), show: true },
  ];

  return (
    <Screen edges={[]} onRefresh={refresh}>
      {/* The lime panel bleeds to the screen edges and under the status bar. */}
      <View
        style={{
          overflow: 'hidden',
          marginHorizontal: -20,
          marginTop: -space.md,
          paddingTop: insets.top + space.md,
          paddingHorizontal: 20,
          paddingBottom: 20,
          backgroundColor: p.lime,
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
          gap: space.lg,
        }}>
        <GradientFill tint="lime" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ borderWidth: 2, borderColor: p.limeSoft, borderRadius: 26 }}>
            <Avatar name={me?.name ?? 'You'} size={44} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label" style={{ color: p.onTint, fontSize: 15 }} numberOfLines={1}>
              {me?.name ?? 'Hello'}
            </Text>
            <Text variant="caption" style={{ color: p.onTint, opacity: 0.65 }} numberOfLines={1}>
              {greeting()} · {household?.name}
            </Text>
          </View>
          <SquareButton
            icon="alert-octagon"
            label="Emergency mode"
            onPress={() => {
              heavy();
              router.push('/emergency');
            }}
          />
          <SquareButton
            icon="bell"
            label={toConfirm > 0 ? `${toConfirm} documents ready to confirm` : 'Open vault'}
            dot={toConfirm > 0}
            onPress={() => router.push('/vault')}
          />
        </View>

        <View style={{ backgroundColor: p.limeSoft, borderRadius: 28, padding: 18, gap: space.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="label" style={{ color: p.onTint, fontWeight: '500' }}>
              {coverage === null ? 'Essential papers' : 'Coverage score'}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Coverage radar" onPress={() => router.push('/radar')} hitSlop={10}>
              <Feather name="more-horizontal" size={18} color={p.onTint} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <ScoreRing value={coverage ?? readiness} size={96} stroke={9} color={p.bar} track={p.limeLo}>
              <Text variant="display" style={[type.number, { color: p.onTint, fontSize: 32, lineHeight: 34, letterSpacing: -1.5 }]}>
                {shownScore}
              </Text>
              <Text variant="caption" style={{ color: p.onTint, opacity: 0.6, fontSize: 10.5, fontWeight: '600' }}>
                {coverage === null ? '% papers' : 'of 100'}
              </Text>
            </ScoreRing>
            <View style={{ flex: 1, gap: space.sm }}>
              <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: p.forest, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Feather name={gapCount === 0 && coverage !== null ? 'check' : 'arrow-up'} size={11} color={p.lime} />
                <Text variant="caption" style={{ color: p.lime, fontWeight: '700', fontSize: 11 }}>
                  {coverage === null ? `${documents.length} docs` : gapCount === 0 ? 'No gaps' : `${gapCount} to fix`}
                </Text>
              </View>
              <Text variant="caption" style={{ color: p.onTint, opacity: 0.75 }} numberOfLines={2}>
                {coverage === null ? 'Take the 2-minute check-up for your Coverage Score' : `${items.length} policies and deposits saved`}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs }}>
            {actions
              .filter((a) => a.show)
              .map((a) => (
                <Pressable
                  key={a.label}
                  accessibilityRole="button"
                  onPress={a.onPress}
                  style={({ pressed }) => ({ alignItems: 'center', gap: 6, minWidth: 64, ...pressFeedback(pressed) })}>
                  <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: p.bar, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={a.icon} size={20} color={p.lime} />
                  </View>
                  <Text variant="caption" style={{ color: p.onTint, fontWeight: '600' }}>
                    {a.label}
                  </Text>
                </Pressable>
              ))}
          </View>
        </View>
      </View>

      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ alignItems: 'center', marginTop: -space.lg - 1 }}>
        <View style={{ width: 56, height: 22, backgroundColor: p.limeLo, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="chevron-down" size={15} color={p.onTint} />
        </View>
      </View>

      {cards.length > 0 ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="For you" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: 20 }}>
            {cards.map((c) => (
              <InsightCard key={c.id} insight={c} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={{ gap: space.md }}>
        <SectionHeader title="Your family" action="View all" onAction={() => router.push('/radar')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: 20 }}>
          {editable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add family member"
              onPress={() => router.push('/member/add')}
              style={({ pressed }) => ({
                width: 64,
                height: 64,
                borderRadius: 20,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: p.inkFaint,
                alignItems: 'center',
                justifyContent: 'center',
                ...pressFeedback(pressed),
              })}>
              <Feather name="plus" size={20} color={p.ink} />
            </Pressable>
          ) : null}
          {members.map((m) => {
            const r = memberReadiness(m, documents);
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/member/[id]', params: { id: m.id } })}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  height: 64,
                  paddingLeft: 10,
                  paddingRight: 16,
                  borderRadius: 20,
                  backgroundColor: p.surface,
                  ...pressFeedback(pressed),
                })}>
                <Avatar name={m.name} size={42} status={memberStatus(m)} />
                <View>
                  <Text variant="label" style={{ fontSize: 14 }}>
                    {m.relation === 'self' ? 'You' : m.name.split(' ')[0]}
                  </Text>
                  <Text variant="caption" tone="faint" style={type.number}>
                    {r.present.length}/3 papers
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ gap: space.xs }}>
        <SectionHeader title="Due soon" action="View all" onAction={() => router.push('/timeline')} />
        <Text variant="caption" tone="faint">
          Next 30 days
        </Text>
        {dueSoon.length === 0 ? (
          <View style={{ paddingVertical: space.lg, alignItems: 'center', gap: space.sm }}>
            <Feather name="check-circle" size={22} color={p.lime} />
            <Text variant="caption" tone="soft">
              Nothing due. Confirmed policies with dates show here.
            </Text>
          </View>
        ) : (
          dueSoon.slice(0, 5).map((e, idx, shown) => {
            const item = items.find((i) => i.id === e.itemId);
            const who = members.find((m) => m.id === e.memberId);
            const incoming = e.kind === 'maturity';
            const late = e.daysLeft < 0;
            return (
              <Pressable
                key={e.key}
                accessibilityRole="button"
                onPress={() => router.push('/timeline')}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  paddingVertical: space.md,
                  borderBottomWidth: idx < shown.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: p.line,
                  ...pressFeedback(pressed),
                })}>
                <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name={incoming ? 'arrow-down-left' : 'arrow-up-right'} size={18} color={incoming ? p.lime : p.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="label" style={{ fontSize: 14 }} numberOfLines={1}>
                    {item?.provider ?? (item ? ITEM_TYPE_LABELS[item.type] : '')} · {KIND_LABELS[e.kind].toLowerCase()}
                  </Text>
                  <Text variant="caption" tone="faint" numberOfLines={1}>
                    {who?.relation === 'self' ? 'You' : who?.name.split(' ')[0]} · {relativeDay(e.daysLeft)}
                  </Text>
                </View>
                {e.amount != null ? (
                  <Text variant="label" style={[type.number, { fontSize: 14, color: incoming ? p.lime : late ? p.danger : p.amber }]}>
                    {incoming ? '+ ' : '− '}
                    {formatRupees(e.amount)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })
        )}
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Tools" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          <Tile icon="pie-chart" title="Net worth" subtitle="What the family owns" onPress={() => router.push('/net-worth')} />
          <Tile icon="users" title="Contributions" subtitle="Who paid what" onPress={() => router.push('/contributions')} />
          <Tile icon="percent" title="Tax helper" subtitle="Parents’ deductions" onPress={() => router.push('/tax')} />
          <Tile icon="search" title="Policy check" subtitle="Is an LIC plan worth it?" onPress={() => router.push('/policy-check')} />
          <Tile icon="user-check" title="Nominees" subtitle="Audit and will checklist" onPress={() => router.push('/nominees')} />
          <Tile icon="alert-octagon" title="Emergency" subtitle="Hospital-ready in one tap" onPress={() => router.push('/emergency')} />
        </View>
      </View>

      {members.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionHeader title="Papers by person" />
          {members.map((m) => (
            <MemberRow key={m.id} member={m} readiness={memberReadiness(m, documents)} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

/** The dark rounded squares in the lime header. */
function SquareButton({ icon, label, onPress, dot = false }: { icon: IconName; label: string; onPress: () => void; dot?: boolean }) {
  const p = usePalette();
  const sos = icon === 'alert-octagon';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        if (!sos) tap();
        onPress();
      }}
      style={({ pressed }) => ({
        width: 46,
        height: 46,
        borderRadius: 16,
        backgroundColor: sos ? p.sos : p.bar,
        boxShadow: sos ? p.sosGlow : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        ...pressFeedback(pressed),
      })}>
      <Feather name={icon} size={18} color={sos ? p.onBar : p.lime} />
      {dot ? (
        <View style={{ position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: p.danger, borderWidth: 1.5, borderColor: p.bar }} />
      ) : null}
    </Pressable>
  );
}

function Tile({ icon, title, subtitle, onPress }: { icon: IconName; title: string; subtitle: string; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ flexBasis: '47%', flexGrow: 1, backgroundColor: pressed ? p.surfaceSunk : p.surface, borderRadius: radius.lg, padding: space.md, gap: space.lg, ...pressFeedback(pressed) })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <IconTile name={icon} bg={icon === 'alert-octagon' ? p.dangerWash : p.limeWash} color={icon === 'alert-octagon' ? p.danger : p.lime} size={36} />
        <Feather name="arrow-up-right" size={16} color={p.inkSoft} />
      </View>
      <View>
        <Text variant="label" style={{ fontSize: 14 }}>
          {title}
        </Text>
        <Text variant="caption" tone="faint" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

function toneColors(p: Palette, tone: Insight['tone']) {
  if (tone === 'danger') return { bg: p.dangerWash, fg: p.danger };
  if (tone === 'amber') return { bg: p.amberWash, fg: p.amber };
  return { bg: p.limeWash, fg: p.lime };
}

/** One "For you" card: what we noticed, why it matters, one action. */
function InsightCard({ insight }: { insight: Insight }) {
  const p = usePalette();
  const c = toneColors(p, insight.tone);
  return (
    <View style={{ width: 236, backgroundColor: p.surface, borderRadius: radius.lg, padding: space.md, gap: space.sm, borderWidth: 1, borderColor: p.line }}>
      <IconTile name={insight.icon} bg={c.bg} color={c.fg} size={34} />
      <Text variant="label" style={{ fontSize: 14 }} numberOfLines={2}>
        {insight.title}
      </Text>
      <Text variant="caption" tone="soft" numberOfLines={2} style={{ minHeight: 32 }}>
        {insight.body}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(insight.route)}
        style={({ pressed }) => ({
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 12,
          height: 30,
          borderRadius: radius.pill,
          backgroundColor: c.fg,
          ...pressFeedback(pressed),
        })}>
        <Text variant="caption" style={{ color: p.onTint, fontWeight: '700' }}>
          {insight.action}
        </Text>
        <Feather name="arrow-right" size={12} color={p.onTint} />
      </Pressable>
    </View>
  );
}
