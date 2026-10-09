import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { success } from '@/components/haptics';
import { useToast } from '@/components/toast';
import { Amount, Avatar, Button, EmptyState, Screen, SectionHeader, Text, pressFeedback } from '@/components/ui';
import { ITEM_TYPE_LABELS, formatRupees } from '@/lib/items';
import { canEdit } from '@/lib/permissions';
import { KIND_LABELS, bucketOf, relativeDay, timeline, todayInIndia, type Bucket, type TimelineEntry } from '@/lib/timeline';
import { useAuth } from '@/providers/auth-provider';
import { useHousehold } from '@/providers/household-provider';
import { markPaid, snooze, undoMarkPaid, unsnooze } from '@/services/items';
import { radius, space, type, usePalette } from '@/theme/tokens';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SECTIONS: { bucket: Bucket; title: string }[] = [
  { bucket: 'overdue', title: 'Overdue' },
  { bucket: 'soon', title: 'Next 30 days' },
  { bucket: 'later', title: 'Later' },
];

export default function TimelineScreen() {
  const { user } = useAuth();
  const { household, members, items, role, refresh } = useHousehold();
  const p = usePalette();
  const toast = useToast();
  const today = todayInIndia();
  const entries = timeline(items, members, today);
  const soonTotal = entries.filter((e) => bucketOf(e) === 'soon' && e.kind !== 'maturity').reduce((n, e) => n + (e.amount ?? 0), 0);
  const soonCount = entries.filter((e) => bucketOf(e) !== 'later').length;

  return (
    <Screen edges={['top']} onRefresh={refresh}>
      <View>
        <Text variant="overline" tone="faint">
          Timeline and alerts
        </Text>
        <Text variant="title" style={{ fontSize: 26, lineHeight: 31 }}>
          What’s coming up
        </Text>
      </View>

      <View style={{ backgroundColor: p.bar, borderRadius: radius.xl, padding: space.lg, flexDirection: 'row', gap: space.lg }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="overline" style={{ color: p.amber }}>
            Next 30 days
          </Text>
          <Amount value={soonTotal > 0 ? formatRupees(soonTotal) : '₹0'} size={28} color={p.onBar} />
          <Text variant="caption" style={{ color: p.onBar, opacity: 0.6 }}>
            in premiums and EMIs
          </Text>
        </View>
        <View style={{ width: 1, backgroundColor: p.inkSoft, opacity: 0.4 }} />
        <View style={{ justifyContent: 'center', alignItems: 'center', minWidth: 72 }}>
          <Text variant="display" style={[type.number, { color: p.onBar, fontSize: 26, lineHeight: 30 }]}>
            {soonCount}
          </Text>
          <Text variant="caption" style={{ color: p.onBar, opacity: 0.6 }}>
            {soonCount === 1 ? 'reminder' : 'reminders'}
          </Text>
        </View>
      </View>

      {entries.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="Your calendar is clear"
          body="Confirm a policy or FD with a due date. It shows up here, with reminders before it’s due."
          action={canEdit(role) ? 'Add a document' : undefined}
          onAction={() => router.push('/upload')}
        />
      ) : (
        SECTIONS.map(({ bucket, title }) => {
          const list = entries.filter((e) => bucketOf(e) === bucket);
          if (list.length === 0) return null;
          return (
            <View key={bucket} style={{ gap: space.sm }}>
              <SectionHeader title={title} />
              {list.map((e) => (
                <Entry
                  key={e.key}
                  entry={e}
                  editable={canEdit(role)}
                  onPaid={async () => {
                    const item = items.find((i) => i.id === e.itemId);
                    if (!item || !household || !user || e.kind === 'maturity') return;
                    try {
                      const undo = await markPaid(household.id, item, e.kind, today, user.uid, e.ownerMemberId);
                      success();
                      toast({
                        message: `Marked paid${e.amount != null ? ` · ${formatRupees(e.amount)}` : ''}`,
                        actionLabel: undo ? 'Undo' : undefined,
                        onAction: undo ? () => undoMarkPaid(household.id, undo, user.uid).catch(() => Alert.alert('Couldn’t undo', 'Check your connection.')) : undefined,
                      });
                    } catch {
                      Alert.alert('Couldn’t update', 'Check your connection and try again.');
                    }
                  }}
                  onSnooze={async () => {
                    if (!household || !user) return;
                    try {
                      await snooze(household.id, e.itemId, today, 3, user.uid);
                      toast({ message: 'Snoozed for 3 days', actionLabel: 'Undo', onAction: () => unsnooze(household.id, e.itemId, user.uid) });
                    } catch {
                      Alert.alert('Couldn’t snooze', 'Check your connection and try again.');
                    }
                  }}
                />
              ))}
            </View>
          );
        })
      )}
    </Screen>
  );
}

