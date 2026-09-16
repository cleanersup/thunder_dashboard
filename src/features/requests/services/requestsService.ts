/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  CustomQuestion, Booking,
  BookingAttachmentMeta, RequestPayload,
} from "../types/request.types";
import { formatTimePreference } from "@/shared/utils/timePreference";

/**
 * Los tipos generados de Supabase van por detrás de las migraciones (bookings
 * extendida, RPCs de booking). Helper local para no tocar los archivos generados.
 */
async function rpcUnsafe<T = unknown>(fn: string, args?: Record<string, unknown>) {
  return (supabase as any).rpc(fn, args ?? {}) as Promise<{ data: T; error: any }>;
}

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
 * Archiva un request. Usa el RPC `booking_archive` (mismo flujo que swift-slate):
 * el status no se escribe directo porque el RPC corre lógica server-side propia.
 * @param id - The booking UUID
 */
export async function archiveRequest(id: string) {
  const { error } = await rpcUnsafe("booking_archive", { p_booking_id: id });
  if (error) throw error;
}

/**
 * Cancela un request vía el RPC `booking_cancel`.
 * @param id - The booking UUID
 */
export async function cancelRequest(id: string) {
  const { error } = await rpcUnsafe("booking_cancel", { p_booking_id: id });
  if (error) throw error;
}

/**
 * Reactiva un request archivado vía el RPC `booking_restore`.
 * @param id - The booking UUID
 */
