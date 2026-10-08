import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text as RNText, View } from 'react-native';

import { MemberRow } from '@/components/member-row';
import { ArrowButton, Avatar, Button, IconTile, Screen, Text } from '@/components/ui';
import { DOC_TYPE_LABELS } from '@/lib/catalog';
import { checkTargets, familyCoverageScore, memberCoverageScore } from '@/lib/health-check';
import { canEdit } from '@/lib/permissions';
import { familyReadiness, memberReadiness, nextActions } from '@/lib/readiness';
import { useHousehold } from '@/providers/household-provider';
import { radius, space, type, usePalette, type Palette } from '@/theme/tokens';

const BAR_TINTS = (p: Palette) => [p.peach, p.lavender, p.inkFaint];

export default function FamilyScreen() {
  const { members, documents, items, role } = useHousehold();
  const p = usePalette();
  const editable = canEdit(role);
  const me = members.find((m) => m.relation === 'self');
  const readiness = familyReadiness(members, documents);
  const actions = nextActions(members, documents);
  const byId = new Map(members.map((m) => [m.id, m]));
  const targets = checkTargets(members);
  const coverage = familyCoverageScore(targets);
  const gapCount = targets.reduce((n, m) => n + (m.healthCheck ? memberCoverageScore(m.healthCheck, m).gaps.length : 0), 0);
  const toConfirm = documents.filter((d) => d.ocrStatus === 'extracted').length;

  return (
    <Screen edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Avatar name={me?.name ?? 'You'} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading" style={{ fontSize: 20 }} numberOfLines={1}>
            Hello, {me?.name.split(' ')[0] ?? 'there'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="zap" size={14} color={p.lavender} />
            <Text variant="caption" tone="soft">
              Papers in vault: <Text variant="caption" style={{ fontWeight: '700' }}>{readiness}%</Text>
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={toConfirm > 0 ? `${toConfirm} documents ready to confirm` : 'Open vault'}
          onPress={() => router.push('/vault')}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: p.line,
            backgroundColor: p.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Feather name="bell" size={20} color={p.ink} />
          {toConfirm > 0 ? (
            <View style={{ position: 'absolute', top: 10, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: p.peach }} />
          ) : null}
        </Pressable>
      </View>

      <View style={{ backgroundColor: p.lavender, borderRadius: 32, padding: space.xl, minHeight: 200, overflow: 'hidden' }}>
        <View
          style={{
            position: 'absolute',
            right: -30,
            top: -10,
            width: 170,
            height: 170,
            borderRadius: 85,
            backgroundColor: p.lavenderWash,
            opacity: 0.45,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Feather name="shield" size={72} color={p.lavenderDeep} />
        </View>
        <View style={{ gap: space.sm, maxWidth: '68%' }}>
          {coverage === null ? (
            <>
              <RNText style={[type.title, { color: p.onTint }]}>Your first Coverage Score</RNText>
              <RNText style={[type.caption, { color: p.onTint }]}>
                Six quick questions per parent about health cover, loans, savings and papers. About two minutes.
              </RNText>
            </>
          ) : (
            <>
              <RNText style={[type.label, { color: p.onTint }]}>Coverage Score</RNText>
              <RNText style={[type.display, type.number, { color: p.onTint, fontSize: 56, lineHeight: 60 }]}>{coverage}</RNText>
              <RNText style={[type.caption, { color: p.onTint }]}>
                {gapCount === 0 ? 'No gaps from your answers' : `${gapCount} ${gapCount === 1 ? 'gap' : 'gaps'} to look at`}
              </RNText>
            </>
          )}
        </View>
        {editable ? (
          <View style={{ marginTop: space.lg }}>
            <ArrowButton
              label={coverage === null ? 'Start the health check' : 'Retake the health check'}
              onPress={() => router.push('/health-check')}
            />
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <StatCard label="Documents" value={documents.length} icon="file-text" bg={p.peachWash} edge={p.peach} />
        <StatCard label="Policies and FDs" value={items.length} icon="shield" bg={p.lavenderWash} edge={p.lavender} />
      </View>

      <View style={{ backgroundColor: p.surface, borderRadius: radius.lg, padding: space.lg + 2, gap: space.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="heading">Essential papers</Text>
          <Text variant="label" tone="soft">
            {readiness}%
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
          {members.slice(0, 4).map((m, i) => {
            const r = memberReadiness(m, documents);
            return (
              <View key={m.id} style={{ flex: 1, alignItems: 'center', gap: space.sm }}>
                <View
                  style={{
                    width: '100%',
                    height: 110,
                    borderRadius: radius.md,
                    backgroundColor: p.surfaceSunk,
                    justifyContent: 'flex-end',
                    overflow: 'hidden',
                  }}>
                  <View
                    style={{
                      height: `${Math.max(r.percent, 12)}%`,
                      backgroundColor: BAR_TINTS(p)[i % 3],
                      borderRadius: radius.md,
                      alignItems: 'center',
                      paddingTop: 6,
                    }}>
                    <RNText style={[type.label, type.number, { color: p.onTint, fontSize: 12 }]}>{r.present.length}/3</RNText>
                  </View>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text variant="label" numberOfLines={1}>
                    {m.relation === 'self' ? 'You' : m.name.split(' ')[0]}
                  </Text>
                  <Text variant="caption" tone="faint">
                    {r.documentCount} {r.documentCount === 1 ? 'doc' : 'docs'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {editable && actions.length > 0 ? (
        <View style={{ backgroundColor: p.surface, borderRadius: radius.lg, padding: space.lg + 2, gap: space.xs }}>
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
                <IconTile name="plus" bg={p.peachWash} color={p.peachDeep} />
                <Text style={{ flex: 1 }}>
                  Add {m.relation === 'self' ? 'your' : `${m.name.split(' ')[0]}’s`} {DOC_TYPE_LABELS[a.docType].toLowerCase()}
                </Text>
                <Feather name="chevron-right" size={18} color={p.inkFaint} />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={{ gap: space.md }}>
        <Text variant="heading">Your family</Text>
        {members.map((m) => (
          <MemberRow key={m.id} member={m} readiness={memberReadiness(m, documents)} />
        ))}
        {editable ? <Button label="Add family member" kind="secondary" onPress={() => router.push('/member/add')} /> : null}
      </View>
    </Screen>
  );
}

function StatCard({
  label,
  value,
  icon,
  bg,
  edge,
}: {
  label: string;
  value: number;
  icon: 'file-text' | 'shield';
  bg: string;
  edge: string;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bg,
        borderWidth: 1.5,
        borderColor: edge,
        borderRadius: radius.lg,
        padding: space.lg,
        gap: space.md,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <IconTile name={icon} bg={edge} color={p.onTint} />
        <RNText style={[type.caption, { color: p.onTint, flex: 1 }]} numberOfLines={2}>
          {label}
        </RNText>
      </View>
      <RNText style={[type.display, type.number, { color: p.onTint, textAlign: 'center' }]}>{value}</RNText>
    </View>
  );
}
