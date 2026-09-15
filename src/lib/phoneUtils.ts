/**
 * Utility for masking phone numbers on printed receipts for customer privacy.
 * Replaces the last 3 digits with '***' while keeping the preceding prefix intact.
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (!trimmed) return '';

  // Locate all digit positions in the string
  const digitIndices: number[] = [];
  for (let i = 0; i < trimmed.length; i++) {
    if (/\d/.test(trimmed[i])) {
      digitIndices.push(i);
    }
  }

  // If 3 or fewer digits, return ***
  if (digitIndices.length <= 3) {
    return '***';
  }

  // Mask the last 3 digit positions with '*'
  const last3Indices = new Set(digitIndices.slice(-3));
  let result = '';
  for (let i = 0; i < trimmed.length; i++) {
    if (last3Indices.has(i)) {
      result += '*';
    } else {
      result += trimmed[i];
    }
  }

  return result;
}
