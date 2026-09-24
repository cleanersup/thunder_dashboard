import type { Database } from "@/integrations/supabase/types";

export type EstimateRow    = Database["public"]["Tables"]["estimates"]["Row"];
export type EstimateInsert = Database["public"]["Tables"]["estimates"]["Insert"];
export type EstimateUpdate = Database["public"]["Tables"]["estimates"]["Update"];

export type EstimateStatus = "Pending" | "Accepted" | "Draft" | "Canceled" | "Invoiced";

/** Shaped row used across EstimatesPage table and EstimateDetailsModal. */
export interface FormattedEstimate {
  id:            string;
  estimateNumber: string;
  /** e.g. "Feb 28, 2026" */
  shortDate:     string;
  clientName:    string;
  serviceType:   string;
  serviceSubType: string;
  total:         number;
  status:        string;
}

// ─── Draft persistence ────────────────────────────────────────────────────────

/** Serialisable snapshot of wizard state stored in draft_data JSON column. */
export interface DraftData {
  currentStep:  number;
  estimateType: "client" | "lead" | null;
  clientId:     string | null;
  leadId:       string | null;
  formData:     Record<string, unknown>;
}
