export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
] as const;

export interface UploadCandidate {
  fileName: string;
  contentType: string | null | undefined;
  sizeBytes: number | null | undefined;
}

/** Returns a user-facing error, or null when the file can go to the vault. Mirrors storage.rules. */
export function validateUpload(file: UploadCandidate): string | null {
  const type = (file.contentType ?? '').toLowerCase();
  if (!(ALLOWED_CONTENT_TYPES as readonly string[]).includes(type)) {
    return 'Only PDFs and photos (JPG, PNG, HEIC, WebP) can be added to the vault.';
  }
  if (file.sizeBytes == null || file.sizeBytes <= 0) {
    return 'This file looks empty. Try picking it again.';
  }
  if (file.sizeBytes > MAX_UPLOAD_BYTES) {
    return 'Files must be under 20 MB.';
  }
  return null;
}

/** Keeps file names safe for Storage paths: letters, digits, dot, dash, underscore. */
export function safeFileName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, '-');
  const cleaned = trimmed.replace(/[^A-Za-z0-9._-]/g, '');
  const base = cleaned.replace(/^\.+/, '').slice(-80);
  return base.length > 0 ? base : 'document';
}

export function documentStoragePath(
  householdId: string,
  memberId: string,
  documentId: string,
  fileName: string,
): string {
  return `households/${householdId}/members/${memberId}/documents/${documentId}/${safeFileName(fileName)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
