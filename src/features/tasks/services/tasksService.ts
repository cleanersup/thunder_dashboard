import { supabase } from "@/integrations/supabase/client";
import type { TaskInsert, TaskUpdate } from "../types/task.types";

/**
 * Fetches all tasks for the authenticated user, ordered by creation date descending.
 */
export async function fetchTasks() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("tasks")
    .select("*, clients(id, full_name, company, phone, email)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetches a single task by ID, including linked client info.
 * @param id - The task UUID
 */
export async function fetchTask(id: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, clients(id, full_name, company, phone, email)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Creates a new task record.
 * @param payload - Task insert payload (without user_id)
 */
export async function createTask(payload: Omit<TaskInsert, "user_id">) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...payload, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Updates an existing task record.
 * @param id - The task UUID
 * @param payload - Fields to update
 */
export async function updateTask(id: string, payload: TaskUpdate) {
  const { data, error } = await supabase
    .from("tasks")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Deletes a task record by ID.
 * @param id - The task UUID
 */
export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}
