export interface TimeEntry {
  id: string;
  user_id: string;
  employee_id: string;
  date: string;
  clock_in_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
  clock_out_time: string | null;
  total_hours: number | null;
  total_break_minutes: number;
  status: "active" | "completed" | "scheduled" | "manual";
  route_appointment_id: string | null;
  notes: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  manually_edited: boolean;
  edited_by: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  employees: {
    first_name: string;
    last_name: string;
    position: string;
    hourly_rate: number | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  route_appointments: {
    scheduled_time: string | null;
    end_time: string | null;
    clients: { full_name: string } | null;
  } | null;
}

export interface PaidPeriod {
  id: string;
  user_id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftTimeFields {
  id: string;
  date: string;
  clock_in_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
  clock_out_time: string | null;
}

export interface EditChange {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}
