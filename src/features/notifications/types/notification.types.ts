import type { Database } from "@/integrations/supabase/types";

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationType = "invoice_paid" | "invoice_canceled" | "estimate_accepted" | "estimate_canceled" | "booking_new" | "contract_accepted";
