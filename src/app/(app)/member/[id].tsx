import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ActivityIndicator, Linking, Pressable, View } from 'react-native';

import { DocumentRow } from '@/components/document-row';
import { ConsentBadge } from '@/components/member-row';
import { success } from '@/components/haptics';
import { useToast } from '@/components/toast';
import { Amount, Avatar, BackButton, Button, Centered, GradientFill, IconTile, Screen, SectionHeader, Text, memberStatus, pressFeedback } from '@/components/ui';
import { DOC_TYPE_LABELS, ESSENTIAL_DOC_TYPES, RELATION_LABELS } from '@/lib/catalog';
import { APP_DOWNLOAD_URL } from '@/lib/config';
import { ITEM_TYPE_LABELS, formatCompactRupees, formatDate, formatRupees } from '@/lib/items';
import { canEdit } from '@/lib/permissions';
import { memberReadiness } from '@/lib/readiness';
import type { ItemType } from '@/lib/types';
import { useHousehold } from '@/providers/household-provider';
import { callApi } from '@/services/api';
import { radius, space, type, usePalette } from '@/theme/tokens';

const COVER_TYPES = new Set<ItemType>(['health_policy', 'term_policy', 'life_policy', 'critical_illness_policy', 'accident_policy']);
const SHORT: Record<string, string> = { health_policy: 'Health', term_policy: 'Term', id_document: 'ID' };

