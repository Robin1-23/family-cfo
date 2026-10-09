import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar, BackButton, Button, HeroCard, Notice, Panel, ScoreRing, Screen, Text } from '@/components/ui';
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
        <Screen
          footer={
            <View style={{ gap: space.sm }}>
              <Button
                label="Add your first policy"
                icon="camera"
                onPress={() => router.replace({ pathname: '/upload', params: { memberId: targets[0].id, docType: 'health_policy' } })}
              />
              <Button label="Go to my family" kind="quiet" onPress={() => router.back()} />
            </View>
          }>
          <HeroCard tint="lime" icon="award" eyebrow="Your first Coverage Score" title={family >= 70 ? 'Well covered' : 'Room to improve'} subtitle="Sharpens as you add policies.">
            <View style={{ alignItems: 'center', paddingVertical: space.md }}>
              <ScoreRing value={family} size={150} stroke={12} color={p.bar} track={p.limeLo}>
                <Text variant="display" style={[type.number, { color: p.onTint, fontSize: 46, lineHeight: 50, letterSpacing: -2 }]}>
                  {family}
                </Text>
                <Text variant="caption" style={{ color: p.onTint, opacity: 0.6, fontWeight: '600' }}>
                  of 100
                </Text>
              </ScoreRing>
            </View>
          </HeroCard>
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
                    backgroundColor: score >= 70 ? p.limeWash : p.amberWash,
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
                  <View key={g} style={{ flexDirection: 'row', gap: space.sm }}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: p.amber, marginTop: 7 }} />
                    <Text variant="caption" tone="soft" style={{ flex: 1, fontSize: 13, lineHeight: 19 }}>
                      {g}
                    </Text>
                  </View>
                ))
              )}
            </Panel>
          ))}
          <Notice tone="primary">General information, not advice. We never sell policies.</Notice>
        </Screen>
      </>
    );
  }

  const total = targets.reduce((n, m) => n + questionsFor(answers[m.id] ?? {}).length, 0);
  const position = targets.slice(0, who).reduce((n, m) => n + questionsFor(answers[m.id] ?? {}).length, 0) + step + 1;

  return (
    <>
      <Screen
        footer={
          position > 1 ? <Button label="Previous question" kind="quiet" icon="arrow-left" onPress={back} disabled={saving} /> : undefined
        }>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <BackButton />
          <View style={{ flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: p.surfaceSunk }}>
            <View style={{ height: 6, borderRadius: radius.pill, backgroundColor: p.lime, width: `${(position / total) * 100}%` }} />
          </View>
          <Text variant="label" tone="soft" style={type.number}>
            {position}/{total}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg }}>
          <Avatar name={member.name} size={28} />
          <Text variant="overline" tone="soft">
            {member.relation === 'self' ? 'About you' : `About ${member.name.split(' ')[0]}`}
          </Text>
        </View>
        <Text variant="title" style={{ fontSize: 22, lineHeight: 28 }}>
          {question.text(name)}
        </Text>

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
                  minHeight: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: space.lg,
                  borderRadius: radius.lg,
                  boxShadow: selected ? undefined : p.shadow,
                  borderWidth: 1,
                  borderColor: selected ? p.primary : p.line,
                  backgroundColor: selected ? p.primary : p.surface,
                  opacity: pressed ? 0.8 : 1,
                })}>
                <Text variant="label" tone={selected ? 'onPrimary' : 'ink'} style={{ fontSize: 14, fontWeight: '500' }}>
                  {o.label}
                </Text>
                <Feather name={selected ? 'check-circle' : 'circle'} size={16} color={selected ? p.lime : p.line} />
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
