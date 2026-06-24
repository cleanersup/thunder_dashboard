import type { ContractFormData } from "@/features/contracts/types/contract.types";

/** Subset of an estimate row needed to seed the contract wizard. */
interface EstimateForContractPrefill {
  client_name:  string;
  email?:       string | null;
  phone?:       string | null;
  address?:     string | null;
  apt?:         string | null;
  city?:        string | null;
  state?:       string | null;
  zip?:         string | null;
  total?:       number | null;
  client_id?:   string | null;
  main_data?:   Record<string, unknown> | null;
}

export type ContractPrefill = Partial<ContractFormData>;

/**
 * Maps an accepted estimate into a contract wizard prefill (Step 1 fields).
 * Only recipient + financial data is carried over; clauses and company copy
 * still come from the profile defaults inside the wizard.
 */
export function buildContractPrefillFromEstimate(estimate: EstimateForContractPrefill): ContractPrefill {
  const recipient_address = [
    [estimate.address, estimate.apt].filter(Boolean).join(" "),
    estimate.city,
    estimate.state,
    estimate.zip,
  ].filter(Boolean).join(", ");

  // Estimates store serviceType in main_data ("one-time" | "recurrent"); map the
  // one-time case to a one-time contract, otherwise default to monthly billing.
  const serviceType = estimate.main_data?.serviceType;
  const payment_frequency = serviceType === "one-time" ? "one-time" : "monthly";

  return {
    recipient_name:    estimate.client_name,
    recipient_email:   estimate.email ?? "",
    recipient_phone:   estimate.phone ?? "",
    recipient_address,
    recipient_type:    "client",
    recipient_id:      estimate.client_id ?? null,
    total:             estimate.total != null ? String(estimate.total) : "",
    payment_frequency,
  };
}
