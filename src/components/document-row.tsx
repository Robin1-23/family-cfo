import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { DOC_TYPE_LABELS } from '@/lib/catalog';
import { formatBytes } from '@/lib/files';
import type { OcrStatus, VaultDocument } from '@/lib/types';
import { documentUrl } from '@/services/vault';
import { space, usePalette } from '@/theme/tokens';
import { Text } from './ui';

const OCR_LABEL: Record<OcrStatus, string> = {
  pending: 'Waiting to be read',
  processing: 'Reading details…',
  extracted: 'Details ready to confirm',
  confirmed: 'Details confirmed',
  failed: 'Couldn’t read details',
};

export function DocumentRow({ document, ownerName }: { document: VaultDocument; ownerName?: string }) {
  const p = usePalette();
  const [opening, setOpening] = useState(false);
  const isPdf = document.contentType === 'application/pdf';

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

  const meta = [DOC_TYPE_LABELS[document.docType], ownerName, formatBytes(document.sizeBytes)].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${document.title}`}
      onPress={open}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
        borderBottomWidth: 1,
        borderBottomColor: p.line,
        opacity: pressed ? 0.7 : 1,
      })}>
      <View
        style={{
          width: 40,
          height: 48,
          borderRadius: 6,
          backgroundColor: p.surfaceSunk,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Feather name={isPdf ? 'file-text' : 'image'} size={20} color={p.inkSoft} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label" numberOfLines={1}>
          {document.title}
        </Text>
        <Text variant="caption" tone="soft" numberOfLines={1}>
          {meta}
        </Text>
        <Text variant="caption" tone={document.ocrStatus === 'failed' ? 'danger' : 'faint'}>
          {OCR_LABEL[document.ocrStatus]}
        </Text>
      </View>
      {opening ? <ActivityIndicator color={p.primary} /> : <Feather name="chevron-right" size={18} color={p.inkFaint} />}
    </Pressable>
  );
}
