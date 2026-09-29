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
function formatTimeHm(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 5);
}

/** Start/end window, falling back to due date when no window was set. */
export function formatTaskSchedule(task: {
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  due_date?: string | null;
}): string {
  const startDay = task.start_date ? formatDueDate(task.start_date) : "";
  const endDay   = task.end_date ? formatDueDate(task.end_date) : "";
  const startT   = formatTimeHm(task.start_time);
  const endT     = formatTimeHm(task.end_time);

  if (startDay || endDay || startT || endT) {
    const start = [startDay, startT].filter(Boolean).join(" ");
    const end   = [endDay, endT].filter(Boolean).join(" ");
    if (start && end) return `${start} – ${end}`;
    return start || end;
  }

  return formatDueDate(task.due_date ?? null);
}

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
