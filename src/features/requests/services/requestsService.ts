/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  BookingInsert, CustomQuestion, PublicCompanyProfile, Booking,
  BookingAttachmentMeta, RequestPayload,
} from "../types/request.types";

const STORAGE_BUCKET = "route-files";

async function uploadAttachment(
  file: File,
  userId: string,
  bookingId: string,
): Promise<BookingAttachmentMeta> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${userId}/bookings/${bookingId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return { path: storagePath, name: file.name, type: file.type, size: file.size, public_url: pub.publicUrl };
}

// ─── Internal (authenticated) ─────────────────────────────────────────────────

/**
 * Fetches all requests (bookings) for the authenticated business owner.
 * @returns Array of bookings ordered by creation date (newest first)
 */
export async function fetchRequests() {
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
 * Fetches a single request by ID.
 * @param id - The booking UUID
 */
export async function fetchRequest(id: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Updates the status of a request (e.g. to 'cancelled').
 * @param id - The booking UUID
 * @param status - New status value
 */
export async function updateRequestStatus(id: string, status: string) {
  const { error } = await supabase
    .from("bookings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Permanently deletes a request record.
 * @param id - The booking UUID
 */
export async function deleteRequest(id: string) {
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Converts a request to a CRM lead and then deletes the request.
 * Sets lead_source to "Booking Form".
 * @param booking - The full booking record to convert
 */
export async function convertRequestToLead(booking: {
  id: string; lead_name: string; email: string; phone: string;
  street: string; apt_suite: string | null; city: string; state: string;
  zip_code: string; service_type: string; service_details: string | null;
  preferred_date: string | null; time_preference: string | null;
}) {
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

  await deleteRequest(booking.id);
}

/**
 * Converts a request to a CRM client and then deletes the request.
 * @param booking - The full booking record to convert
 */
export async function convertRequestToClient(booking: {
  id: string; lead_name: string; email: string; phone: string;
  street: string; apt_suite: string | null; city: string; state: string;
  zip_code: string; service_details: string | null;
}) {
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

  await deleteRequest(booking.id);
}

// ─── Create / Update (from dashboard form) ───────────────────────────────────

/**
 * Creates a new request via the `create-booking` edge function, then uploads
 * any file attachments to storage and links the CRM contact.
 * @param userId - Authenticated user ID
 * @param payload - Full request form payload
 */
export async function createRequest(userId: string, payload: RequestPayload): Promise<void> {
  const { files, existingAttachments: _ea, client_id, lead_id, contact_type, client_property_id, ...textFields } = payload;

  const { data, error } = await supabase.functions.invoke<{ id: string }>("create-booking", {
    body: {
      ...textFields,
      business_owner_id: userId,
      status: "new",
      attachments: [],
    },
  });

  if (error) throw error;
  if (!data?.id) return;

  const uploadedMeta: BookingAttachmentMeta[] = [];
  if (files?.length) {
    for (const file of files) {
      try {
        const meta = await uploadAttachment(file, userId, data.id);
        uploadedMeta.push(meta);
      } catch (e) {
        console.error("requestsService.create upload error for", file.name, e);
      }
    }
  }

  if (uploadedMeta.length > 0) {
    await (supabase as any).from("bookings").update({ attachments: uploadedMeta }).eq("id", data.id);
  }

  if (client_id || lead_id) {
    await (supabase as any).from("bookings").update({
      client_id:          client_id ?? null,
      lead_id:            lead_id ?? null,
      contact_type:       contact_type ?? "anonymous",
      client_property_id: client_property_id ?? null,
    }).eq("id", data.id);
  } else if (contact_type === "anonymous") {
    try {
      await resolveOrCreateContact({ ...textFields, id: data.id } as Booking);
    } catch (e) {
      console.error("requestsService.create anonymous contact resolve error:", e);
    }
  }
}

/**
 * Updates an existing request and re-uploads any new attachments.
 * @param id - Booking UUID
 * @param payload - Updated request payload
 */
export async function updateRequest(id: string, payload: RequestPayload): Promise<void> {
  const { files, existingAttachments, client_id, lead_id, contact_type, client_property_id, ...textFields } = payload;

  const uploadedMeta: BookingAttachmentMeta[] = [];
  if (files?.length) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      for (const file of files) {
        try {
          const meta = await uploadAttachment(file, user.id, id);
          uploadedMeta.push(meta);
        } catch (e) {
          console.error("requestsService.update upload error for", file.name, e);
        }
      }
    }
  }

  const attachments = [...(existingAttachments ?? []), ...uploadedMeta];

  const { error } = await (supabase as any)
    .from("bookings")
    .update({ ...textFields, attachments })
    .eq("id", id);
  if (error) throw error;

  if (client_id || lead_id) {
    await (supabase as any).from("bookings").update({
      client_id:          client_id ?? null,
      lead_id:            lead_id ?? null,
      contact_type:       contact_type ?? "anonymous",
      client_property_id: client_property_id ?? null,
    }).eq("id", id);
  }
}

// ─── Request form editor ──────────────────────────────────────────────────────

/**
 * Fetches the custom questions for the authenticated user's booking forms.
 * @returns An array of booking form rows
 */
export async function fetchRequestForms() {
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
 * Saves custom questions for the request/booking form.
 * Replaces all existing questions for the user.
 * @param questions - Array of custom questions (residential + commercial combined)
 */
export async function saveRequestForms(questions: CustomQuestion[]) {
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

// ─── resolveOrCreateContact (for conversion flow) ────────────────────────────

/**
 * Finds an existing contact (client or lead) by email address.
 * @param email - Email to search for
 * @param userId - The authenticated user's ID
 */
async function findContactByEmail(
  email: string,
  userId: string,
): Promise<{ type: "client" | "lead"; id: string } | null> {
  const [clientResult, leadResult] = await Promise.all([
    supabase.from("clients").select("id").eq("user_id", userId).eq("email", email).maybeSingle(),
    supabase.from("leads").select("id").eq("user_id", userId).eq("email", email).maybeSingle(),
  ]);
  if (clientResult.data) return { type: "client", id: clientResult.data.id };
  if (leadResult.data)   return { type: "lead",   id: leadResult.data.id };
  return null;
}

/**
 * Finds an existing contact by name and phone when no email is available.
 * @param name - Full name to search for
 * @param phone - Phone number to search for
 * @param userId - The authenticated user's ID
 */
async function findContactByNamePhone(
  name: string,
  phone: string,
  userId: string,
): Promise<{ type: "client" | "lead"; id: string } | null> {
  const [clientResult, leadResult] = await Promise.all([
    supabase.from("clients").select("id").eq("user_id", userId).eq("full_name", name).eq("phone", phone).maybeSingle(),
    supabase.from("leads").select("id").eq("user_id", userId).eq("full_name", name).eq("phone", phone).maybeSingle(),
  ]);
  if (clientResult.data) return { type: "client", id: clientResult.data.id };
  if (leadResult.data)   return { type: "lead",   id: leadResult.data.id };
  return null;
}

/**
 * Resolves or creates a contact from a booking/request record.
 * First tries by email, then by name+phone. If no match, creates a new lead.
 * @param booking - The booking record from which to derive the contact
 * @returns The found or created contact reference
 */
export async function resolveOrCreateContact(
  booking: Booking,
): Promise<{ type: "client" | "lead"; id: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 0. If already linked, reuse the existing contact directly
  if (booking.client_id) return { type: "client", id: booking.client_id };
  if (booking.lead_id)   return { type: "lead",   id: booking.lead_id };

  // 1. Try by email
  if (booking.email) {
    const found = await findContactByEmail(booking.email, user.id);
    if (found) return found;
  }

  // 2. Try by name + phone
  if (booking.lead_name && booking.phone) {
    const found = await findContactByNamePhone(booking.lead_name, booking.phone, user.id);
    if (found) return found;
  }

  // 3. Create new lead
  const notes = [
    booking.service_details,
    booking.preferred_date ? `Preferred date: ${booking.preferred_date}` : null,
    booking.time_preference ? `Time preference: ${booking.time_preference}` : null,
  ].filter(Boolean).join("\n");

  const { data: newLead, error } = await supabase.from("leads").insert({
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
  }).select("id").single();
  if (error) throw error;

  return { type: "lead", id: newLead.id };
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
