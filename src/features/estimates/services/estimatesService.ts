import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { DraftData, EstimateInsert, EstimateUpdate } from "../types/estimate.types";

// ─── Estimates CRUD ───────────────────────────────────────────────────────────

/**
 * Fetches all estimates for the authenticated user, newest first.
 * @returns Array of estimate rows
 * @throws On Supabase query failure or unauthenticated
 */
export async function fetchEstimates() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("estimates")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "Deleted")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetches a single estimate by ID.
 * @param id - The estimate UUID
 * @throws On Supabase query failure
 */
export async function fetchEstimate(id: string) {
  const { data, error } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Creates a new estimate for the authenticated user.
 * @param payload - Estimate fields (user_id is injected automatically)
 * @throws On Supabase query failure or unauthenticated
 */
export async function createEstimate(payload: Omit<EstimateInsert, "user_id">) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("estimates")
    .insert({ ...payload, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Updates an existing estimate.
 * @param id     - The estimate UUID
 * @param update - Partial fields to update
 * @throws On Supabase query failure
 */
export async function updateEstimate(id: string, update: EstimateUpdate) {
  const { data, error } = await supabase
    .from("estimates")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Updates only the status field of an estimate.
 * @param id     - The estimate UUID
 * @param status - New status value
 * @throws On Supabase query failure
 */
export async function updateEstimateStatus(id: string, status: string) {
  const { error } = await supabase
    .from("estimates")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Soft-deletes an estimate by setting status to 'Deleted'.
 * Keeps the row in the DB so linked bookings/walkthroughs retain their reference.
 * @param id - The estimate UUID
 * @throws On Supabase query failure
 */
export async function deleteEstimate(id: string) {
  const { error } = await supabase
    .from("estimates")
    .update({ status: "Deleted", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ─── Share token ──────────────────────────────────────────────────────────────

/**
 * Generates (or returns existing) a public share token for an estimate.
 * Calls the `generate_estimate_share_token` Supabase RPC function.
 * @param estimateId - The estimate UUID
 * @returns The share token string
 * @throws On RPC failure
 */
export async function generateEstimateShareToken(estimateId: string): Promise<string> {
  const { data, error } = await supabase.rpc("generate_estimate_share_token", {
    estimate_id: estimateId,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Fetches an estimate by its public share token (no auth required).
 * Also marks the estimate as viewed if not already.
 * @param token - The public share token
 * @throws On Supabase query failure
 */
export async function fetchEstimateByToken(token: string) {
  const { data: estimate, error } = await supabase
    .from("estimates")
    .select("*")
    .eq("public_share_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!estimate) return null;

  // Mark as viewed if not already
  if (!estimate.viewed_at) {
    await supabase
      .from("estimates")
      .update({ viewed_at: new Date().toISOString() })
      .eq("id", estimate.id);
  }

  return estimate;
}

/**
 * Fetches the public company profile for the given user.
 * Used on the public estimate view page (no auth required).
 * @param userId - The business owner's user_id
 */
export async function fetchEstimateProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("company_name, company_logo, company_email, company_phone, company_address, company_city, company_state, company_zip")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Draft CRUD ───────────────────────────────────────────────────────────────

/**
 * Loads the most recent draft for the authenticated user by service type.
 * @param serviceType - "Residential" or "Commercial"
 * @returns The draft row or null
 */
export async function loadDraftEstimate(serviceType: "Residential" | "Commercial") {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("estimates")
    .select("id, draft_data, current_step, client_id, lead_id")
    .eq("user_id", user.id)
    .eq("service_type", serviceType)
    .eq("is_draft", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Upserts a draft estimate. Creates one on first call; updates on subsequent calls.
 * @param serviceType - "Residential" or "Commercial"
 * @param draftData   - Wizard snapshot to persist
 * @param draftId     - Existing draft ID (undefined = create new)
 * @returns The saved draft row
 */
export async function saveDraftEstimate(
  serviceType: "Residential" | "Commercial",
  draftData: DraftData,
  draftId?: string,
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const payload = {
    user_id:       user.id,
    service_type:  serviceType,
    is_draft:      true,
    current_step:  draftData.currentStep,
    draft_data:    draftData as unknown as Json,
    client_id:     draftData.clientId ?? null,
    lead_id:       draftData.leadId  ?? null,
    // Required fields filled with placeholder values during draft
    client_name:   "Draft",
    email:         "draft@placeholder.com",
    phone:         "0000000000",
    address:       "Draft",
    city:          "Draft",
    state:         "Draft",
    zip:           "00000",
    status:        "Draft",
    subtotal:      0,
    total:         0,
    estimate_date: new Date().toISOString(),
  };

  if (draftId) {
    const { data, error } = await supabase
      .from("estimates")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", draftId)
      .eq("user_id", user.id)
      .select("id")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("estimates")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Soft-deletes a draft estimate (same as deleteEstimate but scoped to drafts).
 * Keeps the row so any linked booking/walkthrough retains its reference.
 * @param draftId - The draft estimate UUID
 */
export async function deleteDraftEstimate(draftId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("estimates")
    .update({ status: "Deleted", updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("user_id", user.id);
}

// ─── Activities + Notifications ───────────────────────────────────────────────

/**
 * Logs an estimate activity (sent, accepted, canceled, etc.).
 * @param type           - Activity type key
 * @param estimateNumber - Short estimate number (e.g. "EST-ABC123")
 * @param clientName     - Client name for context
 * @param amount         - Estimate total
 */
export async function addEstimateActivity(
  type: "estimate_created" | "estimate_sent" | "estimate_accepted" | "estimate_canceled",
  estimateNumber: string,
  clientName: string,
  amount: number,
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("activities").insert({
    user_id:        user.id,
    type,
    title:          `Estimate ${estimateNumber} was ${type.split("_")[1]}`,
    estimate_number: estimateNumber,
    client_name:    clientName,
    amount,
  });
}

/**
 * Creates a notification for an estimate event.
 * @param userId  - The business owner's user_id
 * @param type    - Notification type
 * @param title   - Notification title
 * @param message - Notification message
 * @param relatedId - The estimate UUID
 */
export async function addEstimateNotification(
  userId: string,
  type:    string,
  title:   string,
  message: string,
  relatedId: string,
) {
  await supabase.from("notifications").insert({
    user_id:      userId,
    type,
    title,
    message,
    related_id:   relatedId,
    related_type: "estimate",
    is_read:      false,
  });
}
