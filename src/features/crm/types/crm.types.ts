import type { Database } from "@/integrations/supabase/types";

export interface ClientPaymentFields {
  stripe_customer_id?: string | null;
  stripe_default_payment_method_id?: string | null;
  card_brand?: string | null;
  card_last4?: string | null;
  card_exp_month?: number | null;
  card_exp_year?: number | null;
}

export type Client = Database["public"]["Tables"]["clients"]["Row"] & ClientPaymentFields;
export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
export type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"] & Partial<ClientPaymentFields>;

export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
export type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

export type LeadStatus = "new" | "contacted" | "walkthrough" | "estimate send" | "decision";
export type LeadPriority = "low" | "medium" | "high";
export type LeadSource = "facebook" | "google" | "instagram" | "website" | "referral" | "flyer" | "other";
export type ServiceType = "residential" | "commercial";
export type DecisionResult = "won" | "lost";

export type ClientStatus = "active" | "inactive";
export type ClientType = "individual" | "business";
export type ContactPreference = "phone" | "email" | "whatsapp";