export default function MemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { members, documents, items, role, household } = useHousehold();
  const p = usePalette();
  const member = members.find((m) => m.id === id);
  const [inviting, setInviting] = useState(false);
  const toast = useToast();

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

  /** Creates a one-time code tied to their number, then opens WhatsApp to them with it. */
  async function inviteOnWhatsApp() {
    if (!member!.phone) {
      Alert.alert('Add their number first', 'The invite only works for their own phone, so nobody else can accept it.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add number', onPress: () => router.push({ pathname: '/member/add', params: { id: member!.id } }) },
      ]);
      return;
    }
    setInviting(true);
    try {
      const { code } = await callApi<{ code: string }>('/invite/create', { householdId: household?.id, memberId: member!.id });
      const link = `familycfo://join/${code}`;
      const text =
        member!.language === 'hi'
          ? `नमस्ते! मैंने Family CFO पर ${household?.name ?? 'हमारे परिवार'} के लिए आपकी पॉलिसी और ज़रूरी कागज़ एक जगह रखे हैं। आपकी अनुमति से ही आपकी जानकारी दिखेगी।\n\n1. ऐप डाउनलोड करें: ${APP_DOWNLOAD_URL}\n2. अपने नंबर से साइन इन करें\n3. यह कोड डालें: ${code}\n\n(या यहाँ दबाएँ: ${link})`
          : `Hi! I've put our family's policies and papers in one place on Family CFO (${household?.name ?? 'our family'}). Your details are only shown with your permission.\n\n1. Get the app: ${APP_DOWNLOAD_URL}\n2. Sign in with your number\n3. Enter this code: ${code}\n\n(or tap: ${link})`;
      await Linking.openURL(`https://wa.me/${member!.phone.replace('+', '')}?text=${encodeURIComponent(text)}`);
      success();
      toast({ message: `Invite code ${code} ready to send` });
    } catch (e) {
      Alert.alert('Couldn’t create the invite', (e as Error).message);
    } finally {
      setInviting(false);
    }
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <BackButton />
        <Avatar name={member.name} size={42} status={memberStatus(member)} />
        <View style={{ flex: 1 }}>
          <Text variant="heading" numberOfLines={1}>
            {member.name}
          </Text>
          <Text variant="caption" tone="faint" numberOfLines={1}>
            {RELATION_LABELS[member.relation]}
            {member.city ? ` · ${member.city}` : ''}
          </Text>
        </View>
        <ConsentBadge member={member} />
        {editable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${member.name}`}
            onPress={() => router.push({ pathname: '/member/add', params: { id: member.id } })}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: p.line,
              backgroundColor: p.surface,
              alignItems: 'center',
              justifyContent: 'center',
              ...pressFeedback(pressed),
            })}>
            <Feather name="edit-2" size={15} color={p.ink} />
          </Pressable>
        ) : null}
      </View>

      <View
        style={{
          backgroundColor: p.lime,
          borderRadius: radius.xl,
          padding: space.lg,
          gap: space.lg,
          overflow: 'hidden',
        }}>
        <GradientFill tint="lime" />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconTile name="bar-chart-2" bg={p.bar} color={p.lime} size={32} />
          <Text variant="overline" style={{ color: p.onTint, opacity: 0.7 }}>
            {readiness.present.length} of {ESSENTIAL_DOC_TYPES.length} essentials in the vault
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Stat value={String(ownItems.length)} label={ownItems.length === 1 ? 'policy' : 'policies'} />
          <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: p.onTint, opacity: 0.2, marginHorizontal: space.lg }} />
          <Stat value={cover > 0 ? formatCompactRupees(cover) : '—'} label="cover" />
        </View>

        <View style={{ flexDirection: 'row', gap: space.lg, justifyContent: 'center' }}>
          {ESSENTIAL_DOC_TYPES.map((t) => {
            const ok = readiness.present.includes(t);
            return (
              <View key={t} style={{ alignItems: 'center', gap: space.sm }}>
                <View style={{ width: 44, height: 92, justifyContent: 'flex-end' }}>
                  <View
                    style={{
                      height: ok ? 92 : 40,
                      borderRadius: radius.pill,
                      backgroundColor: ok ? p.bar : 'transparent',
                      borderWidth: ok ? 0 : 1.5,
                      borderStyle: 'dashed',
                      borderColor: p.bar,
                      alignItems: 'center',
                      paddingTop: 10,
                    }}>
                    <Feather name={ok ? 'check' : 'plus'} size={15} color={ok ? p.lime : p.bar} />
                  </View>
                </View>
                <Text variant="caption" style={{ color: p.onTint, fontWeight: '600' }}>
                  {SHORT[t]}
                </Text>
              </View>
            );
          })}
        </View>

        {editable && readiness.missing.length > 0 ? (
          <Button
            kind="dark"
            icon="plus"
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
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: p.amber, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="message-circle" size={17} color={p.onTint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label">{member.name.split(' ')[0]} hasn’t joined yet</Text>
            <Text variant="caption" tone="faint" numberOfLines={1}>
              Invite them to approve their details
            </Text>
          </View>
          {editable ? (
            <Pressable
              accessibilityRole="button"
              disabled={inviting}
              onPress={inviteOnWhatsApp}
              style={{ backgroundColor: p.primary, borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: space.sm, minWidth: 74, alignItems: 'center' }}>
              {inviting ? (
                <ActivityIndicator size="small" color={p.primaryInk} />
              ) : (
                <Text variant="label" tone="onPrimary">
                  Invite
                </Text>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {!isSelf ? (
          <Button
            label="See their view"
            kind="secondary"
            icon="eye"
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/parent/[id]', params: { id: member.id } })}
          />
        ) : null}
        <Button
          label="Emergency"
          kind="secondary"
          icon="alert-octagon"
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/emergency', params: { memberId: member.id } })}
        />
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader
          title="Policies and deposits"
          action={editable ? 'Add by hand' : undefined}
          onAction={editable ? () => router.push({ pathname: '/item/new', params: { memberId: member.id } }) : undefined}
        />
        {ownItems.length === 0 ? (
          <Text variant="caption" tone="soft">
            Nothing confirmed yet. Add a document to get started.
          </Text>
        ) : (
          ownItems.map((i) => (
            <Pressable
              key={i.id}
              accessibilityRole="button"
              disabled={!editable}
              onPress={() => router.push({ pathname: '/item/new', params: { itemId: i.id } })}
              style={({ pressed }) => ({
                backgroundColor: p.surface,
                borderRadius: radius.lg,
                gap: space.sm,
                padding: space.md,
                boxShadow: p.shadow,
                ...pressFeedback(pressed),
              })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <IconTile
                  size={34}
                  name={COVER_TYPES.has(i.type) ? 'shield' : 'trending-up'}
                  bg={COVER_TYPES.has(i.type) ? p.limeWash : p.amberWash}
                  color={COVER_TYPES.has(i.type) ? p.limeDeep : p.amberDeep}
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
                  <Text variant="heading" style={[type.number, { fontSize: 15 }]}>
                    {formatCompactRupees(i.amount)}
                  </Text>
                ) : null}
              </View>
              <Text variant="caption" tone="soft" style={type.number}>
                {[
                  i.premium != null && `${i.type === 'loan' ? 'EMI' : 'Premium'} ${formatRupees(i.premium)}`,
                  i.dueDate && `Due ${formatDate(i.dueDate)}`,
                  i.maturityDate && `Matures ${formatDate(i.maturityDate)}`,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'No dates yet'}
              </Text>
              <Text variant="caption" tone={i.nominee ? 'faint' : 'danger'}>
                {i.nominee ? `Nominee: ${i.nominee}` : i.type === 'loan' ? 'Loan' : 'No nominee recorded'}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Documents" />
        {own.length === 0 ? (
          <Text variant="caption" tone="soft">
            No documents for {firstName} yet.
          </Text>
        ) : (
          own.map((d) => <DocumentRow key={d.id} document={d} editable={editable} householdId={household?.id} />)
        )}
        {editable ? (
          <Button label="Add a document" icon="upload" onPress={() => router.push({ pathname: '/upload', params: { memberId: member.id } })} />
        ) : null}
      </View>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flex: 1 }}>
      <Amount value={value} size={26} color={p.onTint} />
      <Text variant="caption" style={{ color: p.onTint, opacity: 0.75 }}>
        {label}
      </Text>
    </View>
  );
}
