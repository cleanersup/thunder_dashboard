import { supabase } from "@/integrations/supabase/client";
import type { WalkthroughFormData } from "../schemas/walkthroughSchema";
import { fetchContactInfo } from "../utils/walkthroughUtils";
export type { ContactInfo } from "../utils/walkthroughUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Walkthrough {
  id: string;
  user_id: string;
  walkthrough_type: string;
  service_type: string;
  client_id: string | null;
  lead_id: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration: number | null;
  assigned_employees: string[] | null;
  notes: string | null;
  status: string;
  completed_at: string | null;
  estimate_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalkthroughWithContact extends Walkthrough {
  contact_name: string;
  contact_phone?: string | null;
  contact_email?: string | null;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

type ContactRow = { name: string; phone: string | null; email: string | null };

function resolveContact(
  wt: { walkthrough_type: string; client_id: string | null; lead_id: string | null },
  clientMap:  Map<string, ContactRow>,
  leadMap:    Map<string, ContactRow>,
  bookingMap: Map<string, ContactRow>,
): ContactRow {
  if (wt.walkthrough_type === "client" && wt.client_id) {
    return clientMap.get(wt.client_id) ?? { name: "Unknown", phone: null, email: null };
  }
  if (wt.lead_id) {
    return leadMap.get(wt.lead_id) ?? bookingMap.get(wt.lead_id) ?? { name: "Unknown", phone: null, email: null };
  }
  return { name: "Unknown", phone: null, email: null };
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function fetchWalkthroughs(): Promise<WalkthroughWithContact[]> {
  const user = await getCurrentUser();

  const { data: walkthroughData, error } = await supabase
    .from("walkthroughs")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  if (!walkthroughData) return [];

  // Batch-fetch contacts for performance (avoids N+1)
  const clientIds  = walkthroughData.filter((w) => w.client_id).map((w) => w.client_id as string);
  const leadIds    = walkthroughData.filter((w) => w.lead_id).map((w) => w.lead_id as string);

  const [clientsResult, leadsResult, bookingsResult] = await Promise.all([
    clientIds.length > 0
      ? supabase.from("clients").select("id, full_name, phone, email").in("id", clientIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string; phone: string | null; email: string | null }> }),
    leadIds.length > 0
      ? supabase.from("leads").select("id, full_name, phone, email").in("id", leadIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string; phone: string | null; email: string | null }> }),
    leadIds.length > 0
      ? supabase.from("bookings").select("id, lead_name, phone, email").in("id", leadIds)
      : Promise.resolve({ data: [] as Array<{ id: string; lead_name: string; phone: string | null; email: string | null }> }),
  ]);

  const clientMap  = new Map<string, ContactRow>(
    (clientsResult.data ?? []).map((c) => [c.id, { name: c.full_name, phone: c.phone, email: c.email }])
  );
  const leadMap    = new Map<string, ContactRow>(
    (leadsResult.data ?? []).map((l) => [l.id, { name: l.full_name, phone: l.phone, email: l.email }])
  );
  const bookingMap = new Map<string, ContactRow>(
    (bookingsResult.data ?? []).map((b) => [b.id, { name: b.lead_name, phone: b.phone, email: b.email }])
  );

  return walkthroughData.map((wt) => {
    const contact = resolveContact(wt, clientMap, leadMap, bookingMap);
    return {
      ...(wt as unknown as Walkthrough),
      assigned_employees: Array.isArray(wt.assigned_employees) ? (wt.assigned_employees as string[]) : null,
      contact_name:  contact.name,
      contact_phone: contact.phone,
      contact_email: contact.email,
    };
  });
}

