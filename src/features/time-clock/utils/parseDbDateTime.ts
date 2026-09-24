import { format, isValid, parseISO } from "date-fns";

/**
 * Parse a Postgres TIME string ("HH:mm:ss" / optional fractional seconds) or a
 * full timestamp into a Date suitable for display (local wall clock for times).
 * Plain time strings are not parseable by `new Date()` in JS and caused RangeError
 * when passed to date-fns `format`.
 */
export function parseDbTimeOrTimestamp(value: string | null | undefined): Date | null {
  if (value == null) return null;
  const v = String(value).trim();
  if (!v) return null;

  const parsed = new Date(v);
  if (isValid(parsed)) return parsed;

  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/.exec(v);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2], 10);
    const s = timeMatch[3] != null ? parseInt(timeMatch[3], 10) : 0;
    if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s)) return null;
    if (h > 23 || m > 59 || s > 59) return null;
    const d = new Date(2000, 0, 1, h, m, s);
    return isValid(d) ? d : null;
  }
  return null;
}

export function formatDbTimeDisplay(
  value: string | null | undefined,
  fmt: string,
  empty = "—",
): string {
  const d = parseDbTimeOrTimestamp(value);
  if (!d) return empty;
  return format(d, fmt);
}

/** Calendar-only date from API (typically yyyy-MM-dd). */
export function parseEntryDate(dateStr: string | null | undefined): Date | null {
  if (dateStr == null) return null;
  const v = String(dateStr).trim();
  if (!v) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? parseISO(v) : new Date(v);
  return isValid(d) ? d : null;
}

export function formatEntryDateDisplay(
  dateStr: string | null | undefined,
  fmt: string,
  empty = "—",
): string {
  const d = parseEntryDate(dateStr);
  if (!d) return empty;
  return format(d, fmt);
}
