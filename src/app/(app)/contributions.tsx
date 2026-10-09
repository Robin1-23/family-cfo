import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { success } from '@/components/haptics';
import { useToast } from '@/components/toast';
import { Avatar, Button, ChipGroup, EmptyState, Field, HeroCard, Notice, Screen, SectionHeader, SkeletonList, Text, pressFeedback } from '@/components/ui';
import { formatDate, formatRupees, parseDate, parseRupees } from '@/lib/items';
import { canEdit } from '@/lib/permissions';
import { todayInIndia } from '@/lib/timeline';
import { contributionShares, financialYear } from '@/lib/tools';
import type { LedgerEntry } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { useHousehold } from '@/providers/household-provider';
import { addLedgerEntry, deleteLedgerEntry, subscribeLedger } from '@/services/items';
import { radius, space, type, usePalette } from '@/theme/tokens';

/** V2 "Shared contributions": siblings split family bills and see who paid what. */
export default function ContributionsScreen() {
  const { user } = useAuth();
  const { household, members, items, role } = useHousehold();
  const p = usePalette();
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [payer, setPayer] = useState<string | null>(members.find((m) => m.relation === 'self')?.id ?? null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const today = todayInIndia();
  const fy = financialYear(today);
  const editable = canEdit(role);
  const householdId = household?.id;

  useEffect(() => {
    if (!householdId) return;
    return subscribeLedger(householdId, setEntries, () => setEntries([]));
  }, [householdId]);

  const { total, shares } = contributionShares(entries ?? [], members, fy);
  const name = (id: string) => {
    const m = members.find((x) => x.id === id);
    return !m ? 'Removed' : m.relation === 'self' ? 'You' : m.name.split(' ')[0];
  };

  async function save() {
    const n = parseRupees(amount);
    const d = date.trim() ? parseDate(date) : today;
    if (!payer) return setError('Choose who paid.');
    if (!n || n <= 0) return setError('Enter an amount in rupees, like 18,400.');
    if (!d) return setError('Enter a date as DD/MM/YYYY.');
    setError(null);
    try {
      await addLedgerEntry(household!.id, { payerMemberId: payer, itemId: null, amount: n, date: d, note: note.trim().slice(0, 80) || null, createdBy: user!.uid });
      success();
      toast({ message: `${formatRupees(n)} added` });
      setAdding(false);
      setAmount('');
      setDate('');
      setNote('');
    } catch {
      setError('Couldn’t save. Check your connection and try again.');
    }
  }

  return (
    <Screen>
      <HeroCard tint="lime" icon="users" back eyebrow={`Financial year ${fy}`} title={total ? formatRupees(total) : '₹0'} subtitle="Spent on the family, and who paid it." />

      {shares.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionHeader title="Who paid" />
          {shares.map((s) => (
            <View key={s.memberId} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: p.surface, borderRadius: radius.lg, padding: space.md }}>
              <Avatar name={members.find((m) => m.id === s.memberId)?.name ?? '?'} size={38} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="label" style={{ fontSize: 14 }}>
                    {name(s.memberId)}
                  </Text>
                  <Text variant="label" style={type.number}>
                    {formatRupees(s.paid)}
                  </Text>
                </View>
                <View style={{ height: 6, borderRadius: radius.pill, backgroundColor: p.surfaceSunk, overflow: 'hidden' }}>
                  <View style={{ width: `${total ? (s.paid / total) * 100 : 0}%`, height: '100%', backgroundColor: p.lime, borderRadius: radius.pill }} />
                </View>
                <Text variant="caption" style={{ color: s.balance >= 0 ? p.lime : p.amber }}>
                  {Math.abs(s.balance) < 100 ? 'Paid an even share' : s.balance > 0 ? `${formatRupees(s.balance)} more than an even share` : `${formatRupees(-s.balance)} short of an even share`}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {editable ? (
        adding ? (
          <View style={{ gap: space.md, backgroundColor: p.surface, borderRadius: radius.lg, padding: space.lg }}>
            <ChipGroup<string>
              label="Who paid?"
              value={payer}
              onChange={setPayer}
              options={members.map((m) => ({ value: m.id, label: m.relation === 'self' ? 'You' : m.name.split(' ')[0] }))}
            />
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Field label="Amount (₹)" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="18,400" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Date" value={date} onChangeText={setDate} placeholder="Today" keyboardType="numbers-and-punctuation" />
              </View>
            </View>
            <Field label="For what? (optional)" value={note} onChangeText={setNote} placeholder="Papa’s medicines" maxLength={80} />
            {error ? <Notice tone="danger">{error}</Notice> : null}
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button label="Cancel" kind="secondary" onPress={() => setAdding(false)} style={{ flex: 1 }} />
              <Button label="Save" icon="check" onPress={save} style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <Button label="Add a payment" icon="plus" onPress={() => setAdding(true)} />
        )
      ) : null}

      <View style={{ gap: space.xs }}>
        <SectionHeader title="Payments" />
        {entries === null ? (
          <SkeletonList rows={3} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon="users"
            title="Share the family bills"
            body="“Mark paid” on the timeline adds premiums here automatically. Add medicines or other bills by hand."
          />
        ) : (
          entries.slice(0, 50).map((e, idx, shown) => {
            const item = items.find((i) => i.id === e.itemId);
            return (
              <Pressable
                key={e.id}
                accessibilityRole="button"
                disabled={!editable}
                onLongPress={() =>
                  Alert.alert('Delete this payment?', undefined, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteLedgerEntry(household!.id, e.id) },
                  ])
                }
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  paddingVertical: space.md,
                  borderBottomWidth: idx < shown.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: p.line,
                  ...pressFeedback(pressed),
                })}>
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="arrow-up-right" size={17} color={p.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="label" style={{ fontSize: 14 }} numberOfLines={1}>
                    {e.note ?? item?.provider ?? 'Family bill'}
                  </Text>
                  <Text variant="caption" tone="faint">
                    {name(e.payerMemberId)} · {formatDate(e.date)}
                  </Text>
                </View>
                <Text variant="label" style={[type.number, { fontSize: 14 }]}>
                  {formatRupees(e.amount)}
                </Text>
              </Pressable>
            );
          })
        )}
        {entries && entries.length > 0 && editable ? (
          <Text variant="caption" tone="faint" style={{ textAlign: 'center', marginTop: space.sm }}>
            Press and hold a payment to delete it.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
