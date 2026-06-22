/**
 * @module routesService
 * CRUD operations for the routes table via Supabase.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Route } from "../types/scheduling.types";

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all routes for the current authenticated user, ordered by name.
 */
export async function fetchRoutes(): Promise<Route[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("routes")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Route[];
}

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Create a new route with the given name.
 */
export async function createRoute(name: string): Promise<Route> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("routes")
    .insert({ name: name.trim(), user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Route;
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Rename an existing route.
 */
export async function updateRoute(id: string, name: string): Promise<Route> {
  const { data, error } = await supabase
    .from("routes")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Route;
}

// ─── Delete ──────────────────────────────────────────────────────────────────

/**
 * Delete a route (cascades to its appointments via FK constraint).
 */
export async function deleteRoute(id: string): Promise<void> {
  const { error } = await supabase.from("routes").delete().eq("id", id);
  if (error) throw error;
}
