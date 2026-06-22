/**
 * @module formatters
 * Shared formatting utilities for currency, dates, and relative time.
 */

import { format } from "date-fns";

/**
 * Parses a date-only string (YYYY-MM-DD) as local date to avoid timezone shift.
 * JavaScript's new Date("2026-03-10") treats date-only strings as UTC midnight,
 * which displays one day earlier in timezones behind UTC.
 * @param dateStr - ISO date string (YYYY-MM-DD) or full ISO with time
 * @returns Date object suitable for formatting
 */
export function parseDateOnly(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  if (dateStr.includes("T")) return new Date(dateStr);
  return new Date(dateStr + "T12:00:00");
}

/**
 * Formats a date-only string for display without timezone shift.
 * Use for estimate_date, invoice_date, due_date, etc.
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @param fmt - date-fns format string (default: "MMMM d, yyyy")
 */
export function formatDateOnly(dateStr: string, fmt: string = "MMMM d, yyyy"): string {
  return format(parseDateOnly(dateStr), fmt);
}

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