export async function fetchWalkthrough(id: string): Promise<WalkthroughWithContact> {
  const { data, error } = await supabase
    .from("walkthroughs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  const contact = await fetchContactInfo(data.walkthrough_type, data.client_id, data.lead_id);

  return {
    ...(data as unknown as Walkthrough),
    assigned_employees: Array.isArray(data.assigned_employees) ? (data.assigned_employees as string[]) : null,
    contact_name:  contact?.full_name  ?? "Unknown",
    contact_phone: contact?.phone      ?? null,
    contact_email: contact?.email      ?? null,
  };
}

export async function createWalkthrough(formData: WalkthroughFormData): Promise<Walkthrough> {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("walkthroughs")
    .insert({
      user_id:            user.id,
      walkthrough_type:   formData.walkthrough_type,
      client_id:          formData.client_id ?? null,
      lead_id:            formData.lead_id   ?? null,
      service_type:       formData.service_type,
      scheduled_date:     formData.scheduled_date,
      scheduled_time:     formData.scheduled_time,
      duration:           formData.duration ? parseInt(formData.duration) : null,
      assigned_employees: formData.assigned_employees ?? null,
      notes:              formData.notes ?? null,
      status:             "Scheduled",
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Walkthrough;
}

export async function updateWalkthrough(id: string, formData: Partial<WalkthroughFormData>): Promise<Walkthrough> {
  const updatePayload: Record<string, unknown> = {};
  if (formData.walkthrough_type   !== undefined) updatePayload.walkthrough_type   = formData.walkthrough_type;
  if (formData.client_id          !== undefined) updatePayload.client_id          = formData.client_id;
  if (formData.lead_id            !== undefined) updatePayload.lead_id            = formData.lead_id;
  if (formData.service_type       !== undefined) updatePayload.service_type       = formData.service_type;
  if (formData.scheduled_date     !== undefined) updatePayload.scheduled_date     = formData.scheduled_date;
  if (formData.scheduled_time     !== undefined) updatePayload.scheduled_time     = formData.scheduled_time;
  if (formData.duration           !== undefined) updatePayload.duration           = formData.duration ? parseInt(formData.duration) : null;
  if (formData.assigned_employees !== undefined) updatePayload.assigned_employees = formData.assigned_employees;
  if (formData.notes              !== undefined) updatePayload.notes              = formData.notes;

  const { data, error } = await supabase
    .from("walkthroughs")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Walkthrough;
}

export async function updateWalkthroughStatus(id: string, status: string): Promise<void> {
  const updatePayload: Record<string, unknown> = { status };
  if (status === "Completed") updatePayload.completed_at = new Date().toISOString();

  const { error } = await supabase
    .from("walkthroughs")
    .update(updatePayload)
    .eq("id", id);

  if (error) throw error;
  // NOTE: Side-effect notifications (edge functions) are handled in useWalkthroughs hooks.
}

export async function deleteWalkthrough(id: string): Promise<void> {
  const { error } = await supabase
    .from("walkthroughs")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ─── Form submission ──────────────────────────────────────────────────────────

/** Fetches a walkthrough + its contact info for the on-site form pages. */
export async function fetchWalkthroughForForm(id: string) {
  const { data, error } = await supabase
    .from("walkthroughs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const contactInfo = await fetchContactInfo(data.walkthrough_type, data.client_id, data.lead_id);
  return { ...data, contactInfo } as typeof data & { contactInfo: Awaited<ReturnType<typeof fetchContactInfo>> };
}

export interface ResidentialWalkthroughData {
  property_type:   string;
  service_type:    string;
  square_footage:  string;
  bedrooms:        string;
  kitchen:         string;
  living_room:     string;
  dining_room:     string;
  office:          string;
  full_bath:       string;
  half_bath:       string;
  fans:            string;
  oven:            string;
  refrigerator:    string;
  blinds:          string;
  windows_inside:  string;
  windows_outside: string;
  extra_services:  string[];
  has_pets:        string;
  notes:           string;
  photos:          string[];
}

export async function submitResidentialWalkthroughData(
  walkthroughId: string,
  formData: ResidentialWalkthroughData,
): Promise<void> {
  const user = await getCurrentUser();
  const { error } = await supabase
    .from("residential_walkthrough_data")
    .insert({ walkthrough_id: walkthroughId, user_id: user.id, ...formData });
  if (error) throw error;
}

export interface CommercialWalkthroughData {
  property_type:            string;
  property_size:            string;
  service_type:             string;
  service_schedule:         string;
  grease_level:             string;
  restaurant_condition:     string;
  extra_services:           string[];
  recurring_frequency:      string;
  selected_week_days:       string[];
  employee_count:           string;
  hourly_rate:              string;
  cleaning_duration:        string;
  start_time:               string;
  client_provides_supplies: boolean;
  notes:                    string;
  photos:                   string[];
}

export async function submitCommercialWalkthroughData(
  walkthroughId: string,
  formData: CommercialWalkthroughData,
): Promise<void> {
  const user = await getCurrentUser();
  const { error } = await supabase
    .from("commercial_walkthrough_data")
    .insert({ walkthrough_id: walkthroughId, user_id: user.id, ...formData });
  if (error) throw error;
}

// ─── Employees ────────────────────────────────────────────────────────────────

export interface AssignedEmployee {
  id: string;
  first_name: string;
  last_name: string;
}

export async function fetchAssignedEmployees(ids: string[]): Promise<AssignedEmployee[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("employees")
    .select("id, first_name, last_name")
    .in("id", ids);
  if (error) throw error;
  return (data ?? []) as AssignedEmployee[];
}

// ─── Current user ─────────────────────────────────────────────────────────────

export async function fetchCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
