import type { Database } from "@/integrations/supabase/types";

export type BookingAttachmentMeta = {
  path:       string;
  name:       string;
  type:       string;
  size:       number;
  public_url: string;
};

export interface RequestPayload {
  lead_name:                 string;
  email:                     string;
  phone:                     string;
  street:                    string;
  apt_suite:                 string | null;
  city:                      string;
  state:                     string;
  zip_code:                  string;
  service_type:              string;
  preferred_date:            string | null;
  time_preference:           string | null;
  bedrooms:                  number | null;
  bathrooms:                 number | null;
  additional_services:       string[] | null;
  commercial_property_type:  string | null;
  other_commercial_type:     string | null;
  service_details:           string | null;
  custom_answers:            Record<string, string> | null;
  client_id?:                string | null;
  lead_id?:                  string | null;
  contact_type?:             "client" | "lead" | "anonymous" | null;
  client_property_id?:       string | null;
  files?:                    File[];
  existingAttachments?:      BookingAttachmentMeta[];
}

export type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  converted_to_type?: "estimate" | "walkthrough" | null;
  converted_to_id?:   string | null;
  client_id?:         string | null;
  lead_id?:           string | null;
  contact_type?:      "client" | "lead" | "anonymous" | null;
  client_property_id?: string | null;
  attachments?:       BookingAttachmentMeta[] | null;
};
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

/** Lightweight summary used in the requests list. */
export interface RequestSummary {
  id: string;
  date: Date;
  leadName: string;
  serviceType: ServiceType;
  status: BookingStatus;
  email: string;
  phone: string;
}

/** Config emitted by ConvertRequestDialog when user picks "Walkthrough". */
export interface WalkthroughConvertConfig {
  /** booking ID — triggers finalize_booking_conversion after save (no-date case only) */
  fromRequestId?:     string;
  /** walkthrough draft ID — tells the form to UPDATE instead of INSERT (date case) */
  walkthroughEditId?: string;
  prefillContactType: "client" | "lead";
  prefillContactId:   string;
  prefillServiceType: "residential" | "commercial";
  prefillDate?:       string;   // yyyy-MM-dd
  prefillTime?:       string;   // HH:mm
  prefillNotes?:      string;
  prefillPropertyId?: string | null;   // client_property_id from the request (clients only)
}

/** Public company info shown on the public booking form. */
export interface PublicCompanyProfile {
  company_name: string | null;
  company_logo: string | null;
  company_email: string | null;
}
