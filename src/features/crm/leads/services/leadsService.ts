import { supabase } from "@/integrations/supabase/client";
import type { LeadInsert, LeadUpdate } from "../../types/crm.types";
import { uploadLeadAttachments } from "./leadFilesService";

/**
 * Fetches all leads for the authenticated user, ordered by creation date descending.
 */
export async function fetchLeads() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetches a single lead by ID.
 * @param id - The lead UUID
 */
export async function fetchLead(id: string) {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Creates a new lead record.
 * @param payload - Lead insert payload (without user_id)
 */
export async function createLead(payload: Omit<LeadInsert, "user_id">) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...payload, user_id: user.id, status: payload.status ?? "new" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Creates a lead then uploads optional attachments and saves file metadata on the row.
 */
export async function createLeadWithOptionalAttachments(
  payload: Omit<LeadInsert, "user_id">,
  files?: File[],
) {
  const lead = await createLead(payload);
  if (!files?.length) return lead;
  const meta = await uploadLeadAttachments(lead.id, files);
  return updateLead(lead.id, { files: meta as unknown as LeadInsert["files"] });
}

/**
 * Updates an existing lead record.
 * @param id - The lead UUID
 * @param payload - Fields to update
 */
export async function updateLead(id: string, payload: LeadUpdate) {
  const { data, error } = await supabase
    .from("leads")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Deletes a lead record by ID.
 * @param id - The lead UUID
 */
export async function deleteLead(id: string) {
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Finds a lead by email address scoped to the given user.
 * @param userId - Owner user ID
 * @param email  - Email to search
 * @returns The lead record, or null if not found
 */
export async function findLeadByEmail(userId: string, email: string) {
  const { data } = await supabase
    .from("leads")
    .select("*")
    .eq("user_id", userId)
    .eq("email", email)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/**
 * Checks whether a client with the given email already exists for this user.
 * @param email - Email to look up
 * @param userId - Owner user ID
 * @returns The existing client record, or null if no duplicate found
 */
export async function checkClientDuplicate(email: string, userId: string) {
  const { data } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("user_id", userId)
    .eq("email", email)
    .maybeSingle();
  return data ?? null;
}

/**
 * Converts a lead to a client record.
 * Caller is responsible for validating required fields and checking duplicates first.
 * @param lead - The lead to convert
 * @returns The created client record
 */
export async function convertLeadToClient(lead: { user_id: string; full_name: string; company_name: string | null; phone: string; email: string; address: string; apt_suite: string | null; city: string; state: string; zip_code: string }) {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: lead.user_id,
      full_name: lead.full_name,
      company: lead.company_name,
      phone: lead.phone,
      email: lead.email,
      service_street: lead.address,
      service_apt: lead.apt_suite,
      service_city: lead.city,
      service_state: lead.state,
      service_zip: lead.zip_code,
      billing_street: lead.address,
      billing_apt: lead.apt_suite,
      billing_city: lead.city,
      billing_state: lead.state,
      billing_zip: lead.zip_code,
      client_type: "residential",
      contact_preference: "phone",
      status: "active",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
