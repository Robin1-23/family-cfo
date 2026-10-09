/** Pure helpers for family invites. */

/** No 0/O, 1/I/L: easy to read out on a phone call. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_DAYS = 7;

export function inviteCodeFrom(bytes: Uint8Array): string {
  return Array.from(bytes.slice(0, 8), (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function inviteExpired(createdAtMs: number, nowMs: number): boolean {
  return nowMs - createdAtMs > INVITE_DAYS * 86_400_000;
}
