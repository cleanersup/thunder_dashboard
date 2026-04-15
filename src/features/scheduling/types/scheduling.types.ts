// ─── Route ───────────────────────────────────────────────────────────────────

export interface Route {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// ─── Appointment ──────────────────────────────────────────────────────────────

export interface RouteAppointment {
  id: string;
  route_id: string;
  client_id: string;
  user_id: string;
  scheduled_date: string;          // "YYYY-MM-DD"
  scheduled_time: string | null;   // "HH:MM:SS"
  end_time: string | null;
  service_type: string | null;
  cleaning_type: string | null;
  assigned_employees: string[] | null;
  notes: string | null;
  status: string;                  // "scheduled" | "completed" | "cancelled"
  deposit_required: string | null; // "yes" | "no"
  deposit_amount: number | null;
  delivery_method: string | null;
  recurring_frequency: string | null; // "weekly" | "biweekly" | "monthly"
  recurring_duration: string | null;
  recurring_duration_unit: string | null;
  selected_week_days: string[] | null;
  estimate_id: string | null;
  uploaded_file: string | null;
  photos: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithClient extends RouteAppointment {
  clients: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
    service_street: string;
    service_apt: string | null;
    service_city: string;
    service_state: string;
    service_zip: string;
  };
  routes: { id: string; name: string };
}

// ─── Form Data ────────────────────────────────────────────────────────────────

export type AppointmentFormData = {
  route_id: string;
  client_id: string;
  scheduled_date: string;
  scheduled_time: string;
  end_time?: string | null;
  service_type: string;
  cleaning_type?: string | null;
  assigned_employees?: string[];
  notes?: string | null;
  deposit_required: "yes" | "no";
  deposit_amount?: number | null;
  recurring_frequency?: "none" | "weekly" | "biweekly" | "monthly" | "multiple" | "triweekly";
  recurring_duration?: string | null;
  recurring_duration_unit?: "months" | "weeks" | "years" | null;
  selected_week_days?: string[];
  delivery_method?: "email" | "sms" | "both" | null;
  /** Storage path for contract (set after upload) */
  uploaded_file?: string | null;
  /** Storage paths for photos (set after upload) */
  photos?: string[] | null;
  /** Linked estimate ID (set when appointment originates from an estimate) */
  estimate_id?: string | null;
};

export type DeleteAppointmentMode = "single" | "following";

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface AppointmentFilters {
  routeId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ─── SmartMap ─────────────────────────────────────────────────────────────────

export interface MapMarker {
  id: string;
  name: string;
  type: "lead" | "client" | "employee";
  address: string;
  phone?: string;
  email?: string;
  lat?: number;
  lng?: number;
}

export type SmartMapFilter = "all" | "lead" | "client" | "employee";
