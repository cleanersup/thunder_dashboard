/**
 * @module phoneInput
 * Phone number formatting utilities.
 * Normalizes any raw phone string (digits-only, partial, or already formatted)
 * to the canonical US display format: (xxx)xxx-xxxx
 */

/**
 * Formats a raw or partially-formatted phone string to (xxx)xxx-xxxx.
 *
 * Handles legacy/dirty data gracefully:
 * - Strips all non-digit characters first.
 * - If more than 10 digits, takes the last 10 (covers +1 country code prefix).
 * - If exactly 10 digits → canonical (xxx)xxx-xxxx.
 * - If fewer than 10 digits → returns the original raw string as-is so no
 *   data is lost or misrepresented (bad/old record stays readable).
 * - null / undefined / empty → empty string.
 */
export function formatPhoneDisplay(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  const digits = raw.replace(/[^\d]/g, "");
  const normalized = digits.length > 10 ? digits.slice(-10) : digits;
  if (normalized.length < 10) return raw.trim();
  return `(${normalized.slice(0, 3)})${normalized.slice(3, 6)}-${normalized.slice(6)}`;
}

/**
 * Returns true only when the raw value resolves to exactly 10 usable digits.
 * Use alongside formatPhoneDisplay to apply warning styles on bad legacy data.
 */
export function isPhoneValid(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false;
  const digits = raw.replace(/[^\d]/g, "");
  const normalized = digits.length > 10 ? digits.slice(-10) : digits;
  return normalized.length === 10;
}
