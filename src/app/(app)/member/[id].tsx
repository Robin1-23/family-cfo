import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, Text as RNText, View } from 'react-native';

import { DocumentRow } from '@/components/document-row';
import { ConsentBadge } from '@/components/member-row';
import { Avatar, Button, Centered, IconTile, Panel, Screen, Text } from '@/components/ui';
import { DOC_TYPE_LABELS, ESSENTIAL_DOC_TYPES, RELATION_LABELS } from '@/lib/catalog';
import { APP_DOWNLOAD_URL } from '@/lib/config';
import { ITEM_TYPE_LABELS, formatCompactRupees, formatDate, formatRupees } from '@/lib/items';
import { canEdit } from '@/lib/permissions';
import { memberReadiness } from '@/lib/readiness';
import type { ItemType } from '@/lib/types';
import { useHousehold } from '@/providers/household-provider';
import { radius, space, type, usePalette } from '@/theme/tokens';

const COVER_TYPES = new Set<ItemType>(['health_policy', 'term_policy', 'life_policy', 'critical_illness_policy', 'accident_policy']);
const SHORT: Record<string, string> = { health_policy: 'Health', term_policy: 'Term', id_document: 'ID' };

export default function MemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { members, documents, items, role, household } = useHousehold();
  const p = usePalette();
  const member = members.find((m) => m.id === id);

  if (!member) {
    return (
      <Centered>
        <Text variant="heading">This person isn’t in your family any more</Text>
        <Button label="Back to family" kind="secondary" onPress={() => router.back()} />
      </Centered>
    );
  }

  const readiness = memberReadiness(member, documents);
  const own = documents.filter((d) => d.memberId === member.id);
  const ownItems = items.filter((i) => i.memberId === member.id);
  const cover = ownItems.filter((i) => COVER_TYPES.has(i.type)).reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const editable = canEdit(role);
  const isSelf = member.relation === 'self';
  const firstName = isSelf ? 'you' : member.name.split(' ')[0];

  function inviteOnWhatsApp() {
    const text =
      member!.language === 'hi'
        ? `नमस्ते! मैंने ${household?.name ?? 'हमारे परिवार'} के लिए Family CFO पर आपकी पॉलिसी और ज़रूरी कागज़ एक जगह रखना शुरू किया है। आपकी अनुमति से ही आपकी जानकारी जुड़ेगी। ऐप यहाँ से डाउनलोड करें: ${APP_DOWNLOAD_URL}`
        : `Hi! I've started keeping our family's policies and papers in one place on Family CFO (${household?.name ?? 'our family'}). Your details are only added with your permission. Get the app: ${APP_DOWNLOAD_URL}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            borderWidth: 1,
            borderColor: p.line,
            backgroundColor: p.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Feather name="chevron-left" size={22} color={p.ink} />
        </Pressable>
        <Avatar name={member.name} size={52} />
        <View style={{ flex: 1 }}>
          <Text variant="heading" numberOfLines={1}>
            {member.name}
          </Text>
          <Text variant="caption" tone="soft" numberOfLines={1}>
            {RELATION_LABELS[member.relation]}
            {member.city ? ` · ${member.city}` : ''}
          </Text>
        </View>
        <ConsentBadge member={member} />
      </View>

      <View
        style={{
          backgroundColor: p.peachWash,
          borderWidth: 1.5,
          borderColor: p.peach,
          borderRadius: 32,
          padding: space.lg + 2,
          gap: space.lg,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconTile name="bar-chart-2" bg={p.bar} color={p.onBar} />
          <Text variant="caption" style={{ color: p.onTint }}>
            {readiness.present.length} of {ESSENTIAL_DOC_TYPES.length} essentials in the vault
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Stat value={String(ownItems.length)} label={ownItems.length === 1 ? 'policy' : 'policies'} />
          <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: p.peach, marginHorizontal: space.lg }} />
          <Stat value={cover > 0 ? formatCompactRupees(cover) : '—'} label="cover" />
        </View>

        <View style={{ flexDirection: 'row', gap: space.lg, justifyContent: 'center' }}>
          {ESSENTIAL_DOC_TYPES.map((t) => {
            const ok = readiness.present.includes(t);
            return (
              <View key={t} style={{ alignItems: 'center', gap: space.sm }}>
                <View style={{ width: 56, height: 120, justifyContent: 'flex-end' }}>
                  <View
                    style={{
                      height: ok ? 120 : 52,
                      borderRadius: radius.pill,
                      backgroundColor: ok ? p.peachDeep : 'transparent',
                      borderWidth: ok ? 0 : 1.5,
                      borderStyle: 'dashed',
                      borderColor: p.peachDeep,
                      alignItems: 'center',
                      paddingTop: space.md,
                    }}>
                    <Feather name={ok ? 'check' : 'plus'} size={18} color={ok ? p.onBar : p.peachDeep} />
                  </View>
                </View>
                <Text variant="caption" style={{ color: p.onTint }}>
                  {SHORT[t]}
                </Text>
              </View>
            );
          })}
        </View>

        {editable && readiness.missing.length > 0 ? (
          <Button
            label={`Add ${firstName === 'you' ? 'your' : `${firstName}’s`} ${DOC_TYPE_LABELS[readiness.missing[0]].toLowerCase()}`}
            onPress={() => router.push({ pathname: '/upload', params: { memberId: member.id, docType: readiness.missing[0] } })}
          />
        ) : null}
      </View>

      {member.consentStatus === 'pending' ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            backgroundColor: p.surfaceSunk,
            borderRadius: radius.pill,
            padding: space.sm,
            paddingRight: space.md,
          }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: p.peach, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="message-circle" size={20} color={p.onTint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label">{member.name.split(' ')[0]} hasn’t joined yet</Text>
            <Text variant="caption" tone="soft">
              Bank details connect only after they approve.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={inviteOnWhatsApp}
            style={{ backgroundColor: p.primary, borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: space.sm }}>
            <Text variant="label" tone="onPrimary">
              Invite
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ gap: space.md }}>
        <Text variant="title">Policies and deposits</Text>
        {ownItems.length === 0 ? (
          <Text tone="soft">Nothing confirmed for {firstName} yet. Add a document, or enter the details by hand.</Text>
        ) : (
          ownItems.map((i) => (
            <Panel key={i.id} style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <IconTile
                  name={COVER_TYPES.has(i.type) ? 'shield' : 'trending-up'}
                  bg={COVER_TYPES.has(i.type) ? p.lavenderWash : p.peachWash}
                  color={COVER_TYPES.has(i.type) ? p.lavenderDeep : p.peachDeep}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="label" numberOfLines={1}>
                    {ITEM_TYPE_LABELS[i.type]}
                    {i.numberLast4 ? ` ••••${i.numberLast4}` : ''}
                  </Text>
                  <Text variant="caption" tone="soft" numberOfLines={1}>
                    {i.provider ?? 'Provider not added'}
                  </Text>
                </View>
                {i.amount != null ? (
                  <Text variant="heading" style={type.number}>
                    {formatCompactRupees(i.amount)}
                  </Text>
                ) : null}
              </View>
              <Text variant="caption" tone="soft" style={type.number}>
                {[
                  i.premium != null && `Premium ${formatRupees(i.premium)}`,
                  i.dueDate && `Due ${formatDate(i.dueDate)}`,
                  i.maturityDate && `Matures ${formatDate(i.maturityDate)}`,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'No dates yet'}
              </Text>
              <Text variant="caption" tone={i.nominee ? 'faint' : 'danger'}>
                {i.nominee ? `Nominee: ${i.nominee}` : 'No nominee recorded'}
              </Text>
            </Panel>
          ))
        )}
        {editable ? (
          <Button
            label="Add details by hand"
            kind="secondary"
            onPress={() => router.push({ pathname: '/item/new', params: { memberId: member.id } })}
          />
        ) : null}
      </View>

      <View style={{ gap: space.md }}>
        <Text variant="title">Documents</Text>
        {own.length === 0 ? (
          <Text tone="soft">No documents for {firstName} yet.</Text>
        ) : (
          own.map((d) => <DocumentRow key={d.id} document={d} editable={editable} />)
        )}
        {editable ? (
          <Button label="Add a document" onPress={() => router.push({ pathname: '/upload', params: { memberId: member.id } })} />
        ) : null}
      </View>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flex: 1 }}>
      <RNText style={[type.display, type.number, { color: p.onTint }]}>{value}</RNText>
      <RNText style={[type.heading, { color: p.onTint, fontWeight: '500' }]}>{label}</RNText>
    </View>
  );
}
