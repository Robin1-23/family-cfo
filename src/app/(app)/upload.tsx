import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, ChipGroup, Field, HeroCard, Notice, Panel, Screen, Text } from '@/components/ui';
import { DOC_TYPE_LABELS, DOC_TYPE_ORDER } from '@/lib/catalog';
import { formatBytes, validateUpload } from '@/lib/files';
import type { DocType } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { useHousehold } from '@/providers/household-provider';
import { uploadDocument } from '@/services/vault';
import { radius, space, usePalette } from '@/theme/tokens';

interface PickedFile {
  uri: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

function isDocType(v: string | undefined): v is DocType {
  return !!v && (DOC_TYPE_ORDER as string[]).includes(v);
}

export default function UploadScreen() {
  const params = useLocalSearchParams<{ memberId?: string; docType?: string }>();
  const { user } = useAuth();
  const { household, members } = useHousehold();
  const p = usePalette();

  const [memberId, setMemberId] = useState<string | null>(
    params.memberId && members.some((m) => m.id === params.memberId) ? params.memberId : (members[0]?.id ?? null),
  );
  const [docType, setDocType] = useState<DocType | null>(isDocType(params.docType) ? params.docType : null);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function accept(picked: PickedFile) {
    const problem = validateUpload(picked);
    setError(problem);
    setFile(problem ? null : picked);
  }

  async function scan() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Camera access is off. Turn it on in your phone’s settings, or choose a photo instead.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled) return;
    const a = res.assets[0];
    accept({
      uri: a.uri,
      fileName: a.fileName ?? `scan-${Date.now()}.jpg`,
      contentType: a.mimeType ?? 'image/jpeg',
      sizeBytes: a.fileSize ?? 0,
    });
  }

  async function choosePhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled) return;
    const a = res.assets[0];
    accept({
      uri: a.uri,
      fileName: a.fileName ?? `photo-${Date.now()}.jpg`,
      contentType: a.mimeType ?? 'image/jpeg',
      sizeBytes: a.fileSize ?? 0,
    });
  }

  async function choosePdf() {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (res.canceled) return;
    const a = res.assets[0];
    accept({ uri: a.uri, fileName: a.name, contentType: a.mimeType ?? 'application/pdf', sizeBytes: a.size ?? 0 });
  }

  async function save() {
    if (!user || !household) return;
    if (!memberId) return setError('Choose whose document this is.');
    if (!docType) return setError('Choose what kind of document this is.');
    if (!file) return setError('Scan or choose a file first.');
    setError(null);
    setProgress(0);
    try {
      await uploadDocument({
        householdId: household.id,
        memberId,
        uid: user.uid,
        docType,
        title: title || DOC_TYPE_LABELS[docType],
        localUri: file.uri,
        fileName: file.fileName,
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
        onProgress: setProgress,
      });
      router.back();
    } catch (e) {
      setProgress(null);
      setError((e as Error).message || 'Upload failed. Check your connection and try again.');
    }
  }

  const uploading = progress !== null;

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Button
          label={uploading ? `Uploading ${Math.round((progress ?? 0) * 100)}%` : 'Save to vault'}
          onPress={save}
          loading={uploading && (progress ?? 0) === 0}
          disabled={uploading}
        />
      }>
      <HeroCard
        tint="dark"
        icon="upload-cloud"
        back
        title="Add to vault"
        subtitle="Snap a policy, FD receipt or ID. We’ll read the details for you to check."
      />
      <ChipGroup<string>
        label="Whose document?"
        value={memberId}
        onChange={setMemberId}
        options={members.map((m) => ({ value: m.id, label: m.relation === 'self' ? 'Me' : m.name.split(' ')[0] }))}
      />
      <ChipGroup<DocType>
        label="What is it?"
        value={docType}
        onChange={setDocType}
        options={DOC_TYPE_ORDER.map((t) => ({ value: t, label: DOC_TYPE_LABELS[t] }))}
      />
      <Field
        label="Name (optional)"
        value={title}
        onChangeText={setTitle}
        placeholder={docType ? `e.g. ${DOC_TYPE_LABELS[docType]} 2026` : 'e.g. Star Health family floater'}
        maxLength={120}
      />

      <View style={{ gap: space.sm }}>
        <Text variant="label">File</Text>
        {file ? (
          <Panel style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text variant="label" numberOfLines={1}>
                {file.fileName}
              </Text>
              <Text variant="caption" tone="soft">
                {formatBytes(file.sizeBytes)}
              </Text>
            </View>
            {!uploading ? <Button label="Change" kind="quiet" onPress={() => setFile(null)} style={{ minHeight: 36 }} /> : null}
          </Panel>
        ) : (
          <View style={{ gap: space.sm }}>
            <Button label="Scan with camera" onPress={scan} />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button label="Choose photo" kind="secondary" onPress={choosePhoto} style={{ flex: 1 }} />
              <Button label="Choose PDF" kind="secondary" onPress={choosePdf} style={{ flex: 1 }} />
            </View>
          </View>
        )}
        {uploading ? (
          <View style={{ height: 6, borderRadius: radius.pill, backgroundColor: p.surfaceSunk, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round((progress ?? 0) * 100)}%`, height: '100%', backgroundColor: p.lavender }} />
          </View>
        ) : null}
      </View>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <Text variant="caption" tone="faint">
        Files are stored encrypted in India (Mumbai) and are visible only to your family members.
      </Text>
    </Screen>
  );
}
