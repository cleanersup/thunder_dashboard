import type { Database } from "@/integrations/supabase/types";

export type Booking     = Database["public"]["Tables"]["bookings"]["Row"];
export type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
export type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];
export type BookingForm = Database["public"]["Tables"]["booking_forms"]["Row"];

export type BookingStatus = "new" | "cancelled";
export type ServiceType   = "residential" | "commercial";

export interface CustomQuestion {
  id: string;
  question: string;
  formType: ServiceType;
}

/** Lightweight summary used in the bookings list. */
export interface BookingSummary {
  id: string;
  date: Date;
  leadName: string;
  serviceType: ServiceType;
  status: BookingStatus;
  email: string;
  phone: string;
}

/** Public company info shown on the public booking form. */
export interface PublicCompanyProfile {
  company_name: string | null;
  company_logo: string | null;
  company_email: string | null;
}
