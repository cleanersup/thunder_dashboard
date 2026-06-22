/**
 * @module dashboardService
 * Raw Supabase queries for the Dashboard feature.
 * All functions require an authenticated user session.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Activity, TodayRoute } from "../types/dashboard.types";

// ─── Count stats ──────────────────────────────────────────────────────────────

/**
 * Returns the count of active clients (status ilike 'active').
 * @throws {Error} On Supabase query failure
 */
export async function fetchClientsCount(): Promise<number> {
  const { count, error } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .ilike("status", "active");
  if (error) throw error;
  return count ?? 0;
}

/**
 * Returns the count of active employees (status = 'Active').
 * @throws {Error} On Supabase query failure
 */
export async function fetchEmployeesCount(): Promise<number> {
  const { count, error } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("status", "Active");
  if (error) throw error;
  return count ?? 0;
}

/**
 * Returns the count of open leads (status != 'Closed').
 * @throws {Error} On Supabase query failure
 */
export async function fetchLeadsCount(): Promise<number> {
  const { count, error } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .neq("status", "Closed");
  if (error) throw error;
  return count ?? 0;
}

/**
 * Returns the total bookings count.
 * @throws {Error} On Supabase query failure
 */
export async function fetchBookingsCount(): Promise<number> {
  const { count, error } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

// ─── Activities ───────────────────────────────────────────────────────────────

/**
 * Fetches today's activities for the current user, newest first.
 * @throws {Error} On Supabase query failure
 */
export async function fetchActivities(): Promise<Activity[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", todayStart.toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type as Activity["type"],
    title: row.title,
    timestamp: row.created_at,
    estimateNumber: row.estimate_number ?? undefined,
    invoiceNumber: row.invoice_number ?? undefined,
    clientName: row.client_name ?? undefined,
    amount: row.amount ?? undefined,
  }));
}

// ─── Today's routes ───────────────────────────────────────────────────────────

/**
 * Fetches routes that have appointments scheduled for a given date.
 * @param date - Date string in YYYY-MM-DD format (user's local timezone)
 * @returns List of unique routes with their service counts for the day
 * @throws {Error} On Supabase query failure
 */
export async function fetchTodayRoutes(date: string): Promise<TodayRoute[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: appointments, error } = await supabase
    .from("route_appointments")
    .select(`route_id, routes ( id, name )`)
    .eq("user_id", user.id)
    .eq("scheduled_date", date);

  if (error) throw error;
  if (!appointments) return [];

  // Count services per route
  const serviceCountMap: Record<string, number> = {};
  for (const apt of appointments) {
    if (apt.routes) {
      const id = (apt.routes as { id: string; name: string }).id;
      serviceCountMap[id] = (serviceCountMap[id] ?? 0) + 1;
    }
  }

  // Deduplicate routes
  const seen = new Set<string>();
  const routes: TodayRoute[] = [];
  for (const apt of appointments) {
    if (!apt.routes) continue;
    const r = apt.routes as { id: string; name: string };
    if (!seen.has(r.id)) {
      seen.add(r.id);
      routes.push({ id: r.id, name: r.name, serviceCount: serviceCountMap[r.id] ?? 0 });
    }
  }
  return routes;
}