function Entry({
  entry,
  editable,
  onPaid,
  onSnooze,
}: {
  entry: TimelineEntry;
  editable: boolean;
  onPaid: () => void;
  onSnooze: () => void;
}) {
  const { members, items } = useHousehold();
  const p = usePalette();
  const [busy, setBusy] = useState(false);
  const item = items.find((i) => i.id === entry.itemId);
  const about = members.find((m) => m.id === entry.memberId);
  const owner = members.find((m) => m.id === entry.ownerMemberId);
  const [, mm, dd] = entry.date.split('-');
  const overdue = entry.daysLeft < 0;
  const urgent = entry.daysLeft <= 7;
  const name = (m?: { name: string; relation: string }) => (!m ? '' : m.relation === 'self' ? 'You' : m.name.split(' ')[0]);

  const run = (fn: () => void | Promise<void>) => async () => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => item && router.push({ pathname: '/item/new', params: { itemId: item.id } })}
      style={({ pressed }) => ({
        backgroundColor: p.surface,
        borderRadius: radius.lg,
        padding: space.md,
        gap: space.md,
        boxShadow: p.shadow,
        opacity: entry.snoozed ? 0.6 : 1,
        ...pressFeedback(pressed),
      })}>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <View
          style={{
            width: 48,
            height: 52,
            borderRadius: radius.md,
            backgroundColor: overdue ? p.dangerWash : urgent ? p.amberWash : p.limeWash,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text variant="heading" style={[type.number, { lineHeight: 20 }]}>
            {Number(dd)}
          </Text>
          <Text variant="caption" style={{ fontSize: 11, fontWeight: '600' }} tone="soft">
            {MONTHS[Number(mm) - 1]}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label" style={{ fontSize: 14 }} numberOfLines={1}>
            {item?.provider ?? (item ? ITEM_TYPE_LABELS[item.type] : '')}
          </Text>
          <Text variant="caption" tone="soft" numberOfLines={1}>
            {KIND_LABELS[entry.kind]} · {name(about)}
            {entry.amount != null ? ` · ${formatRupees(entry.amount)}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text variant="caption" style={{ fontWeight: '600', color: overdue ? p.danger : urgent ? p.amberDeep : p.inkSoft }}>
            {entry.snoozed ? 'Snoozed' : relativeDay(entry.daysLeft)}
          </Text>
          {owner ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Avatar name={owner.name} size={18} />
              <Text variant="caption" tone="faint" style={{ fontSize: 11 }}>
                {name(owner)} {owner.relation === 'self' ? 'pay' : 'pays'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {editable && entry.kind !== 'maturity' && entry.daysLeft <= 30 ? (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button label="Mark paid" icon="check" onPress={run(onPaid)} loading={busy} style={{ flex: 1, minHeight: 38 }} />
          {!entry.snoozed ? (
            <Button label="Snooze 3 days" kind="secondary" onPress={run(onSnooze)} disabled={busy} style={{ flex: 1, minHeight: 38 }} />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
