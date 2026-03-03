import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { BookingInsert, CustomQuestion, PublicCompanyProfile } from "../types/booking.types";

// ─── Internal (authenticated) ─────────────────────────────────────────────────

/**
 * Fetches all bookings for the authenticated business owner.
 * @returns Array of bookings ordered by creation date (newest first)
 */
export async function fetchBookings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("business_owner_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetches a single booking by ID.
 * @param id - The booking UUID
 */
export async function fetchBooking(id: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Updates the status of a booking (e.g. to 'cancelled').
 * @param id - The booking UUID
 * @param status - New status value
 */
export async function updateBookingStatus(id: string, status: string) {
  const { error } = await supabase
    .from("bookings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Permanently deletes a booking record.
 * @param id - The booking UUID
 */
export async function deleteBooking(id: string) {
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Converts a booking to a CRM lead and then deletes the booking.
 * Sets lead_source to "Booking Form".
 * @param booking - The full booking record to convert
 */
export async function convertBookingToLead(booking: { id: string; lead_name: string; email: string; phone: string; street: string; apt_suite: string | null; city: string; state: string; zip_code: string; service_type: string; service_details: string | null; preferred_date: string | null; time_preference: string | null; }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const notes = [
    booking.service_details,
    booking.preferred_date ? `Preferred date: ${booking.preferred_date}` : null,
    booking.time_preference ? `Time preference: ${booking.time_preference}` : null,
  ].filter(Boolean).join("\n");

  const { error: leadError } = await supabase.from("leads").insert({
    user_id:            user.id,
    full_name:          booking.lead_name,
    email:              booking.email,
    phone:              booking.phone,
    address:            booking.street,
    apt_suite:          booking.apt_suite,
    city:               booking.city,
    state:              booking.state,
    zip_code:           booking.zip_code,
    service_interested: booking.service_type,
    internal_notes:     notes || null,
    lead_source:        "Booking Form",
    status:             "new",
    priority_level:     "medium",
  });
  if (leadError) throw leadError;

  await deleteBooking(booking.id);
}

/**
 * Converts a booking to a CRM client and then deletes the booking.
 * Billing and service addresses are set from the booking address.
 * @param booking - The full booking record to convert
 */
export async function convertBookingToClient(booking: { id: string; lead_name: string; email: string; phone: string; street: string; apt_suite: string | null; city: string; state: string; zip_code: string; service_details: string | null; }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error: clientError } = await supabase.from("clients").insert({
    user_id:            user.id,
    full_name:          booking.lead_name,
    email:              booking.email,
    phone:              booking.phone,
    client_type:        "residential",
    contact_preference: "phone",
    billing_street:     booking.street,
    billing_apt:        booking.apt_suite,
    billing_city:       booking.city,
    billing_state:      booking.state,
    billing_zip:        booking.zip_code,
    service_street:     booking.street,
    service_apt:        booking.apt_suite,
    service_city:       booking.city,
    service_state:      booking.state,
    service_zip:        booking.zip_code,
    instructions:       booking.service_details ?? null,
    status:             "active",
  });
  if (clientError) throw clientError;

  await deleteBooking(booking.id);
}

// ─── Booking form editor ──────────────────────────────────────────────────────

/**
 * Fetches the custom questions for the authenticated user's booking forms.
 * @returns An object with residential and commercial question arrays
 */
export async function fetchBookingForms() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("booking_forms")
    .select("*")
    .eq("user_id", user.id);
  if (error) throw error;
  return data ?? [];
}

/**
 * Saves custom questions for the booking form.
 * Replaces all existing questions for the user.
 * @param questions - Array of custom questions (residential + commercial combined)
 */
export async function saveBookingForms(questions: CustomQuestion[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase.from("booking_forms").delete().eq("user_id", user.id);

  const residential = questions.filter((q) => q.formType === "residential");
  const commercial  = questions.filter((q) => q.formType === "commercial");

  const inserts = [];
  if (residential.length > 0) {
    inserts.push({ user_id: user.id, form_type: "residential", custom_questions: residential as unknown as Json });
  }
  if (commercial.length > 0) {
    inserts.push({ user_id: user.id, form_type: "commercial", custom_questions: commercial as unknown as Json });
  }
  if (inserts.length > 0) {
    const { error } = await supabase.from("booking_forms").insert(inserts);
    if (error) throw error;
  }
}

// ─── Public (unauthenticated) ─────────────────────────────────────────────────

/**
 * Fetches the public company profile for the given business owner.
 * Used on the public booking form (no auth required).
 * @param userId - The business owner's user ID
 */
export async function fetchPublicProfile(userId: string): Promise<PublicCompanyProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("company_name, company_logo, company_email")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fetches the custom questions for the public booking form.
 * @param userId - The business owner's user ID
 */
export async function fetchPublicBookingForms(userId: string) {
  const { data, error } = await supabase
    .from("booking_forms")
    .select("form_type, custom_questions")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

/**
 * Submits a booking from the public form (no auth required).
 * @param userId - The business owner's user ID
 * @param payload - Booking data collected from the public form
 */
export async function submitPublicBooking(
  userId: string,
  payload: Omit<BookingInsert, "business_owner_id" | "status">,
) {
  const { error } = await supabase
    .from("bookings")
    .insert({ ...payload, business_owner_id: userId, status: "new" });
  if (error) throw error;
}
