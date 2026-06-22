import { parseISO } from "date-fns";
import { formatDisplayDate, formatDisplayDateTime } from "@/shared/utils/formatters";
import type { Json } from "@/integrations/supabase/types";

/**
 * Formats a task due date string for display in the UI.
 * Includes time if the stored value is a full ISO datetime; otherwise shows date only.
 *
 * @param due - ISO date or datetime string, or null
 * @returns Formatted date string, or "—" if null/invalid
 */
export function formatDueDate(due: string | null): string {
  if (!due) return "—";
  try {
    const parsed = parseISO(due);
    return due.length > 10
      ? formatDisplayDateTime(parsed)
      : formatDisplayDate(parsed);
  } catch {
    return due;
  }
}

/**
 * Extracts the display name of the first assigned employee from the JSON field.
 * The `assigned_employees` column stores an array of employee objects.
 *
 * @param assigned - Raw JSON value from the tasks.assigned_employees column
 * @returns Employee name string, or "Unassigned" if empty/missing
 */
export function getAssignedName(assigned: Json): string {
  if (!assigned) return "Unassigned";
  if (Array.isArray(assigned) && assigned.length > 0) {
    const first = assigned[0] as Record<string, unknown>;
    return (first?.name as string) ?? (first?.full_name as string) ?? "Unassigned";
  }
  return "Unassigned";
}

/**
 * Extracts display names for all assigned employees from the JSON field.
 *
 * @param assigned - Raw JSON value from the tasks.assigned_employees column
 * @returns Array of employee name strings
 */
export function getAssignedNames(assigned: Json): string[] {
  if (!assigned || !Array.isArray(assigned) || assigned.length === 0) return [];
  return assigned.map((e) => {
    const emp = e as Record<string, unknown>;
    return (emp?.name as string) ?? (emp?.full_name as string) ?? "Unknown";
  });
}
