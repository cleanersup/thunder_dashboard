/**
 * @module phoneInput
 * Phone number formatting utilities.
 * Normalizes any raw phone string (digits-only, partial, or already formatted)
 * to the canonical US display format: (xxx)xxx-xxxx
 */

/**
 * Formats a raw or partially-formatted phone string to (xxx)xxx-xxxx.
 * Strips all non-digit characters, then applies the mask.
 * Safe to call on already-formatted values — idempotent.
 */
export function formatPhoneDisplay(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)})${digits.slice(3)}`;
  return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}
