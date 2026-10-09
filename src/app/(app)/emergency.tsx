import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { heavy } from '@/components/haptics';
import { Avatar, Button, Text, pressFeedback } from '@/components/ui';
import { CASHLESS_STEPS, REIMBURSEMENT_DOCS, cashlessSearchUrl, emergencyPolicies, telUrl } from '@/lib/emergency';
import { ITEM_TYPE_LABELS, formatCompactRupees, formatDate } from '@/lib/items';
import { canEdit } from '@/lib/permissions';
import { todayInIndia } from '@/lib/timeline';
import { useHousehold } from '@/providers/household-provider';
import { callApi, type ShareLink } from '@/services/api';
import { radius, space, type, usePalette } from '@/theme/tokens';

/** Screen 11: one tap during a hospital admission. Everything needed at the TPA desk, in one place. */
export default function EmergencyScreen() {
  const params = useLocalSearchParams<{ memberId?: string }>();
  const { household, members, items, documents, role } = useHousehold();
  const p = usePalette();
  const [memberId, setMemberId] = useState<string | undefined>(params.memberId);
  const [sharing, setSharing] = useState(false);
  const [tab, setTab] = useState<'cashless' | 'reimbursement'>('cashless');
  const today = todayInIndia();
  const policies = emergencyPolicies(items, members, today, memberId);
  const person = members.find((m) => m.id === memberId);
  useEffect(() => heavy(), []);

  async function shareAll() {
    if (!household) return;
    const policyDocs = new Set(policies.map((x) => x.item.sourceDocId).filter((id): id is string => !!id));
    const ids = documents
      .filter((d) => policyDocs.has(d.id) || ((!memberId || d.memberId === memberId) && (d.docType === 'health_policy' || d.docType === 'id_document')))
      .map((d) => d.id)
      .slice(0, 20);
    setSharing(true);
    try {
      const { links, hours } = ids.length ? await callApi<{ links: ShareLink[]; hours: number }>('/share-links', { householdId: household.id, docIds: ids }) : { links: [], hours: 24 };
      const lines = [
        `Health insurance details${person ? ` for ${person.name}` : ''}`,
        '',
        ...policies.map(
          ({ item, member }) =>
            `• ${member?.name ?? ''}: ${item.provider ?? ITEM_TYPE_LABELS[item.type]}${item.numberLast4 ? ` (policy ••••${item.numberLast4})` : ''}${item.amount ? `, cover ${formatCompactRupees(item.amount)}` : ''}${item.helpline ? `, helpline ${item.helpline}` : ''}`,
        ),
        ...(links.length ? ['', `Documents (links work for ${hours} hours):`, ...links.map((l) => `• ${l.title}: ${l.url}`)] : []),
        '',
        'Shared from Family CFO',
      ];
      await Share.share({ message: lines.join('\n') });
    } catch (e) {
      Alert.alert('Couldn’t prepare the documents', (e as Error).message);
    } finally {
      setSharing(false);
    }
  }

  const steps = tab === 'cashless' ? CASHLESS_STEPS : REIMBURSEMENT_DOCS;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.emergency }}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: space.md, gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.onBar }} />
              <Text variant="overline" style={{ color: p.onBar }}>
                Emergency mode
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close emergency mode"
              onPress={() => router.back()}
              hitSlop={10}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: p.emergencyDeep, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={18} color={p.onBar} />
            </Pressable>
          </View>

          <View style={{ gap: 4 }}>
            <Text variant="title" style={{ color: p.onBar, fontSize: 26, lineHeight: 31 }}>
              In hospital?
            </Text>
            <Text variant="caption" style={{ color: p.onBar, opacity: 0.85 }}>
              Show these at the insurance desk. Call the helpline first.
            </Text>
          </View>

          {members.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {[{ id: undefined, name: 'Everyone' }, ...members.map((m) => ({ id: m.id as string | undefined, name: m.relation === 'self' ? 'You' : m.name.split(' ')[0] }))].map((o) => {
                const selected = o.id === memberId;
                return (
                  <Pressable
                    key={o.id ?? 'all'}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setMemberId(o.id)}
                    style={{
                      paddingHorizontal: 14,
                      height: 36,
                      justifyContent: 'center',
                      borderRadius: radius.pill,
                      backgroundColor: selected ? p.onBar : p.emergencyDeep,
                    }}>
                    <Text variant="label" style={{ color: selected ? p.emergency : p.onBar }}>
                      {o.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {policies.length === 0 ? (
            <View style={{ backgroundColor: p.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm }}>
              <Text variant="heading">No health policy saved{person ? ` for ${person.name.split(' ')[0]}` : ''}</Text>
              <Text variant="caption" tone="soft">
                Ask the hospital about government schemes like Ayushman Bharat (PM-JAY) or your employer’s cover.
              </Text>
            </View>
          ) : (
            policies.map(({ item, member, mayHaveLapsed }) => (
              <View key={item.id} style={{ backgroundColor: p.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  {member ? <Avatar name={member.name} size={36} /> : null}
                  <View style={{ flex: 1 }}>
                    <Text variant="overline" tone="faint">
                      {ITEM_TYPE_LABELS[item.type]} · {member?.relation === 'self' ? 'You' : member?.name.split(' ')[0]}
                    </Text>
                    <Text variant="heading" numberOfLines={1}>
                      {item.provider ?? 'Insurer not added'}
                    </Text>
                  </View>
                  {item.amount ? (
                    <Text variant="title" style={type.number}>
                      {formatCompactRupees(item.amount)}
                    </Text>
                  ) : null}
                </View>

                <View style={{ flexDirection: 'row', gap: space.lg }}>
                  <Fact label="Policy no." value={item.numberLast4 ? `••••${item.numberLast4}` : '—'} />
                  <Fact label="Renews" value={item.dueDate ? formatDate(item.dueDate) : '—'} />
                  <Fact label="Nominee" value={item.nominee ?? '—'} />
                </View>

                {mayHaveLapsed ? (
                  <View style={{ flexDirection: 'row', gap: space.sm, backgroundColor: p.dangerWash, borderRadius: radius.md, padding: space.sm }}>
                    <Feather name="alert-triangle" size={14} color={p.danger} />
                    <Text variant="caption" style={{ flex: 1 }}>
                      Renewal date has passed. Confirm it was renewed when you call.
                    </Text>
                  </View>
                ) : null}

                {item.helpline ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Call ${item.provider ?? 'insurer'} helpline ${item.helpline}`}
                    onPress={() => Linking.openURL(telUrl(item.helpline!))}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: space.sm,
                      height: 52,
                      borderRadius: radius.pill,
                      backgroundColor: p.emergency,
                      ...pressFeedback(pressed),
                    })}>
                    <Feather name="phone-call" size={18} color={p.onBar} />
                    <Text variant="label" style={{ color: p.onBar, fontSize: 15 }}>
                      Call {item.helpline}
                    </Text>
                  </Pressable>
                ) : canEdit(role) ? (
                  <Button
                    label="Add the helpline from the policy card"
                    kind="secondary"
                    icon="phone"
                    onPress={() => router.push({ pathname: '/item/new', params: { itemId: item.id } })}
                  />
                ) : null}

                <Pressable
                  accessibilityRole="link"
                  onPress={() => Linking.openURL(cashlessSearchUrl(item.provider, member?.city ?? null))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' }}>
                  <Feather name="map-pin" size={13} color={p.inkSoft} />
                  <Text variant="label" tone="soft">
                    Find cashless hospitals
                  </Text>
                </Pressable>
              </View>
            ))
          )}

          <Pressable
            accessibilityRole="button"
            disabled={sharing}
            onPress={shareAll}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.sm,
              height: 54,
              borderRadius: radius.pill,
              backgroundColor: p.onBar,
              opacity: sharing ? 0.6 : 1,
              ...pressFeedback(pressed),
            })}>
            <Feather name="share-2" size={18} color={p.emergency} />
            <Text variant="label" style={{ color: p.emergency, fontSize: 15 }}>
              {sharing ? 'Preparing…' : 'Share all with hospital desk'}
            </Text>
          </Pressable>

          <View style={{ backgroundColor: p.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md }}>
            <View style={{ flexDirection: 'row', backgroundColor: p.surfaceSunk, borderRadius: radius.pill, padding: 4 }}>
              {(['cashless', 'reimbursement'] as const).map((t) => (
                <Pressable
                  key={t}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === t }}
                  onPress={() => setTab(t)}
                  style={{ flex: 1, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === t ? p.primary : 'transparent' }}>
                  <Text variant="label" tone={tab === t ? 'onPrimary' : 'soft'}>
                    {t === 'cashless' ? 'Cashless steps' : 'Claim papers'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {steps.map((s, i) => (
              <View key={s} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: p.dangerWash, alignItems: 'center', justifyContent: 'center' }}>
                  <Text variant="caption" style={{ fontWeight: '700', fontSize: 11, color: p.danger }}>
                    {i + 1}
                  </Text>
                </View>
                <Text variant="body" style={{ flex: 1, fontSize: 13, lineHeight: 20 }}>
                  {s}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="caption" tone="faint" style={{ fontSize: 11 }}>
        {label}
      </Text>
      <Text variant="label" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
