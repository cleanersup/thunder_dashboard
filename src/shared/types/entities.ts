/**
 * @module entities
 * Shared domain entity types used across multiple features (estimates, invoices, CRM).
 */

export interface ClientEntity {
  id: string;
  full_name: string;
  company: string | null;
  phone: string;
  email: string;
  service_street: string;
  service_city: string;
  service_state: string;
  service_zip: string;
  service_apt: string | null;
}

export interface LeadEntity {
  id: string;
  full_name: string;
  company_name: string | null;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  apt_suite: string | null;
}

export type EstimateEntityType = "client" | "lead";
