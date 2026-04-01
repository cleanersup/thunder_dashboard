/**
 * @module contract.types
 * Type definitions for the Contracts feature.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type ContractStatus =
  | "Draft"
  | "Pending"
  | "Active"
  | "Expiring"
  | "Expired";

export type ContractPaymentFrequency =
  | "one-time"
  | "weekly"
  | "biweekly"
  | "monthly";

export type ContractRecipientType = "client";

export type ContractDeliveryMethod = "email" | "sms" | "both";

// ─── Contract ─────────────────────────────────────────────────────────────────

export interface Contract {
  id: string;
  user_id: string;
  contract_number: string; // CTR-YYMM-NNN

  // Recipient
  recipient_name: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_address: string | null;

  // Dates
  start_date: string; // ISO date
  end_date: string;   // ISO date
  created_at: string;
  updated_at: string;
  renewed_at: string | null;
  viewed_at: string | null;

  // Company info (pre-populated from profile defaults)
  who_we_are: string | null;
  why_choose_us: string | null;
  our_services: string | null;
  service_coverage: string | null;

  // Clauses (JSONB array of clause objects)
  sections: ContractClause[];
  custom_clause_titles: Record<string, string> | null;

  // Financials
  total: number;
  payment_frequency: ContractPaymentFrequency;

  // Status & delivery
  status: ContractStatus;
  delivery_method: ContractDeliveryMethod | null;

  // Public share
  public_share_token: string | null;

  // recipient_id: stored in DB, links to CRM client
  recipient_id: string | null;

}

// ─── Clause ───────────────────────────────────────────────────────────────────

export interface ContractClause {
  key: string;     // e.g. "scope_of_work"
  title: string;   // display title
  body: string;    // clause body text
  enabled: boolean;
  order: number;
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface ContractFilters {
  status?: ContractStatus | "all";
  search?: string;
}

// ─── Form data (wizard) ───────────────────────────────────────────────────────

/** Step 1 form data */
export interface ContractStep1Data {
  recipient_name: string;
  recipient_email: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_type: ContractRecipientType;
  recipient_id: string | null;
  start_date: string;
  end_date: string;
  total: string;           // string for controlled input
  payment_frequency: ContractPaymentFrequency;
  who_we_are: string;
  why_choose_us: string;
  our_services: string;
  service_coverage: string;
}

/** Step 2 form data */
export interface ContractStep2Data {
  sections: ContractClause[];
}

/** Step 3 form data */
export interface ContractStep3Data {
  delivery_method: ContractDeliveryMethod | null;
}

/** Combined wizard form data */
export interface ContractFormData
  extends ContractStep1Data,
    ContractStep2Data,
    ContractStep3Data {}

// ─── KPI ──────────────────────────────────────────────────────────────────────

export interface ContractKPIs {
  active: number;
  pending: number;
  expiring: number;
  expired: number;
}
