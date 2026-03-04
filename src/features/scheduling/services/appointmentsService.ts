/**
 * @module appointmentsService
 * CRUD operations for the route_appointments table via Supabase.
 */
import { supabase } from "@/integrations/supabase/client";
import { addWeeks, addMonths, format, parseISO, setDay, startOfWeek } from "date-fns";
import type {
  AppointmentWithClient,
  RouteAppointment,
  AppointmentFormData,
  AppointmentFilters,
  DeleteAppointmentMode,
} from "../types/scheduling.types";

const APPOINTMENT_SELECT = `
  *,
  clients (
    id, full_name, phone, email,
    service_street, service_apt, service_city, service_state, service_zip
  ),
  routes ( id, name )
`;

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function fetchAppointments(
  filters?: AppointmentFilters,
): Promise<AppointmentWithClient[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  let query = supabase
    .from("route_appointments")
    .select(APPOINTMENT_SELECT)
    .eq("user_id", user.id)
    .order("scheduled_date", { ascending: false })
    .order("scheduled_time", { ascending: true });

  if (filters?.routeId) query = query.eq("route_id", filters.routeId);
  if (filters?.dateFrom) query = query.gte("scheduled_date", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("scheduled_date", filters.dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as AppointmentWithClient[];
}

export async function fetchAppointment(id: string): Promise<AppointmentWithClient> {
  const { data, error } = await supabase
    .from("route_appointments")
    .select(APPOINTMENT_SELECT)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as AppointmentWithClient;
}

// ─── Recurring date generation ────────────────────────────────────────────────

function generateRecurringDates(formData: AppointmentFormData): string[] {
  const {
    scheduled_date,
    recurring_frequency,
    recurring_duration,
    recurring_duration_unit,
    selected_week_days,
  } = formData;

  if (!recurring_frequency || recurring_frequency === "none") {
    return [scheduled_date];
  }

  const duration = parseInt(recurring_duration ?? "1", 10);
  const unit = recurring_duration_unit ?? "months";
  const startDate = parseISO(scheduled_date);

  let endDate: Date;
  if (unit === "months") {
    endDate = addMonths(startDate, duration);
  } else {
    endDate = addWeeks(startDate, duration);
  }

  const dates: string[] = [];
  let current = startDate;

  if (recurring_frequency === "weekly" && selected_week_days && selected_week_days.length > 0) {
    // Generate for each selected day of week
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    const dayNums = selected_week_days.map((d) => dayMap[d.toLowerCase()] ?? 0);

    let iter = startOfWeek(startDate, { weekStartsOn: 0 });
    while (iter <= endDate) {
      for (const dayNum of dayNums) {
        const candidate = setDay(iter, dayNum, { weekStartsOn: 0 });
        if (candidate >= startDate && candidate <= endDate) {
          dates.push(format(candidate, "yyyy-MM-dd"));
        }
      }
      iter = addWeeks(iter, 1);
    }
  } else if (recurring_frequency === "biweekly") {
    while (current <= endDate) {
      dates.push(format(current, "yyyy-MM-dd"));
      current = addWeeks(current, 2);
    }
  } else if (recurring_frequency === "monthly") {
    while (current <= endDate) {
      dates.push(format(current, "yyyy-MM-dd"));
      current = addMonths(current, 1);
    }
  } else {
    // weekly (no specific days)
    while (current <= endDate) {
      dates.push(format(current, "yyyy-MM-dd"));
      current = addWeeks(current, 1);
    }
  }

  return [...new Set(dates)].sort();
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createAppointment(
  data: AppointmentFormData,
): Promise<RouteAppointment[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const dates = generateRecurringDates(data);

  const rows = dates.map((date) => ({
    user_id: user.id,
    route_id: data.route_id,
    client_id: data.client_id,
    scheduled_date: date,
    scheduled_time: data.scheduled_time || null,
    end_time: data.end_time ?? null,
    service_type: data.service_type || null,
    cleaning_type: data.cleaning_type ?? null,
    assigned_employees: data.assigned_employees?.length
      ? (data.assigned_employees as unknown as import("@/integrations/supabase/types").Database["public"]["Tables"]["route_appointments"]["Insert"]["assigned_employees"])
      : null,
    notes: data.notes ?? null,
    status: "scheduled",
    deposit_required: data.deposit_required,
    deposit_amount: data.deposit_amount ?? null,
    recurring_frequency:
      data.recurring_frequency === "none" ? null : (data.recurring_frequency ?? null),
    recurring_duration: data.recurring_duration ?? null,
    recurring_duration_unit: data.recurring_duration_unit ?? null,
    selected_week_days: data.selected_week_days?.length
      ? (data.selected_week_days as unknown as import("@/integrations/supabase/types").Database["public"]["Tables"]["route_appointments"]["Insert"]["selected_week_days"])
      : null,
  }));

  const { data: created, error } = await supabase
    .from("route_appointments")
    .insert(rows)
    .select();

  if (error) throw error;
  return (created ?? []) as unknown as RouteAppointment[];
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateAppointment(
  id: string,
  data: Partial<AppointmentFormData>,
): Promise<RouteAppointment> {
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.route_id !== undefined) updatePayload.route_id = data.route_id;
  if (data.client_id !== undefined) updatePayload.client_id = data.client_id;
  if (data.scheduled_date !== undefined) updatePayload.scheduled_date = data.scheduled_date;
  if (data.scheduled_time !== undefined) updatePayload.scheduled_time = data.scheduled_time;
  if (data.end_time !== undefined) updatePayload.end_time = data.end_time;
  if (data.service_type !== undefined) updatePayload.service_type = data.service_type;
  if (data.cleaning_type !== undefined) updatePayload.cleaning_type = data.cleaning_type;
  if (data.notes !== undefined) updatePayload.notes = data.notes;
  if (data.deposit_required !== undefined) updatePayload.deposit_required = data.deposit_required;
  if (data.deposit_amount !== undefined) updatePayload.deposit_amount = data.deposit_amount;
  if (data.assigned_employees !== undefined)
    updatePayload.assigned_employees = data.assigned_employees;

  const { data: updated, error } = await supabase
    .from("route_appointments")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return updated as unknown as RouteAppointment;
}

export async function updateAppointmentStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("route_appointments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteAppointment(
  id: string,
  mode: DeleteAppointmentMode,
): Promise<void> {
  if (mode === "single") {
    const { error } = await supabase.from("route_appointments").delete().eq("id", id);
    if (error) throw error;
    return;
  }

  // "following" — fetch this appointment first, then delete it + all same-route later ones
  const { data: appt, error: fetchError } = await supabase
    .from("route_appointments")
    .select("route_id, scheduled_date")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from("route_appointments")
    .delete()
    .eq("route_id", appt.route_id)
    .gte("scheduled_date", appt.scheduled_date);

  if (error) throw error;
}
