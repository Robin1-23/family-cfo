import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { ChipGroup, Field, HeroCard, Notice, Screen, SectionHeader, Text } from '@/components/ui';
import { formatCompactRupees, formatRupees, parseRupees } from '@/lib/items';
import { depositValue, policyReturn } from '@/lib/tools';
import { useHousehold } from '@/providers/household-provider';
import { radius, space, type, usePalette } from '@/theme/tokens';

const OPTIONS = [
  { icon: 'check-circle' as const, title: 'Keep paying', body: 'Makes sense if the return is close to a deposit, or you need the life cover it includes.' },
  { icon: 'pause-circle' as const, title: 'Make it paid-up', body: 'Stop premiums; the policy stays with a smaller payout at maturity. Ask the insurer for the paid-up value.' },
  { icon: 'x-circle' as const, title: 'Surrender', body: 'Take the surrender value now. Early years usually pay back far less than you put in.' },
];

/** V2 "Mis-sold policy check": the real yearly return of an endowment or money-back plan, explained. Nothing is sold. */
export default function PolicyCheckScreen() {
  const { items, members } = useHousehold();
  const p = usePalette();
  const policies = items.filter((i) => i.type === 'life_policy');
  const [policyId, setPolicyId] = useState<string | null>(policies[0]?.id ?? null);
  const picked = policies.find((i) => i.id === policyId);
  const [premium, setPremium] = useState(picked?.premium ? String(picked.premium) : '');
  const [payYears, setPayYears] = useState('15');
  const [totalYears, setTotalYears] = useState('20');
  const [maturity, setMaturity] = useState('');
  const [rate, setRate] = useState('7');

  const inputs = {
    premium: parseRupees(premium) ?? 0,
    payYears: Number(payYears) || 0,
    totalYears: Number(totalYears) || 0,
    maturity: parseRupees(maturity) ?? 0,
  };
  const r = policyReturn(inputs);
  const depositRate = Math.min(Math.max(Number(rate) || 0, 0), 20) / 100;
  const deposit = r != null ? depositValue(inputs, depositRate) : null;
  const paid = inputs.premium * inputs.payYears;
  const low = r != null && r < depositRate - 0.01;

  return (
    <Screen>
      <HeroCard tint="forest" icon="search" back eyebrow="Policy check" title="Is this policy worth it?" subtitle="See the real yearly return of an LIC or endowment plan." />

      {policies.length > 0 ? (
        <ChipGroup<string>
          label="Your life policies"
          value={policyId}
          onChange={(id) => {
            setPolicyId(id);
            const pol = policies.find((i) => i.id === id);
            if (pol?.premium) setPremium(String(pol.premium));
          }}
          options={policies.map((i) => {
            const m = members.find((x) => x.id === i.memberId);
            return { value: i.id, label: `${i.provider ?? 'Policy'} · ${m?.relation === 'self' ? 'You' : m?.name.split(' ')[0]}` };
          })}
        />
      ) : null}

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Field label="Yearly premium (₹)" value={premium} onChangeText={setPremium} keyboardType="numeric" placeholder="24,000" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Maturity payout (₹)" value={maturity} onChangeText={setMaturity} keyboardType="numeric" placeholder="6,00,000" hint="From the policy or insurer" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Field label="Years of premiums" value={payYears} onChangeText={(t) => setPayYears(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Years to maturity" value={totalYears} onChangeText={(t) => setTotalYears(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="FD rate %" value={rate} onChangeText={(t) => setRate(t.replace(/[^0-9.]/g, '').slice(0, 4))} keyboardType="decimal-pad" />
        </View>
      </View>

      {r == null ? (
        <Notice tone="primary">Fill in the premium, years and maturity payout to see the return.</Notice>
      ) : (
        <View style={{ backgroundColor: low ? p.amber : p.lime, borderRadius: radius.xl, padding: space.lg, gap: space.md }}>
          <Text variant="overline" style={{ color: p.onTint, opacity: 0.7 }}>
            Yearly return
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text variant="display" style={[type.number, { color: p.onTint, fontSize: 44, lineHeight: 48, fontWeight: '800' }]}>
              {(r * 100).toFixed(1)}
            </Text>
            <Text variant="title" style={{ color: p.onTint }}>
              %
            </Text>
          </View>
          <Text variant="caption" style={{ color: p.onTint }}>
            {low
              ? `Lower than a ${(depositRate * 100).toFixed(1)}% deposit. That’s common with endowment plans.`
              : `About the same as a ${(depositRate * 100).toFixed(1)}% deposit, or better.`}
          </Text>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {[
              ['You pay', formatCompactRupees(paid)],
              ['Policy pays', formatCompactRupees(inputs.maturity)],
              ['Same in an FD', deposit != null ? formatCompactRupees(deposit) : '—'],
            ].map(([label, value]) => (
              <View key={label} style={{ flex: 1, backgroundColor: p.bar, borderRadius: radius.md, padding: space.sm }}>
                <Text variant="caption" style={{ color: p.onBar, opacity: 0.6, fontSize: 11 }}>
                  {label}
                </Text>
                <Text variant="label" style={[type.number, { color: p.onBar, fontSize: 14 }]}>
                  {value}
                </Text>
              </View>
            ))}
          </View>
          {deposit != null && deposit > inputs.maturity ? (
            <Text variant="caption" style={{ color: p.onTint, fontWeight: '600' }}>
              A deposit would end {formatRupees(deposit - inputs.maturity)} higher, but has no life cover.
            </Text>
          ) : null}
        </View>
      )}

      <View style={{ gap: space.sm }}>
        <SectionHeader title="Your options" />
        {OPTIONS.map((o) => (
          <View key={o.title} style={{ flexDirection: 'row', gap: space.md, backgroundColor: p.surface, borderRadius: radius.lg, padding: space.md }}>
            <Feather name={o.icon} size={18} color={p.lime} style={{ marginTop: 1 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label" style={{ fontSize: 14 }}>
                {o.title}
              </Text>
              <Text variant="caption" tone="soft" style={{ lineHeight: 18 }}>
                {o.body}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Notice tone="primary">An estimate from your numbers. Bonuses aren’t guaranteed. We never sell or recommend policies.</Notice>
    </Screen>
  );
}
