import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { WalkthroughFormData } from "../schemas/walkthroughSchema";
import { fetchContactInfo } from "../utils/walkthroughUtils";
import {
  mapResidentialWalkthroughRowToPrefillFields,
  mapCommercialWalkthroughRowToPrefillFields,
  mergeWalkthroughEstimatePrefill,
  type ResidentialWalkthroughRow,
  type CommercialWalkthroughRow,
  type WalkthroughEstimatePrefill,
} from "../utils/walkthroughToEstimatePrefill";
export type { ContactInfo } from "../utils/walkthroughUtils";
export type { WalkthroughEstimatePrefill } from "../utils/walkthroughToEstimatePrefill";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Walkthrough {
  id: string;
  user_id: string;
  walkthrough_type: string;
  service_type: string;
  client_id: string | null;
  lead_id: string | null;
  property_id: string | null;
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
  contact_name:   string;
  contact_phone?: string | null;
  contact_email?: string | null;
  contact_street?: string | null;
  contact_city?:   string | null;
  contact_state?:  string | null;
  contact_zip?:    string | null;
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

  const contact = await fetchContactInfo(
    data.walkthrough_type,
    data.client_id,
    data.lead_id,
    (data as { property_id?: string | null }).property_id,
  );

  return {
    ...(data as unknown as Walkthrough),
    assigned_employees: Array.isArray(data.assigned_employees) ? (data.assigned_employees as string[]) : null,
    contact_name:   contact?.full_name      ?? "Unknown",
    contact_phone:  contact?.phone          ?? null,
    contact_email:  contact?.email          ?? null,
    contact_street: contact?.service_street ?? null,
    contact_city:   contact?.service_city   ?? null,
    contact_state:  contact?.service_state  ?? null,
    contact_zip:    contact?.service_zip    ?? null,
  };
}

/**
 * Loads completed on-site walkthrough data (if any) and merges into estimate `prefill` for navigation.
 */
export async function buildEstimatePrefillFromWalkthrough(
  w: WalkthroughWithContact,
): Promise<WalkthroughEstimatePrefill> {
  if (w.service_type === "residential") {
    const { data } = await supabase
      .from("residential_walkthrough_data")
      .select("*")
      .eq("walkthrough_id", w.id)
      .maybeSingle();
    const mapped = data
      ? mapResidentialWalkthroughRowToPrefillFields(data as ResidentialWalkthroughRow)
      : {};
    return mergeWalkthroughEstimatePrefill(w, mapped);
  }

  const { data } = await supabase
    .from("commercial_walkthrough_data")
    .select("*")
    .eq("walkthrough_id", w.id)
    .maybeSingle();
  const mapped = data
    ? mapCommercialWalkthroughRowToPrefillFields(data as CommercialWalkthroughRow)
    : {};
  return mergeWalkthroughEstimatePrefill(w, mapped);
}

/**
 * Converts a completed walkthrough into a **draft estimate immediately** (mirrors the
 * request→estimate flow): inserts a draft estimate with the walkthrough's on-site data
 * mapped into main_data/additional_data, then finalizes the walkthrough→estimate
 * conversion so the walkthrough is marked converted right away.
 *
 * Returns the draft id + the estimate form route. The caller opens the form in EDIT
 * mode (isEditing) so Discard never deletes the persisted draft.
 */
