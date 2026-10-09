import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, View } from 'react-native';

import { DOC_TYPE_LABELS } from '@/lib/catalog';
import { formatBytes } from '@/lib/files';
import { formatDate, formatRupees } from '@/lib/items';
import type { DocType, OcrStatus, VaultDocument } from '@/lib/types';
import { callApi, type ShareLink } from '@/services/api';
import { documentUrl } from '@/services/vault';
import { radius, space, usePalette } from '@/theme/tokens';
import { Button, Text, pressFeedback } from './ui';

const OCR_LABEL: Record<OcrStatus, string> = {
  pending: 'Waiting to be read',
  processing: 'Reading details…',
  extracted: 'Details ready to confirm',
  confirmed: 'Details confirmed',
  failed: 'Couldn’t read details',
};

/** Insurance on dark cards, money on lime, papers on amber. */
const TONE: Record<DocType, 'dark' | 'lime' | 'amber'> = {
  health_policy: 'dark',
  term_policy: 'dark',
  life_policy: 'dark',
  vehicle_policy: 'dark',
  fixed_deposit: 'lime',
  mutual_fund: 'lime',
  loan: 'lime',
  property: 'amber',
  id_document: 'amber',
  tax: 'amber',
  other: 'amber',
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
  householdId,
}: {
  /** Enables the share button (24-hour link). */
  householdId?: string;
  document: VaultDocument;
  ownerName?: string;
  /** Shows "Confirm details" once OCR has finished (or failed). */
  editable?: boolean;
}) {
  const p = usePalette();
  const [opening, setOpening] = useState(false);
  const [sharing, setSharing] = useState(false);
  const x = document.extractedFields;
  const facts = x ? [x.provider, x.amount != null && formatRupees(x.amount), x.dueDate && `due ${formatDate(x.dueDate)}`].filter(Boolean).join(' · ') : '';

  /** A link that works for 24 hours, for a sibling or the hospital desk. */
  async function share() {
    if (!householdId) return;
    setSharing(true);
    try {
      const { links, hours } = await callApi<{ links: ShareLink[]; hours: number }>('/share-links', { householdId, docIds: [document.id] });
      if (links[0]) await Share.share({ message: `${document.title}\n${links[0].url}\n\n(Link works for ${hours} hours. Shared from Family CFO.)` });
    } catch (e) {
      Alert.alert('Couldn’t create a link', (e as Error).message);
    } finally {
      setSharing(false);
    }
  }
  const tone = TONE[document.docType];
  const bg = tone === 'dark' ? p.bar : tone === 'lime' ? p.lime : p.amber;
  const fg = tone === 'dark' ? p.onBar : p.onTint;
  const accent = tone === 'dark' ? p.amber : p.onTint;
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
        borderRadius: radius.lg,
        padding: space.lg,
        gap: space.md,
        overflow: 'hidden',
        ...pressFeedback(pressed),
      })}>
      <View
        style={{
          position: 'absolute',
          right: -36,
          bottom: -48,
          width: 130,
          height: 130,
          borderRadius: 65,
          borderWidth: 14,
          borderColor: tone === 'dark' ? p.barActive : p.surface,
          opacity: tone === 'dark' ? 0.7 : 0.18,
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: tone === 'dark' ? p.inkSoft : p.onTint,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Feather name={ICON[document.docType]} size={16} color={accent} />
        </View>
        <Text variant="overline" style={{ color: accent, flex: 1 }} numberOfLines={1}>
          {overline}
        </Text>
        {householdId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Share ${document.title}`}
            onPress={share}
            hitSlop={6}
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: tone === 'dark' ? p.inkSoft : p.onTint,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {sharing ? <ActivityIndicator size="small" color={accent} /> : <Feather name="share-2" size={14} color={tone === 'dark' ? p.onBar : p.onTint} />}
          </Pressable>
        ) : null}
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.sm,
            backgroundColor: tone === 'dark' ? p.surface : p.bar,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {opening ? (
            <ActivityIndicator size="small" color={tone === 'dark' ? p.ink : p.onBar} />
          ) : (
            <Feather name="external-link" size={14} color={tone === 'dark' ? p.ink : p.onBar} />
          )}
        </View>
      </View>

      <View style={{ gap: 2 }}>
        <Text variant="heading" style={{ color: fg }} numberOfLines={2}>
          {document.title}
        </Text>
        <Text variant="caption" style={{ color: fg, opacity: 0.7 }}>
          {OCR_LABEL[document.ocrStatus]} · {formatBytes(document.sizeBytes)}
        </Text>
      </View>

      {facts ? (
        <View
          style={{
            backgroundColor: tone === 'dark' ? p.barActive : p.surface,
            borderRadius: radius.md,
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            opacity: tone === 'dark' ? 1 : 0.85,
          }}>
          <Text variant="caption" style={{ color: tone === 'dark' ? p.onBar : p.ink, fontWeight: '600' }} numberOfLines={1}>
            {facts}
          </Text>
        </View>
      ) : null}

      {needsDetails ? (
        <Button
          label={document.ocrStatus === 'extracted' ? 'Confirm details' : 'Enter details'}
          kind="secondary"
          icon={document.ocrStatus === 'extracted' ? 'check' : 'edit-3'}
          style={{ minHeight: 38, alignSelf: 'flex-start', borderWidth: 0, paddingHorizontal: space.md }}
          onPress={() => router.push({ pathname: '/item/new', params: { docId: document.id } })}
        />
      ) : null}
    </Pressable>
  );
}
