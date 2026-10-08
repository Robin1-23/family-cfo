import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text as RNText, View } from 'react-native';

import { DOC_TYPE_LABELS } from '@/lib/catalog';
import { formatBytes } from '@/lib/files';
import type { DocType, OcrStatus, VaultDocument } from '@/lib/types';
import { documentUrl } from '@/services/vault';
import { radius, space, type, usePalette } from '@/theme/tokens';
import { Button } from './ui';

const OCR_LABEL: Record<OcrStatus, string> = {
  pending: 'Waiting to be read',
  processing: 'Reading details…',
  extracted: 'Details ready to confirm',
  confirmed: 'Details confirmed',
  failed: 'Couldn’t read details',
};

/** Insurance on dark cards, money on lavender, papers on peach. */
const TONE: Record<DocType, 'dark' | 'lavender' | 'peach'> = {
  health_policy: 'dark',
  term_policy: 'dark',
  life_policy: 'dark',
  vehicle_policy: 'dark',
  fixed_deposit: 'lavender',
  mutual_fund: 'lavender',
  loan: 'lavender',
  property: 'peach',
  id_document: 'peach',
  tax: 'peach',
  other: 'peach',
};

const ICON: Record<DocType, 'heart' | 'umbrella' | 'shield' | 'truck' | 'trending-up' | 'credit-card' | 'home' | 'user' | 'file-text'> = {
  health_policy: 'heart',
  term_policy: 'umbrella',
  life_policy: 'shield',
  vehicle_policy: 'truck',
  fixed_deposit: 'trending-up',
  mutual_fund: 'trending-up',
  loan: 'credit-card',
  property: 'home',
  id_document: 'user',
  tax: 'file-text',
  other: 'file-text',
};

export function DocumentRow({
  document,
  ownerName,
  editable = false,
}: {
  document: VaultDocument;
  ownerName?: string;
  /** Shows "Confirm details" once OCR has finished (or failed). */
  editable?: boolean;
}) {
  const p = usePalette();
  const [opening, setOpening] = useState(false);
  const tone = TONE[document.docType];
  const bg = tone === 'dark' ? p.bar : tone === 'lavender' ? p.lavender : p.peach;
  const fg = tone === 'dark' ? p.onBar : p.onTint;
  const accent = tone === 'dark' ? p.peach : p.onTint;
  const needsDetails = editable && (document.ocrStatus === 'extracted' || document.ocrStatus === 'failed');

  async function open() {
    setOpening(true);
    try {
      const url = await documentUrl(document.storagePath);
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert('Couldn’t open this file', 'Check your connection and try again.');
    } finally {
      setOpening(false);
    }
  }

  const overline = [DOC_TYPE_LABELS[document.docType], ownerName].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${document.title}`}
      onPress={open}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderRadius: 30,
        padding: space.lg + 2,
        gap: space.md,
        opacity: pressed ? 0.9 : 1,
        overflow: 'hidden',
      })}>
      <View
        style={{
          position: 'absolute',
          right: -40,
          top: -40,
          width: 150,
          height: 150,
          borderRadius: 75,
          borderWidth: 18,
          borderColor: tone === 'dark' ? p.barActive : p.surface,
          opacity: tone === 'dark' ? 0.6 : 0.2,
        }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: tone === 'dark' ? p.inkSoft : p.onTint,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Feather name={ICON[document.docType]} size={19} color={accent} />
        </View>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.sm + 4,
            backgroundColor: tone === 'dark' ? p.surface : p.bar,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {opening ? (
            <ActivityIndicator color={tone === 'dark' ? p.ink : p.onBar} />
          ) : (
            <Feather name="external-link" size={17} color={tone === 'dark' ? p.ink : p.onBar} />
          )}
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <RNText style={[type.caption, { color: accent, fontWeight: '700', letterSpacing: 0.3 }]} numberOfLines={1}>
          {overline}
        </RNText>
        <RNText style={[type.heading, { color: fg, fontSize: 20, lineHeight: 25 }]} numberOfLines={2}>
          {document.title}
        </RNText>
        <RNText style={[type.caption, { color: fg, opacity: 0.8 }]}>
          {OCR_LABEL[document.ocrStatus]} · {formatBytes(document.sizeBytes)}
        </RNText>
      </View>

      {needsDetails ? (
        <Button
          label={document.ocrStatus === 'extracted' ? 'Confirm details' : 'Enter details'}
          kind="secondary"
          style={{ minHeight: 42, alignSelf: 'flex-start', borderWidth: 0 }}
          onPress={() => router.push({ pathname: '/item/new', params: { docId: document.id } })}
        />
      ) : null}
    </Pressable>
  );
}
