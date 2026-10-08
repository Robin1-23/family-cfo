import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar, Button, HeroCard, Notice, Panel, Screen, Text } from '@/components/ui';
import { checkTargets, completeCheck, memberCoverageScore, questionsFor } from '@/lib/health-check';
import type { HealthCheck } from '@/lib/types';
import { useHousehold } from '@/providers/household-provider';
import { saveHealthChecks } from '@/services/households';
import { radius, space, type, usePalette } from '@/theme/tokens';

/** Onboarding screen 4: six quick questions per parent → a first Coverage Score. */
export default function HealthCheckScreen() {
  const { household, members } = useHousehold();
  const p = usePalette();
  const targets = checkTargets(members);
  const [answers, setAnswers] = useState<Record<string, Partial<HealthCheck>>>(() =>
    Object.fromEntries(targets.map((m) => [m.id, { ...m.healthCheck }])),
  );
  const [who, setWho] = useState(0);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (targets.length === 0 || !household) {
    return (
      <Screen>
        <Text variant="heading">Add a family member first</Text>
        <Button label="Go back" kind="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const member = targets[who];
  const name = member.relation === 'self' ? 'you' : member.name.split(' ')[0];
  const mine = answers[member.id] ?? {};
  const questions = questionsFor(mine);
  const question = questions[Math.min(step, questions.length - 1)];

  async function finish(all: Record<string, Partial<HealthCheck>>) {
    const checks = targets.map((m) => ({ memberId: m.id, check: completeCheck(all[m.id] ?? {}) }));
    if (checks.some((c) => !c.check)) return setError('Some answers are missing. Go back and answer every question.');
    setSaving(true);
    setError(null);
    try {
      await saveHealthChecks(household!.id, checks as { memberId: string; check: HealthCheck }[]);
      setDone(true);
    } catch {
      setError('Couldn’t save your answers. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  function answer(value: string) {
    const next = { ...answers, [member.id]: { ...mine, [question.key]: value } as Partial<HealthCheck> };
    setAnswers(next);
    const remaining = questionsFor(next[member.id]);
    if (step + 1 < remaining.length) setStep(step + 1);
    else if (who + 1 < targets.length) {
      setWho(who + 1);
      setStep(0);
    } else finish(next);
  }

  function back() {
    if (step > 0) setStep(step - 1);
    else if (who > 0) {
      setWho(who - 1);
      setStep(questionsFor(answers[targets[who - 1].id] ?? {}).length - 1);
    } else router.back();
  }

  if (done) {
    const results = targets.map((m) => ({ m, ...memberCoverageScore(completeCheck(answers[m.id])!, m) }));
    const family = Math.round(results.reduce((a, r) => a + r.score, 0) / results.length);
    return (
      <>
        <Screen footer={<Button label="Go to my family" onPress={() => router.back()} />}>
          <HeroCard
            tint="lavender"
            icon="award"
            eyebrow="Your first Coverage Score"
            title={`${family} / 100`}
            subtitle="Based on your answers. It gets more accurate as you add policies to the vault."
          />
          {results.map(({ m, score, gaps }) => (
            <Panel key={m.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Avatar name={m.name} size={44} />
                <Text variant="heading" style={{ flex: 1 }}>
                  {m.relation === 'self' ? 'You' : m.name}
                </Text>
                <View
                  style={{
                    minWidth: 52,
                    paddingHorizontal: space.md,
                    paddingVertical: space.sm,
                    borderRadius: radius.pill,
                    backgroundColor: score >= 70 ? p.lavenderWash : p.peachWash,
                    alignItems: 'center',
                  }}>
                  <Text variant="heading" style={type.number}>
                    {score}
                  </Text>
                </View>
              </View>
              {gaps.length === 0 ? (
                <Text tone="soft">No gaps from these answers.</Text>
              ) : (
                gaps.map((g) => (
                  <Text key={g} tone="soft">
                    • {g}
                  </Text>
                ))
              )}
            </Panel>
          ))}
          <Notice tone="primary">This is general information, not advice. We never recommend or sell a policy.</Notice>
        </Screen>
      </>
    );
  }

  const total = targets.reduce((n, m) => n + questionsFor(answers[m.id] ?? {}).length, 0);
  const position = targets.slice(0, who).reduce((n, m) => n + questionsFor(answers[m.id] ?? {}).length, 0) + step + 1;

  return (
    <>
      <Screen footer={<Button label="Back" kind="secondary" onPress={back} disabled={saving} />}>
        <HeroCard tint="peach" icon="activity" title="Quick health check" />
        <View style={{ gap: space.sm }}>
          <Text variant="caption" tone="faint">
            Question {position} of {total}
            {targets.length > 1 ? ` · about ${member.name.split(' ')[0]}` : ''}
          </Text>
          <View style={{ height: 6, borderRadius: radius.pill, backgroundColor: p.surfaceSunk }}>
            <View
              style={{ height: 6, borderRadius: radius.pill, backgroundColor: p.lavender, width: `${(position / total) * 100}%` }}
            />
          </View>
        </View>

        <Text variant="title">{question.text(name)}</Text>

        <View style={{ gap: space.sm }}>
          {question.options.map((o) => {
            const selected = mine[question.key] === o.value;
            return (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                disabled={saving}
                onPress={() => answer(o.value)}
                style={({ pressed }) => ({
                  minHeight: 58,
                  justifyContent: 'center',
                  paddingHorizontal: space.lg,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: selected ? p.primary : p.line,
                  backgroundColor: selected ? p.primary : p.surface,
                  opacity: pressed ? 0.8 : 1,
                })}>
                <Text variant="label" tone={selected ? 'onPrimary' : 'ink'} style={{ fontSize: 16 }}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {saving ? <Text tone="soft">Working out your score…</Text> : null}
        {error ? <Notice tone="danger">{error}</Notice> : null}
      </Screen>
    </>
  );
}
