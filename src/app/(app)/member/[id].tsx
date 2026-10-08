import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Linking, View } from 'react-native';

import { DocumentRow } from '@/components/document-row';
import { ConsentBadge } from '@/components/member-row';
import { SafetyStrip } from '@/components/safety-strip';
import { Button, Centered, Notice, Panel, Screen, Text } from '@/components/ui';
import { DOC_TYPE_LABELS, RELATION_LABELS } from '@/lib/catalog';
import { APP_DOWNLOAD_URL } from '@/lib/config';
import { canEdit } from '@/lib/permissions';
import { memberReadiness } from '@/lib/readiness';
import { useHousehold } from '@/providers/household-provider';
import { space } from '@/theme/tokens';

export default function MemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { members, documents, role, household } = useHousehold();
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
  const editable = canEdit(role);
  const firstName = member.relation === 'self' ? 'you' : member.name.split(' ')[0];

  function inviteOnWhatsApp() {
    const text =
      member!.language === 'hi'
        ? `नमस्ते! मैंने ${household?.name ?? 'हमारे परिवार'} के लिए Family CFO पर आपकी पॉलिसी और ज़रूरी कागज़ एक जगह रखना शुरू किया है। आपकी अनुमति से ही आपकी जानकारी जुड़ेगी। ऐप यहाँ से डाउनलोड करें: ${APP_DOWNLOAD_URL}`
        : `Hi! I've started keeping our family's policies and papers in one place on Family CFO (${household?.name ?? 'our family'}). Your details are only added with your permission. Get the app: ${APP_DOWNLOAD_URL}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  }

  return (
    <>
      <Stack.Screen options={{ title: member.relation === 'self' ? 'You' : member.name }} />
      <Screen edges={['bottom']}>
        <View style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Text variant="title" style={{ flexShrink: 1 }}>
              {member.name}
            </Text>
            <ConsentBadge member={member} />
          </View>
          <Text tone="soft">
            {RELATION_LABELS[member.relation]}
            {member.city ? ` · ${member.city}` : ''}
          </Text>
        </View>

        <Panel>
          <Text variant="heading">Essentials</Text>
          <SafetyStrip present={readiness.present} />
          {readiness.missing.length > 0 ? (
            <View style={{ gap: space.sm }}>
              {readiness.missing.map((t) => (
                <View key={t} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text tone="soft">Missing: {DOC_TYPE_LABELS[t].toLowerCase()}</Text>
                  {editable ? (
                    <Button
                      label="Add"
                      kind="quiet"
                      style={{ minHeight: 36 }}
                      onPress={() => router.push({ pathname: '/upload', params: { memberId: member.id, docType: t } })}
                    />
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <Text tone="soft">All essentials are in the vault for {firstName}.</Text>
          )}
        </Panel>

        {member.consentStatus === 'pending' ? (
          <View style={{ gap: space.sm }}>
            <Notice tone="due">
              {member.name.split(' ')[0]} hasn’t joined yet. You can keep their papers here, but bank and investment
              details will only be connected once they approve it themselves.
            </Notice>
            <Button label={`Invite ${member.name.split(' ')[0]} on WhatsApp`} kind="secondary" onPress={inviteOnWhatsApp} />
          </View>
        ) : null}

        <View style={{ gap: space.sm }}>
          <Text variant="heading">Documents</Text>
          {own.length === 0 ? (
            <Text tone="soft">No documents for {firstName} yet.</Text>
          ) : (
            own.map((d) => <DocumentRow key={d.id} document={d} />)
          )}
          {editable ? (
            <Button
              label="Add a document"
              onPress={() => router.push({ pathname: '/upload', params: { memberId: member.id } })}
            />
          ) : null}
        </View>
      </Screen>
    </>
  );
}
