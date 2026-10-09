import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton, Text } from '@/components/ui';
import { ITEM_TYPE_LABELS } from '@/lib/items';
import { useHousehold } from '@/providers/household-provider';
import { callApi, type AskAnswer } from '@/services/api';
import { documentUrl } from '@/services/vault';
import { MAX_FONT_SCALE, radius, space, type, usePalette } from '@/theme/tokens';

type Turn = { id: number; question: string; answer?: AskAnswer; error?: string };

const SUGGESTIONS = ['Papa ka health cover kab tak hai?', 'Which premiums are due this month?', 'Who is the nominee on Mummy’s FD?', 'Do my parents have term cover?'];

/** Screen 13: questions about the family's own saved data, with the source of every answer. */
export default function AskScreen() {
  const { household, items, documents } = useHousehold();
  const p = usePalette();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ScrollView>(null);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || !household || busy) return;
    const id = Date.now();
    setTurns((t) => [...t, { id, question: q }]);
    setDraft('');
    setBusy(true);
    try {
      const answer = await callApi<AskAnswer>('/ask', { householdId: household.id, question: q });
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer } : x)));
    } catch (e) {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, error: (e as Error).message } : x)));
    } finally {
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  async function openSource(s: AskAnswer['sources'][number]) {
    if (s.kind === 'item') return router.push({ pathname: '/item/new', params: { itemId: s.id } });
    const doc = documents.find((d) => d.id === s.id);
    if (doc) await WebBrowser.openBrowserAsync(await documentUrl(doc.storagePath));
  }

  const label = (s: AskAnswer['sources'][number]) => {
    if (s.kind === 'doc') return documents.find((d) => d.id === s.id)?.title ?? 'Document';
    const it = items.find((i) => i.id === s.id);
    return it ? (it.provider ?? ITEM_TYPE_LABELS[it.type]) : 'Policy';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: 20, paddingVertical: space.md }}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <Text variant="heading">Ask Family CFO</Text>
            <Text variant="caption" tone="faint">
              Answers come from your saved details
            </Text>
          </View>
        </View>

        <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: space.lg, gap: space.md }} keyboardShouldPersistTaps="handled">
          {turns.length === 0 ? (
            <View style={{ gap: space.md, paddingTop: space.lg }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: p.lime, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="message-circle" size={22} color={p.onTint} />
              </View>
              <Text variant="title">What would you like to know?</Text>
              <Text variant="caption" tone="soft">
                Ask in Hindi or English. Every answer links to the policy or paper it came from.
              </Text>
              <View style={{ gap: space.sm, marginTop: space.sm }}>
                {SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s}
                    accessibilityRole="button"
                    onPress={() => ask(s)}
                    style={{ backgroundColor: p.surface, borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: space.md, boxShadow: p.shadow }}>
                    <Text variant="label" style={{ fontWeight: '500' }}>
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            turns.map((t) => (
              <View key={t.id} style={{ gap: space.sm }}>
                <View style={{ alignSelf: 'flex-end', maxWidth: '82%', backgroundColor: p.primary, borderRadius: radius.lg, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10 }}>
                  <Text tone="onPrimary">{t.question}</Text>
                </View>
                <View style={{ alignSelf: 'flex-start', maxWidth: '90%', backgroundColor: p.surface, borderRadius: radius.lg, borderBottomLeftRadius: 6, padding: 14, gap: space.sm, boxShadow: p.shadow }}>
                  {t.answer ? (
                    <>
                      <Text style={{ lineHeight: 21 }}>{t.answer.answer}</Text>
                      {t.answer.sources.length > 0 ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {t.answer.sources.map((s) => (
                            <Pressable
                              key={`${s.kind}${s.id}`}
                              accessibilityRole="link"
                              onPress={() => openSource(s)}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: p.limeWash }}>
                              <Feather name={s.kind === 'doc' ? 'file-text' : 'shield'} size={11} color={p.limeDeep} />
                              <Text variant="caption" style={{ color: p.limeDeep, fontWeight: '600', fontSize: 11 }} numberOfLines={1}>
                                {label(s)}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </>
                  ) : t.error ? (
                    <Text tone="danger">{t.error}</Text>
                  ) : (
                    <ActivityIndicator color={p.inkSoft} />
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, paddingHorizontal: 20, paddingVertical: space.sm }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask about policies, dues, nominees…"
            placeholderTextColor={p.inkFaint}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            multiline
            maxLength={500}
            style={[type.body, { flex: 1, minHeight: 48, maxHeight: 120, color: p.ink, backgroundColor: p.surface, borderRadius: 24, paddingHorizontal: space.lg, paddingTop: 13, paddingBottom: 13, borderWidth: 1, borderColor: p.line }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send question"
            disabled={!draft.trim() || busy}
            onPress={() => ask(draft)}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: p.primary, alignItems: 'center', justifyContent: 'center', opacity: !draft.trim() || busy ? 0.4 : 1 }}>
            <Feather name="arrow-up" size={20} color={p.primaryInk} />
          </Pressable>
        </View>
        <Text variant="caption" tone="faint" style={{ textAlign: 'center', fontSize: 11, paddingBottom: space.sm }}>
          Facts from your data, not advice. We never sell products.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
