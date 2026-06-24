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

/** Today's date as YYYY-MM-DD in the user's local timezone. */
export function todayDateOnly(): string {
  return format(new Date(), "yyyy-MM-dd");
}

// ─── Unified display formats ────────────────────────────────────────────────
// Single source of truth for how dates and times appear across the dashboard.
// Date: "Wednesday, 06/24/2026"  ·  Time: "09:00 AM"

/** Long date with weekday — the canonical display format (matches the Schedule section). */
export const DISPLAY_DATE_FMT = "EEEE, MM/dd/yyyy";
/** Compact numeric date for dense tables/lists (no weekday). */
export const DISPLAY_DATE_SHORT_FMT = "MM/dd/yyyy";
/** 12-hour time with leading zero and AM/PM. */
export const DISPLAY_TIME_FMT = "hh:mm a";

function toDisplayDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  // Time-only strings ("HH:mm" / "HH:mm:ss") → anchor to an arbitrary day.
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (timeMatch) {
    const [, h, m] = timeMatch;
    return new Date(2000, 0, 1, Number(h), Number(m));
  }
  // Date-only strings (YYYY-MM-DD) → parse as local noon to avoid TZ shift.
  const date = value.includes("T") ? new Date(value) : parseDateOnly(value);
  return isNaN(date.getTime()) ? null : date;
}

/** "Wednesday, 06/24/2026" — canonical date display. Accepts Date or ISO/date-only string. */
export function formatDisplayDate(value: string | Date | null | undefined): string {
  const d = toDisplayDate(value);
  return d ? format(d, DISPLAY_DATE_FMT) : "";
}

/** "06/24/2026" — compact date for tables. */
export function formatDisplayDateShort(value: string | Date | null | undefined): string {
  const d = toDisplayDate(value);
  return d ? format(d, DISPLAY_DATE_SHORT_FMT) : "";
}

/** "09:00 AM" — canonical time display. Accepts "HH:mm", "HH:mm:ss", or a Date. */
export function formatDisplayTime(value: string | Date | null | undefined): string {
  const d = toDisplayDate(value);
  return d ? format(d, DISPLAY_TIME_FMT) : "";
}

/** "Wednesday, 06/24/2026 at 09:00 AM" — combined date + time from a full timestamp. */
export function formatDisplayDateTime(value: string | Date | null | undefined): string {
  const d = value instanceof Date ? value : value ? new Date(value) : null;
  return d && !isNaN(d.getTime()) ? format(d, `${DISPLAY_DATE_FMT} 'at' ${DISPLAY_TIME_FMT}`) : "";
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
