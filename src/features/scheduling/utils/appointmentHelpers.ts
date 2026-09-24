/**
 * @module appointmentHelpers
 * Shared pure utility functions for the scheduling feature.
 * Single source of truth — avoids duplicating the same logic across
 * AppointmentDetailModal, AppointmentPreviewStep, AppointmentStaffStep,
 * AppointmentScheduleStep, and AppointmentCard.
 */
import { formatDisplayTime } from "@/shared/utils/formatters";

// ─── Time ─────────────────────────────────────────────────────────────────────

/**
 * Formats a "HH:MM" time string to the unified "09:00 AM" display.
 * Returns "" if time is null/undefined.
 */
export function formatTime(time: string | null | undefined): string {
  return formatDisplayTime(time) || (time ?? "");
}

/**
 * Returns the number of hours between two "HH:MM" strings,
 * or null if either value is missing or the result is not positive.
 */
export function calculateTotalHours(
  start: string | null | undefined,
  end: string | null | undefined,
): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff / 60 : null;
}

// ─── Labor cost ───────────────────────────────────────────────────────────────

/**
 * Sums up hourly_rate × totalHours for each employee.
 * Returns null when totalHours is null/non-positive or no employee has a rate.
 */
export function calculateLaborCost(
  employees: { hourly_rate: number | null }[],
  totalHours: number | null,
): number | null {
  if (!totalHours || totalHours <= 0 || employees.length === 0) return null;
  const cost = employees.reduce((sum, emp) => {
    if (!emp.hourly_rate) return sum;
    return sum + emp.hourly_rate * totalHours;
  }, 0);
  return cost > 0 ? cost : null;
}

// ─── Address ──────────────────────────────────────────────────────────────────

type ClientAddressFields = {
  service_street?: string | null;
  service_apt?: string | null;
  service_city?: string | null;
  service_state?: string | null;
  service_zip?: string | null;
};

/**
 * Builds a display-ready address string from service address fields.
 * Returns "" for null/undefined input.
 */
export function buildClientAddress(client: ClientAddressFields | null | undefined): string {
  if (!client) return "";
  const cityStateZip = [client.service_city, client.service_state, client.service_zip]
    .filter(Boolean)
    .join(" ");
  return [client.service_street, client.service_apt, cityStateZip]
    .filter(Boolean)
    .join(", ");
}

// ─── Recurring frequency ──────────────────────────────────────────────────────

export const RECURRING_FREQ_OPTIONS = [
  { value: "multiple",  label: "Multiple times per week" },
  { value: "weekly",    label: "Once per week"           },
  { value: "biweekly",  label: "Every 2 weeks"           },
  { value: "triweekly", label: "Every 3 weeks"           },
  { value: "monthly",   label: "Once per month"          },
] as const;

/** Derived lookup map — same data as RECURRING_FREQ_OPTIONS, keyed by value. */
export const RECURRING_FREQ_LABELS: Record<string, string> = Object.fromEntries(
  RECURRING_FREQ_OPTIONS.map(({ value, label }) => [value, label]),
);
