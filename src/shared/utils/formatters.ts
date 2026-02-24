/**
 * @module formatters
 * Shared formatting utilities for currency, dates, and relative time.
 */

/**
 * Formats a number as a USD currency string (no $ symbol — append manually if needed).
 * @param amount - Numeric amount to format
 * @returns Formatted string with 2 decimal places and thousands separators
 * @example formatCurrency(12345.6) // "12,345.60"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Returns a human-readable relative time string from an ISO timestamp.
 * @param timestamp - ISO date string
 * @returns e.g. "Just now", "5 minutes ago", "2 hours ago", "3 days ago"
 * @example getRelativeTime("2026-02-24T10:00:00Z") // "3 hours ago"
 */
export function getRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

/**
 * Returns the user's IANA timezone string (e.g. "America/New_York").
 * Falls back to "UTC" if detection fails.
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * Returns today's date string (YYYY-MM-DD) in the given IANA timezone.
 * @param timezone - IANA timezone identifier
 */
export function getCurrentDateInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}
