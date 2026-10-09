import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { success } from '@/components/haptics';
import { Button, Centered, HeroCard, Notice, Screen, Skeleton, Text } from '@/components/ui';
import { callApi, type InvitePreview } from '@/services/api';
import { space, usePalette } from '@/theme/tokens';

const COPY = {
  en: {
    title: (inviter: string) => `${inviter} invited you`,
    subtitle: (family: string) => `to ${family} on Family CFO`,
    shareTitle: 'If you agree',
    points: ['Your family can see your policies, deposits and papers', 'No one can move money or change anything for you', 'You can stop sharing any time'],
    approve: 'Yes, share with my family',
    decline: 'No thanks',
    declined: 'Okay. Nothing has been shared.',
  },
  hi: {
    title: (inviter: string) => `${inviter} ने आपको बुलाया है`,
    subtitle: (family: string) => `Family CFO पर ${family} में`,
    shareTitle: 'अगर आप हाँ कहते हैं',
    points: ['परिवार आपकी पॉलिसी, FD और कागज़ देख सकेगा', 'कोई भी आपके पैसे नहीं निकाल सकता, न कुछ बदल सकता है', 'आप कभी भी शेयर करना बंद कर सकते हैं'],
    approve: 'हाँ, परिवार के साथ शेयर करें',
    decline: 'अभी नहीं',
    declined: 'ठीक है। कुछ भी शेयर नहीं हुआ।',
  },
};

/** The invitee's consent screen. Approval is recorded by the api function, never by the client. */
export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const p = usePalette();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    callApi<InvitePreview>('/invite/preview', { code }).then(setPreview, (e) => setError((e as Error).message));
  }, [code]);

  if (error && !preview) {
    return (
      <Centered>
        <Feather name="alert-circle" size={28} color={p.danger} />
        <Text variant="heading" style={{ textAlign: 'center' }}>
          {error}
        </Text>
        <Button label="Go back" kind="secondary" onPress={() => router.back()} />
      </Centered>
    );
  }
  if (!preview) {
    return (
      <Screen>
        <Skeleton height={150} round={28} />
        <Skeleton height={190} round={24} />
        <Skeleton height={50} round={99} />
      </Screen>
    );
  }

  const t = COPY[preview.language === 'hi' ? 'hi' : 'en'];

  async function act(kind: 'accept' | 'decline') {
    setBusy(kind);
    setError(null);
    try {
      await callApi(kind === 'accept' ? '/invite/accept' : '/invite/decline', { code });
      if (kind === 'accept') success();
      // On accept, the profile listener moves the app into the family automatically.
      if (kind === 'decline') setDeclined(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (declined) {
    return (
      <Centered>
        <Text variant="heading">{t.declined}</Text>
        <Button label="Done" kind="secondary" onPress={() => router.back()} />
      </Centered>
    );
  }

  return (
    <Screen
      footer={
        <View style={{ gap: space.sm }}>
          <Button label={t.approve} icon="check" onPress={() => act('accept')} loading={busy === 'accept'} disabled={!!busy} />
          <Button label={t.decline} kind="quiet" onPress={() => act('decline')} loading={busy === 'decline'} disabled={!!busy} />
        </View>
      }>
      <HeroCard tint="lime" icon="users" back title={t.title(preview.inviterName.split(' ')[0])} subtitle={t.subtitle(preview.householdName)} />
      <View style={{ backgroundColor: p.surface, borderRadius: 24, padding: 20, gap: space.md, boxShadow: p.shadow }}>
        <Text variant="heading" style={{ fontSize: 18 }}>
          {t.shareTitle}
        </Text>
        {t.points.map((point, i) => (
          <View key={point} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
            <Feather name={i === 0 ? 'eye' : i === 1 ? 'lock' : 'x-circle'} size={18} color={p.limeDeep} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 17, lineHeight: 25 }}>{point}</Text>
          </View>
        ))}
      </View>
      {error ? <Notice tone="danger">{error}</Notice> : null}
    </Screen>
  );
}
