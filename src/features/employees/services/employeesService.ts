import { supabase } from "@/integrations/supabase/client";
import type { EmployeeFormData } from "../schemas/employeeSchema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  birthday: string | null;
  position: string | null;
  hourly_rate: number | null;
  status: string;
  street: string | null;
  apt_suite: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  available_days: Record<string, { AM: boolean; PM: boolean; NIGHT: boolean }> | null;
  additional_notes: string | null;
  documents: string[] | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string | null;
  user_id: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

function splitName(fullName: string) {
  const parts    = fullName.trim().split(/\s+/);
  const first    = parts[0] ?? "";
  const last     = parts.slice(1).join(" ") || ".";
  return { first_name: first, last_name: last };
}

function buildInsertPayload(data: EmployeeFormData, userId: string) {
  const { first_name, last_name } = splitName(data.full_name);
  return {
    first_name,
    last_name,
    email:            data.email,
    phone:            data.phone.replace(/\D/g, ""),
    gender:           data.gender,
    birthday:         data.birthday,
    position:         data.position         ?? "",
    hourly_rate:      data.hourly_rate      ?? null,
    street:           data.street           ?? null,
    apt_suite:        data.apt_suite        ?? null,
    city:             data.city             ?? null,
    state:            data.state            ?? null,
    zip:              data.zip              ?? null,
    available_days:   data.available_days   ?? null,
    additional_notes: data.additional_notes ?? null,
    documents:        data.documents?.length ? data.documents : null,
    status:           "active",
    user_id:          userId,
  };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Fetches only active employees — lightweight picker list (id + name).
 * Used by scheduling/task forms to assign employees.
 */
export async function fetchEmployees() {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("employees")
    .select("id, first_name, last_name")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("first_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id,
    name: `${e.first_name} ${e.last_name}`.trim(),
  }));
}

/**
 * Fetches all employees (all statuses) with full fields for the Employees page.
 */
export async function fetchAllEmployees(): Promise<Employee[]> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Employee[];
}

/**
 * Fetches a single employee by ID.
 */
export async function fetchEmployeeById(id: string): Promise<Employee> {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Employee;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Creates a new employee record. Returns id + name for picker usage.
 */
export async function createEmployee(data: EmployeeFormData) {
  const userId = await getAuthUserId();
  const { data: created, error } = await supabase
    .from("employees")
    .insert(buildInsertPayload(data, userId))
    .select("id, first_name, last_name")
    .single();
  if (error) throw error;
  return created;
}

/**
 * Updates an existing employee record.
 */
export async function updateEmployee(id: string, data: EmployeeFormData): Promise<Employee> {
  const { first_name, last_name } = splitName(data.full_name);
  const { data: updated, error } = await supabase
    .from("employees")
    .update({
      first_name,
      last_name,
      email:            data.email,
      phone:            data.phone.replace(/\D/g, ""),
      gender:           data.gender,
      birthday:         data.birthday,
      position:         data.position         ?? "",
      hourly_rate:      data.hourly_rate      ?? null,
      street:           data.street           ?? null,
      apt_suite:        data.apt_suite        ?? null,
      city:             data.city             ?? null,
      state:            data.state            ?? null,
      zip:              data.zip              ?? null,
      available_days:   data.available_days   ?? null,
      additional_notes: data.additional_notes ?? null,
      documents:        data.documents?.length ? data.documents : null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return updated as Employee;
}

/**
 * Updates only the status field of an employee.
 */
export async function updateEmployeeStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("employees")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Guard check before deletion:
 * - Blocks if the employee has active/scheduled time_entries
 * - Blocks if the employee is assigned to future route_appointments
 * Returns a string with the reason if deletion should be blocked, null if safe to delete.
 */
export async function checkDeleteGuard(id: string): Promise<string | null> {
  const today = new Date().toISOString().split("T")[0];

  // Check active time entries
  const { data: timeEntries } = await supabase
    .from("time_entries")
    .select("id")
    .eq("employee_id", id)
    .in("status", ["scheduled", "in_progress"])
    .limit(1);

  if (timeEntries && timeEntries.length > 0) {
    return "This employee has active or scheduled shifts. Please complete or reassign them before deleting.";
  }

  // Check future route appointments
  const { data: appointments } = await supabase
    .from("route_appointments")
    .select("id, assigned_employees")
    .gte("scheduled_date", today);

  const hasFutureAppointment = (appointments ?? []).some((appt) => {
    const assigned = appt.assigned_employees as string[] | null;
    return assigned?.includes(id);
  });

  if (hasFutureAppointment) {
    return "This employee is assigned to upcoming appointments. Please reassign them before deleting.";
  }

  return null;
}

/**
 * Deletes an employee. Does NOT run the guard — caller is responsible for that.
 */
export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from("employees")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