export async function restoreRequest(id: string) {
  const { error } = await rpcUnsafe("booking_restore", { p_booking_id: id });
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

// ─── Create / Update (from dashboard form) ───────────────────────────────────

/**
 * Creates a new request via the `create-booking` edge function, then uploads
 * any file attachments to storage and links the CRM contact.
 * @param userId - Authenticated user ID
 * @param payload - Full request form payload
 */
export async function createRequest(userId: string, payload: RequestPayload): Promise<void> {
  const { files, existingAttachments: _ea, client_id, contact_type, client_property_id, ...textFields } = payload;

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

  if (client_id) {
    await (supabase as any).from("bookings").update({
      client_id,
      lead_id:            null,
      contact_type:       contact_type ?? "client",
      client_property_id: client_property_id ?? null,
    }).eq("id", data.id);
  }
}

/**
 * Updates an existing request and re-uploads any new attachments.
 * @param id - Booking UUID
 * @param payload - Updated request payload
 */
export async function updateRequest(id: string, payload: RequestPayload): Promise<void> {
  const { files, existingAttachments, client_id, contact_type, client_property_id, ...textFields } = payload;

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

  if (client_id) {
    await (supabase as any).from("bookings").update({
      client_id,
      lead_id:            null,
      contact_type:       contact_type ?? "client",
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

export interface ContactMatch {
  type: "client";
  id:   string;
}

/**
 * Devuelve la mejor coincidencia de una query sobre `clients`.
 * Usa `order(updated_at desc) + limit(1)` para no fallar si la DB tiene filas
 * duplicadas — simplemente toma la más reciente.
 */
async function pickFirstClient(query: any): Promise<ContactMatch | null> {
  const { data, error } = await query.order("updated_at", { ascending: false }).limit(1);
  if (error || !data?.length) return null;
  return { type: "client", id: data[0].id as string };
}

/**
 * Busca un client por email (case-insensitive).
 * @param email - Email to search for
 * @param userId - The authenticated user's ID
 */
async function findClientByEmail(email: string, userId: string): Promise<ContactMatch | null> {
  if (!email.trim()) return null;
  return pickFirstClient(
    supabase.from("clients").select("id").eq("user_id", userId).ilike("email", email.trim()),
  );
}

/**
 * Deduplicación de respaldo cuando el request no trae email: nombre + teléfono.
 * @param name - Full name to search for
 * @param phone - Phone number to search for
 * @param userId - The authenticated user's ID
 */
async function findClientByNamePhone(
  name: string,
  phone: string,
  userId: string,
): Promise<ContactMatch | null> {
  if (!name.trim() || !phone.trim()) return null;
  return pickFirstClient(
    supabase
      .from("clients")
      .select("id")
      .eq("user_id", userId)
      .ilike("full_name", name.trim())
      .ilike("phone", phone.trim()),
  );
}

/**
 * Crea un client a partir de un request anónimo (form público).
 * Las direcciones de billing y service se copian de la dirección del request.
 * @param booking - The booking record from which to derive the client
 * @param userId - The authenticated user's ID
 */
async function createClientFromRequest(booking: Booking, userId: string): Promise<string> {
  const additionalServices = Array.isArray(booking.additional_services)
    ? (booking.additional_services as string[])
    : [];

  const notes = [
    booking.service_details ? `Service Details: ${booking.service_details}` : null,
    additionalServices.length > 0 ? `Additional Services: ${additionalServices.join(", ")}` : null,
    booking.preferred_date ? `Preferred Date: ${booking.preferred_date}` : null,
    booking.time_preference ? `Time Preference: ${formatTimePreference(booking.time_preference)}` : null,
  ].filter(Boolean).join("\n");

  const { data, error } = await supabase.from("clients").insert({
    user_id:            userId,
    full_name:          booking.lead_name,
    email:              booking.email,
    phone:              booking.phone,
    billing_street:     booking.street   ?? "",
    billing_apt:        booking.apt_suite ?? null,
    billing_city:       booking.city     ?? "",
    billing_state:      booking.state    ?? "",
    billing_zip:        booking.zip_code ?? "",
    service_street:     booking.street   ?? "",
    service_apt:        booking.apt_suite ?? null,
    service_city:       booking.city     ?? "",
    service_state:      booking.state    ?? "",
    service_zip:        booking.zip_code ?? "",
    client_type:        booking.service_type === "commercial" ? "commercial" : "residential",
    contact_preference: "phone",
    status:             "active",
    instructions:       notes || null,
  }).select("id").single();

  if (error) throw error;
  return data.id;
}

/**
 * Resuelve (o crea) el client asociado a un request.
 * Orden: client_id ya enlazado → match por email → match por nombre+teléfono →
 * crear client nuevo. El resultado se persiste en el booking para que una segunda
 * conversión no vuelva a resolver ni cree duplicados.
 *
 * El flujo de leads se retiró: un request anónimo del form público siempre termina
 * como Client (paridad swift-slate).
 * @param booking - The booking record from which to derive the contact
 */
export async function resolveOrCreateContact(booking: Booking): Promise<ContactMatch> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 0. Ya enlazado al crear el request
  if (booking.client_id) return { type: "client", id: booking.client_id };

  // Persiste el client resuelto en el booking (y limpia el lead_id legacy).
  const persistContact = async (contact: ContactMatch) => {
    await (supabase as any)
      .from("bookings")
      .update({ client_id: contact.id, lead_id: null, contact_type: "client" })
      .eq("id", booking.id);
    return contact;
  };

  // 1. Por email
  if (booking.email) {
    const found = await findClientByEmail(booking.email, user.id);
    if (found) return persistContact(found);
  }

  // 2. Por nombre + teléfono
  if (booking.lead_name && booking.phone) {
    const found = await findClientByNamePhone(booking.lead_name, booking.phone, user.id);
    if (found) return persistContact(found);
  }

  // 3. Client nuevo
  const clientId = await createClientFromRequest(booking, user.id);
  return persistContact({ type: "client", id: clientId });
}

/**
 * Resolves the client_property_id to attach to an estimate/walkthrough draft when
 * converting a request.
 *
 * The booking's persisted `client_property_id` FK is NOT reliable: a backend trigger
 * on `bookings` overwrites it (it gets normalized to the client's primary property,
 * losing the user's selection). The booking's denormalized service address
 * (street/city/zip), however, IS copied from the selected property at request time
 * and is left untouched. So we resolve the property by matching that address against
 * the client's active properties first — mirroring swift-slate's booking-address
 * resolution and RequestDetailPanel's lookup — and only fall back to the FK when no
 * address matches (e.g. a manually-typed address).
 * @param clientId - The resolved client UUID
 * @param booking - The booking with its FK + denormalized address
 */
export async function resolveClientPropertyId(
  clientId: string,
  booking: Pick<Booking, "client_property_id" | "street" | "city" | "zip_code">,
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return booking.client_property_id ?? null;

  const { data } = await (supabase as any)
    .from("client_properties")
    .select("id, street, city, zip_code")
    .eq("client_id", clientId)
    .eq("user_id", user.id)
    .eq("is_active", true);

  const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
  const match = (data as Array<{ id: string; street: string; city: string; zip_code: string }> | null)?.find(
    (p) =>
      norm(p.street)   === norm(booking.street) &&
      norm(p.city)     === norm(booking.city) &&
      norm(p.zip_code) === norm(booking.zip_code),
  );

  return match?.id ?? booking.client_property_id ?? null;
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
