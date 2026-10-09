import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';

import { Avatar, BackButton, Centered, Screen, Text, pressFeedback } from '@/components/ui';
import { telUrl } from '@/lib/emergency';
import { formatCompactRupees, formatDate } from '@/lib/items';
import { parentCopy } from '@/lib/parent-copy';
import { memberReadiness } from '@/lib/readiness';
import { timeline, todayInIndia } from '@/lib/timeline';
import type { Language } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { useHousehold } from '@/providers/household-provider';
import { callApi } from '@/services/api';
import { signOut } from '@/services/auth';
import { radius, space, type, usePalette } from '@/theme/tokens';

/** Large, read-only parent screen. 20pt+ type, Hindi by default, one big call button. */
const BIG = { fontSize: 20, lineHeight: 28 };

export default function ParentView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { household, members, items, documents } = useHousehold();
  const p = usePalette();
  const member = members.find((m) => m.id === id);
  const [language, setLanguage] = useState<Language>(member?.language ?? 'hi');

  if (!member) {
    return (
      <Centered>
        <Text variant="heading">This person isn’t in the family any more</Text>
      </Centered>
    );
  }

  const t = parentCopy(language);
  const isParent = member.uid === user?.uid;
  const child = members.find((m) => m.relation === 'self');
  const today = todayInIndia();
  const health = items.filter((i) => i.memberId === member.id && i.type === 'health_policy');
  const upcoming = timeline(items, members, today).filter((e) => e.memberId === member.id && e.daysLeft >= 0 && e.daysLeft <= 60).slice(0, 4);
  const readiness = memberReadiness(member, documents);
  const firstName = member.name.split(' ')[0];

  function stopSharing() {
    Alert.alert(
      language === 'hi' ? 'शेयर करना बंद करें?' : 'Stop sharing?',
      language === 'hi' ? 'आपका परिवार आपकी जानकारी नहीं देख पाएगा।' : 'Your family will no longer see your details.',
      [
        { text: language === 'hi' ? 'रहने दें' : 'Cancel', style: 'cancel' },
        {
          text: language === 'hi' ? 'बंद करें' : 'Stop sharing',
          style: 'destructive',
          onPress: () => callApi('/leave', { householdId: household?.id }).then(signOut, (e) => Alert.alert((e as Error).message)),
        },
      ],
    );
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        {!isParent ? <BackButton /> : null}
        <Avatar name={member.name} size={52} />
        <View style={{ flex: 1 }}>
          <Text variant="title" style={{ fontSize: 24, lineHeight: 30 }} numberOfLines={1}>
            {t.greeting(firstName)}
          </Text>
          <Text variant="caption" tone="soft" style={{ fontSize: 14 }}>
            {t.readOnly}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setLanguage(language === 'hi' ? 'en' : 'hi')}
        style={{ alignSelf: 'flex-start', minHeight: 56, justifyContent: 'center', paddingHorizontal: 20, borderRadius: radius.pill, backgroundColor: p.surface, borderWidth: 1, borderColor: p.line }}>
        <Text variant="label" style={{ fontSize: 15 }}>
          {t.switchLang}
        </Text>
      </Pressable>

      {!isParent ? (
        <View style={{ backgroundColor: p.limeWash, borderRadius: radius.md, padding: space.md }}>
          <Text variant="caption">This is what {firstName} sees. They can only view.</Text>
        </View>
      ) : null}

      <Card icon="heart" tint={p.lime} title={t.yourCover}>
        {health.length === 0 ? (
          <Text style={BIG} tone="soft">
            {t.noCover}
          </Text>
        ) : (
          health.map((h) => (
            <View key={h.id} style={{ gap: space.sm }}>
              <Text style={[BIG, { fontWeight: '700' }]}>{h.provider ?? '—'}</Text>
              {h.amount ? <Text style={BIG}>{t.coverUpTo(formatCompactRupees(h.amount))}</Text> : null}
              {h.dueDate ? (
                <Text style={BIG} tone="soft">
                  {t.renews(formatDate(h.dueDate))}
                </Text>
              ) : null}
              {h.helpline ? (
                <BigButton icon="phone" label={`${t.helpline}: ${h.helpline}`} onPress={() => Linking.openURL(telUrl(h.helpline!))} kind="light" />
              ) : null}
            </View>
          ))
        )}
      </Card>

      <Card icon="calendar" tint={p.amber} title={t.nextPayments}>
        {upcoming.length === 0 ? (
          <Text style={BIG} tone="soft">
            {t.noPayments}
          </Text>
        ) : (
          upcoming.map((e) => {
            const item = items.find((i) => i.id === e.itemId);
            return (
              <View key={e.key} style={{ gap: 2 }}>
                <Text style={[BIG, { fontWeight: '700' }]}>
                  {item?.provider ?? '—'}
                  {e.amount != null ? ` · ₹${new Intl.NumberFormat('en-IN').format(e.amount)}` : ''}
                </Text>
                <Text style={BIG} tone="soft">
                  {t.dueOn(formatDate(e.date))}
                </Text>
              </View>
            );
          })
        )}
      </Card>

      <Card icon="folder" tint={p.limeSoft} title={t.papers}>
        <Text style={BIG} tone="soft">
          {t.papersSafe(readiness.documentCount)}
        </Text>
        {([
          ['health_policy', t.docHealth],
          ['term_policy', t.docTerm],
          ['id_document', t.docId],
        ] as const).map(([docType, label]) => {
          const ok = readiness.present.includes(docType);
          return (
            <View key={docType} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Feather name={ok ? 'check-circle' : 'circle'} size={22} color={ok ? p.limeDeep : p.inkFaint} />
              <Text style={[BIG, { flex: 1 }]}>{label}</Text>
              <Text style={{ fontSize: 16 }} tone={ok ? 'soft' : 'faint'}>
                {ok ? t.present : t.missing}
              </Text>
            </View>
          );
        })}
      </Card>

      {child?.phone && isParent ? (
        <BigButton icon="phone-call" label={t.call(child.name.split(' ')[0])} onPress={() => Linking.openURL(telUrl(child.phone!))} kind="dark" />
      ) : null}

      <BigButton icon="alert-octagon" label={t.emergency} onPress={() => router.push({ pathname: '/emergency', params: { memberId: member.id } })} kind="emergency" />

      {isParent ? (
        <Pressable accessibilityRole="button" onPress={stopSharing} style={{ alignSelf: 'center', minHeight: 56, justifyContent: 'center', paddingHorizontal: space.lg }}>
          <Text variant="label" tone="faint" style={{ fontSize: 15 }}>
            {language === 'hi' ? 'परिवार के साथ शेयर करना बंद करें' : 'Stop sharing with family'}
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function Card({ icon, tint, title, children }: { icon: 'heart' | 'calendar' | 'folder'; tint: string; title: string; children: ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ backgroundColor: p.surface, borderRadius: radius.xl, padding: 20, gap: space.md, boxShadow: p.shadow }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon} size={20} color={p.onTint} />
        </View>
        <Text variant="title" style={{ fontSize: 22, lineHeight: 28, flex: 1 }}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function BigButton({ icon, label, onPress, kind }: { icon: 'phone' | 'phone-call' | 'alert-octagon'; label: string; onPress: () => void; kind: 'dark' | 'light' | 'emergency' }) {
  const p = usePalette();
  const bg = kind === 'dark' ? p.bar : kind === 'emergency' ? p.emergency : p.limeWash;
  const fg = kind === 'light' ? p.ink : p.onBar;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 68,
        borderRadius: radius.xl,
        backgroundColor: bg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.md,
        paddingHorizontal: space.lg,
        ...pressFeedback(pressed),
      })}>
      <Feather name={icon} size={24} color={fg} />
      <Text style={[type.heading, { color: fg, fontSize: 20, lineHeight: 26, flexShrink: 1 }]}>{label}</Text>
    </Pressable>
  );
}
