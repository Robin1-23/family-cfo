import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { RELATION_LABELS } from '@/lib/catalog';
import type { MemberReadiness } from '@/lib/readiness';
import type { Member } from '@/lib/types';
import { radius, space, usePalette } from '@/theme/tokens';
import { SafetyStrip } from './safety-strip';
import { Avatar, Text, pressFeedback } from './ui';

export function ConsentBadge({ member }: { member: Member }) {
  const p = usePalette();
  if (member.consentStatus === 'self' || member.consentStatus === 'granted') return null;
  const declined = member.consentStatus === 'declined';
  return (
    <View
      style={{
        backgroundColor: declined ? p.dangerWash : p.dueWash,
        borderRadius: radius.pill,
        paddingHorizontal: space.sm,
        paddingVertical: 3,
      }}>
      <Text variant="caption" style={{ fontSize: 11, fontWeight: '600' }}>{declined ? 'Declined to join' : 'Not joined yet'}</Text>
    </View>
  );
}

export function MemberRow({ member, readiness }: { member: Member; readiness: MemberReadiness }) {
  const p = usePalette();
  return (
    <Link href={{ pathname: '/member/[id]', params: { id: member.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => ({
          backgroundColor: p.surface,
          borderRadius: radius.lg,
          padding: space.lg,
          gap: space.md,
          boxShadow: p.shadow,
          ...pressFeedback(pressed),
        })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Avatar name={member.name} size={40} />
          <View style={{ flex: 1 }}>
            <Text variant="label" style={{ fontSize: 14 }} numberOfLines={1}>
              {member.name}
            </Text>
            <Text variant="caption" tone="faint" numberOfLines={1}>
              {RELATION_LABELS[member.relation]} · {readiness.documentCount}{' '}
              {readiness.documentCount === 1 ? 'document' : 'documents'}
            </Text>
          </View>
          <ConsentBadge member={member} />
        </View>
        <SafetyStrip present={readiness.present} compact />
      </Pressable>
    </Link>
  );
}