export async function createEstimateDraftFromWalkthrough(
  w: WalkthroughWithContact,
): Promise<{ estimateId: string; route: string; isResidential: boolean }> {
  const user = await getCurrentUser();
  const prefill = await buildEstimatePrefillFromWalkthrough(w);
  const p = prefill as Record<string, unknown>;
  const isResidential = w.service_type === "residential";
  const contactType = w.walkthrough_type; // 'client' | 'lead'
  const propertyId = (w as { property_id?: string | null }).property_id ?? null;

  // Resolve the real contact (client/lead) so the estimate's denormalized fields
  // (client_name, email, address…) are correct — w.contact_* isn't always populated.
  // Pass property_id so the address matches the selected service property.
  const contact = await fetchContactInfo(w.walkthrough_type, w.client_id, w.lead_id, propertyId);

  const num = (v: unknown, d = 0): number => (typeof v === "number" ? v : d);
  const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);

  // ── Build estimate payload from the walkthrough prefill ───────────────────
  const base = {
    user_id:        user.id,
    is_draft:       true,
    current_step:   0,
    client_name:    contact?.full_name      || w.contact_name  || "Draft",
    email:          contact?.email          || w.contact_email || "draft@placeholder.com",
    phone:          contact?.phone          || w.contact_phone || "0000000000",
    address:        contact?.service_street || w.contact_street || "Draft",
    city:           contact?.service_city   || w.contact_city   || "Draft",
    state:          contact?.service_state  || w.contact_state  || "NA",
    zip:            contact?.service_zip    || w.contact_zip    || "00000",
    subtotal:       0,
    total:          0,
    status:         "Draft",
    client_id:      contactType === "client" ? w.client_id : null,
    lead_id:        contactType === "lead"   ? w.lead_id   : null,
  };

  let payload: Record<string, unknown>;
  if (isResidential) {
    payload = {
      ...base,
      service_type:     "Residential",
      service_sub_type: str(p.selectedService),
      service_scope:    str(p.scope) || null,
      main_data: {
        squareFootage: str(p.squareFootage),
        bedrooms:    num(p.bedrooms),    kitchens:  num(p.kitchens),
        livingRooms: num(p.livingRooms), diningRooms: num(p.diningRooms),
        offices:     num(p.offices),     fullBaths: num(p.fullBaths), halfBaths: num(p.halfBaths),
      },
      additional_data: {
        fans: num(p.fans), oven: num(p.oven), refrigerator: num(p.refrigerator),
        blinds: num(p.blinds), windowsInside: num(p.windowsInside), windowsOutside: num(p.windowsOutside),
        propertyId,
      },
      extra_services: (p.extras as Record<string, boolean>) ?? {},
      pets:           p.pets === "yes" ? "Yes" : "No",
    };
  } else {
    const effPropType = p.isOtherProperty ? str(p.otherPropertyType) : str(p.propertyType);
    payload = {
      ...base,
      service_type:     "Commercial",
      service_sub_type: `${effPropType} - ${str(p.serviceType)}`,
      service_scope:    str(p.scopeDetails) || null,
      main_data: {
        propertyType: effPropType, propertySize: str(p.propertySize), serviceType: str(p.serviceType),
        employees: num(p.employeeCount), hourlyRate: str(p.hourlyRate), cleaningDuration: num(p.cleaningDuration),
        startTime: str(p.startTime), clientProvidesSupplies: p.clientProvidesSupplies === true,
        frequency: str(p.recurringFrequency), selectedWeekDays: Array.isArray(p.selectedWeekDays) ? p.selectedWeekDays : [],
        contractDuration: str(p.contractDuration), contractTimeUnit: str(p.contractTimeUnit, "months"),
      },
      additional_data: {
        serviceSchedule: str(p.serviceSchedule), greaseLevel: str(p.greaseLevel),
        restaurantCondition: str(p.restaurantCondition), dustLevel: str(p.dustLevel),
        propertyCondition: str(p.propertyCondition), extraServices: Array.isArray(p.extraServices) ? p.extraServices : [],
        propertyId,
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: draft, error } = await (supabase as any)
    .from("estimates")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;

  // Finalize the conversion immediately so the walkthrough is marked converted.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).rpc("finalize_walkthrough_to_estimate_conversion", {
      p_walkthrough_id: w.id,
      p_estimate_id:    draft.id,
    });
  } catch (rpcErr) {
    // Clean up the orphaned draft if the RPC fails so it doesn't pollute the list.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("estimates").update({ status: "Deleted" }).eq("id", draft.id);
    throw rpcErr;
  }

  return {
    estimateId:    draft.id,
    route:         isResidential ? "/estimates/new/residential" : "/estimates/new/commercial",
    isResidential,
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
      property_id:        formData.walkthrough_type === "client" ? (formData.property_id ?? null) : null,
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

export async function updateWalkthrough(id: string, formData: Partial<WalkthroughFormData>, newStatus?: string): Promise<Walkthrough> {
  const updatePayload: Record<string, unknown> = {};
  if (formData.walkthrough_type   !== undefined) updatePayload.walkthrough_type   = formData.walkthrough_type;
  if (formData.client_id          !== undefined) updatePayload.client_id          = formData.client_id;
  if (formData.lead_id            !== undefined) updatePayload.lead_id            = formData.lead_id;
  if (formData.property_id        !== undefined) updatePayload.property_id        = formData.property_id;
  if (formData.service_type       !== undefined) updatePayload.service_type       = formData.service_type;
  if (formData.scheduled_date     !== undefined) updatePayload.scheduled_date     = formData.scheduled_date;
  if (formData.scheduled_time     !== undefined) updatePayload.scheduled_time     = formData.scheduled_time;
  if (formData.duration           !== undefined) updatePayload.duration           = formData.duration ? parseInt(formData.duration) : null;
  if (formData.assigned_employees !== undefined) updatePayload.assigned_employees = formData.assigned_employees;
  if (formData.notes              !== undefined) updatePayload.notes              = formData.notes;
  if (newStatus                   !== undefined) updatePayload.status             = newStatus;

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
  const contactInfo = await fetchContactInfo(
    data.walkthrough_type,
    data.client_id,
    data.lead_id,
    (data as { property_id?: string | null }).property_id,
  );
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

/** Employee row fields used by walkthrough PDF (includes job title). */
export interface WalkthroughEmployeeForPdf {
  first_name: string;
  last_name: string;
  position: string;
}

export async function fetchEmployeesForWalkthroughPdf(
  ids: string[],
): Promise<WalkthroughEmployeeForPdf[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("employees")
    .select("first_name, last_name, position")
    .in("id", ids);
  if (error) throw error;
  return (data ?? []).map((e) => ({
    first_name: e.first_name,
    last_name: e.last_name,
    position: e.position ?? "",
  }));
}

type ResidentialWtRow = Database["public"]["Tables"]["residential_walkthrough_data"]["Row"];
type CommercialWtRow = Database["public"]["Tables"]["commercial_walkthrough_data"]["Row"];

/**
 * Fetches walkthrough, resolved contact, on-site data rows, and assigned employees for PDF export.
 */
export async function fetchWalkthroughPdfContext(walkthroughId: string): Promise<{
  walkthrough: WalkthroughWithContact;
  contact: Awaited<ReturnType<typeof fetchContactInfo>>;
  residential: ResidentialWtRow | null;
  commercial: CommercialWtRow | null;
  employees: WalkthroughEmployeeForPdf[];
}> {
  const walkthrough = await fetchWalkthrough(walkthroughId);
  const assigned = Array.isArray(walkthrough.assigned_employees)
    ? (walkthrough.assigned_employees as string[])
    : [];
  const [contact, resRes, comRes, employees] = await Promise.all([
    fetchContactInfo(
      walkthrough.walkthrough_type,
      walkthrough.client_id,
      walkthrough.lead_id,
      (walkthrough as { property_id?: string | null }).property_id,
    ),
    supabase.from("residential_walkthrough_data").select("*").eq("walkthrough_id", walkthroughId).maybeSingle(),
    supabase.from("commercial_walkthrough_data").select("*").eq("walkthrough_id", walkthroughId).maybeSingle(),
    fetchEmployeesForWalkthroughPdf(assigned),
  ]);
  return {
    walkthrough,
    contact,
    residential: resRes.data,
    commercial: comRes.data,
    employees,
  };
}

// ─── Current user ─────────────────────────────────────────────────────────────

export async function fetchCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
