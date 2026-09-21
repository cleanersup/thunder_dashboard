import { supabase } from "@/integrations/supabase/client";
import type { BookingInsert, PublicCompanyProfile } from "../types/booking.types";
import { getPublicBookingForms, getPublicCompanyProfile } from "@/shared/services/publicAccess";

// ─── Public (unauthenticated) ─────────────────────────────────────────────────

/**
 * Fetches the public company profile for the given business owner.
 * Used on the public booking form (no auth required).
 * @param userId - The business owner's user ID
 */
export async function fetchPublicProfile(userId: string): Promise<PublicCompanyProfile> {
  const data = await getPublicCompanyProfile(userId);
  if (!data) throw new Error("Company profile not found");
  return {
    company_name: data.company_name,
    company_logo: data.company_logo,
    company_email: data.company_email,
  };
}

/**
 * Fetches the custom questions for the public booking form.
 * @param userId - The business owner's user ID
 */
export async function fetchPublicBookingForms(userId: string) {
  return getPublicBookingForms(userId);
}

/**
 * Submits a booking from the public form (no auth required).
 * Uses the create-booking edge function (service role) to bypass RLS.
 * Sets contact_type to 'anonymous' — resolved to a lead when converting later.
 * @returns The created booking's ID (used for the in-app notification)
 */
export async function submitPublicBooking(
  userId: string,
  payload: Omit<BookingInsert, "business_owner_id" | "status">,
): Promise<{ id: string }> {
  const { data, error } = await supabase.functions.invoke<{ id: string }>("create-booking", {
    body: { ...payload, business_owner_id: userId, status: "new", contact_type: "anonymous", attachments: [] },
  });
  if (error) throw error;
  if (!data?.id) throw new Error("Booking creation failed");
  return data;
}
