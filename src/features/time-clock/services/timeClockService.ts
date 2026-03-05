import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { TimeEntry, PaidPeriod } from "../types/timeClock.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

/** Join employee data into entries via a separate SELECT + Map (avoids RLS issues). */
async function joinEmployees(entries: Array<{ employee_id: string } & Record<string, unknown>>) {
  if (!entries.length) return [];
  const ids = [...new Set(entries.map((e) => e.employee_id))];
  const { data: employees, error } = await supabase
    .from("employees")
    .select("id, first_name, last_name, position, hourly_rate, email, phone, avatar_url")
    .in("id", ids);
  if (error) throw error;
  const map = new Map(employees?.map((e) => [e.id, e]) ?? []);
  return entries.map((entry) => ({ ...entry, employees: map.get(entry.employee_id) ?? null })) as TimeEntry[];
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Fetch all time entries for a given date that have a clock-in time. */
export async function fetchTodayEntries(date: string): Promise<TimeEntry[]> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("time_entries")
    .select("*, route_appointments(scheduled_time, end_time, clients(full_name))")
    .eq("user_id", userId)
    .eq("date", date)
    .not("clock_in_time", "is", null)
    .order("clock_in_time", { ascending: false });
  if (error) throw error;
  if (!data?.length) return [];
  return joinEmployees(data);
}

/** Fetch scheduled (future) time entries ordered by date ascending. */
export async function fetchScheduledEntries(): Promise<TimeEntry[]> {
  const userId = await getAuthUserId();
  const today = format(new Date(), "yyyy-MM-dd");
  const { data, error } = await supabase
    .from("time_entries")
    .select("*, route_appointments(scheduled_time, end_time, clients(full_name))")
    .eq("user_id", userId)
    .eq("status", "scheduled")
    .gt("date", today)
    .order("date", { ascending: true });
  if (error) throw error;
  if (!data?.length) return [];
  return joinEmployees(data);
}

/** Fetch all clocked-in entries within a date range, ordered by date descending. */
export async function fetchAllEntries(from: string, to: string): Promise<TimeEntry[]> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("time_entries")
    .select("*, route_appointments(scheduled_time, end_time, clients(full_name))")
    .eq("user_id", userId)
    .not("clock_in_time", "is", null)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });
  if (error) throw error;
  if (!data?.length) return [];
  return joinEmployees(data);
}

/** Fetch time entries for a single employee within a date range. */
export async function fetchEmployeeEntries(
  empId: string,
  from: string,
  to: string,
): Promise<TimeEntry[]> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("time_entries")
    .select("*, route_appointments(end_time)")
    .eq("user_id", userId)
    .eq("employee_id", empId)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });
  if (error) throw error;
  if (!data?.length) return [];
  // Join single employee
  const { data: emp } = await supabase
    .from("employees")
    .select("id, first_name, last_name, position, hourly_rate, email, phone, avatar_url")
    .eq("id", empId)
    .maybeSingle();
  return data.map((entry) => ({ ...entry, employees: emp ?? null })) as TimeEntry[];
}

/** Fetch all paid periods for a given employee. */
export async function fetchPaidPeriods(empId: string): Promise<PaidPeriod[]> {
  const userId = await getAuthUserId();
  const { data, error } = await (supabase as any)
    .from("paid_periods")
    .select("*")
    .eq("user_id", userId)
    .eq("employee_id", empId)
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PaidPeriod[];
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Insert a new paid period record. */
export async function markAsPaid(
  empId: string,
  startDate: string,
  endDate: string,
): Promise<void> {
  const userId = await getAuthUserId();
  const { error } = await (supabase as any)
    .from("paid_periods")
    .insert({ user_id: userId, employee_id: empId, start_date: startDate, end_date: endDate });
  if (error) throw error;
}

/** Update time fields on a time entry with audit trail. */
export async function updateTimeEntryTimes(
  id: string,
  fields: Record<string, string>,
  userId: string,
): Promise<void> {
  const updateObj: Record<string, unknown> = {
    ...fields,
    manually_edited: true,
    edited_by: userId,
    edited_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("time_entries").update(updateObj).eq("id", id);
  if (error) throw error;
}
