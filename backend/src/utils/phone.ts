const INDIAN_MOBILE = /^[6-9]\d{9}$/;

/** Normalize user input to E.164 India (+91 + 10 digits). Returns null if invalid. */
export function normalizeIndianPhone(input: string): string | null {
  const trimmed = input.trim();
  if (/^\+91[6-9]\d{9}$/.test(trimmed)) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10 && INDIAN_MOBILE.test(digits)) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91') && INDIAN_MOBILE.test(digits.slice(2))) {
    return `+91${digits.slice(2)}`;
  }

  return null;
}

export const INDIAN_E164_REGEX = /^\+91[6-9]\d{9}$/;
