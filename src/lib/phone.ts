/**
 * Normalises an Indian mobile number to E.164 (+91XXXXXXXXXX).
 * Accepts spaces, dashes, a leading 0, 91 or +91. Returns null when the
 * number is not a valid Indian mobile (10 digits starting with 6-9).
 */
export function normalizeIndianMobile(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  let local: string;
  if (digits.length === 10) {
    local = digits;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    local = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    local = digits.slice(2);
  } else {
    return null;
  }
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}

/** "+919876543210" -> "+91 98765 43210" */
export function formatIndianMobile(e164: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}

/** Masks all but the last four digits, for display in shared screens. */
export function maskPhone(e164: string): string {
  const tail = e164.slice(-4);
  return `•••• ${tail}`;
}
