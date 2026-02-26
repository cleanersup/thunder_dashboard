import { supabase } from "@/integrations/supabase/client";
import type { EmployeeFormData } from "../schemas/employeeSchema";

/**
 * Fetches all active employees for the authenticated user.
 * Returns only the fields needed for assignment pickers.
 */
export async function fetchEmployees() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("employees")
    .select("id, first_name, last_name")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("first_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id,
    name: `${e.first_name} ${e.last_name}`.trim(),
  }));
}

/**
 * Creates a new employee record.
 * Splits full_name into first_name / last_name and sets status = 'active'.
 */
export async function createEmployee(data: EmployeeFormData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const nameParts  = data.full_name.trim().split(/\s+/);
  const first_name = nameParts[0] ?? "";
  const last_name  = nameParts.slice(1).join(" ") || ".";   // DB requires last_name

  const { data: created, error } = await supabase
    .from("employees")
    .insert({
      first_name,
      last_name,
      email:            data.email,
      phone:            data.phone.replace(/\D/g, ""),        // strip formatting
      gender:           data.gender,
      birthday:         data.birthday,
      position:         data.position        ?? "",
      hourly_rate:      data.hourly_rate     ?? null,
      street:           data.street          ?? null,
      apt_suite:        data.apt_suite       ?? null,
      city:             data.city            ?? null,
      state:            data.state           ?? null,
      zip:              data.zip             ?? null,
      additional_notes: data.additional_notes ?? null,
      status:           "active",
      user_id:          user.id,
    })
    .select("id, first_name, last_name")
    .single();

  if (error) throw error;
  return created;
}
