/**
 * @module activityLog
 * Centralized activity-feed logger. Mirrors swift-slate `lib/activityLogger.ts`.
 *
 * Writes rows to the `activities` table consumed by the Home recent-activity
 * feed (see dashboardService.fetchActivities). Every call is best-effort and
 * fire-and-forget at the call site — a logging failure must never break the
 * underlying business mutation.
 */

import { supabase } from "@/integrations/supabase/client";
import type { ActivityType } from "@/features/dashboard/types/dashboard.types";

interface AddActivityInput {
  type:            ActivityType;
  title:           string;
  estimateNumber?: string;
  invoiceNumber?:  string;
  clientName?:     string;
  amount?:         number;
}

/**
 * Inserts a single activity row for the authenticated user.
 * @returns The inserted row, or null if unauthenticated / on error.
 */
export async function addActivity(activity: AddActivityInput) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("activities")
    .insert({
      user_id:         user.id,
      type:            activity.type,
      title:           activity.title,
      estimate_number: activity.estimateNumber,
      invoice_number:  activity.invoiceNumber,
      client_name:     activity.clientName,
      amount:          activity.amount,
    })
    .select()
    .single();

  if (error) {
    console.error("[activityLog] addActivity:", error);
    return null;
  }
  return data;
}

/** Log estimate activities. */
export async function logEstimateActivity(
  type: "estimate_created" | "estimate_sent" | "estimate_accepted" | "estimate_canceled",
  estimateNumber: string,
  clientName: string,
  amount?: number,
) {
  const titles: Record<typeof type, string> = {
    estimate_created:  `Estimate ${estimateNumber} created for ${clientName}`,
    estimate_sent:     `Estimate ${estimateNumber} sent to ${clientName}`,
    estimate_accepted: `Estimate ${estimateNumber} accepted by ${clientName}`,
    estimate_canceled: `Estimate ${estimateNumber} canceled`,
  };
  await addActivity({ type, title: titles[type], estimateNumber, clientName, amount });
}

/** Log invoice activities. */
export async function logInvoiceActivity(
  type: "invoice_created" | "invoice_sent" | "invoice_paid" | "invoice_canceled",
  invoiceNumber: string,
  clientName: string,
  amount: number,
) {
  const titles: Record<typeof type, string> = {
    invoice_created:  `Invoice ${invoiceNumber} created for ${clientName}`,
    invoice_sent:     `Invoice ${invoiceNumber} sent to ${clientName}`,
    invoice_paid:     `Invoice ${invoiceNumber} paid by ${clientName} ($${amount.toFixed(2)})`,
    invoice_canceled: `Invoice ${invoiceNumber} canceled`,
  };
  await addActivity({ type, title: titles[type], invoiceNumber, clientName, amount });
}

// NOTE: swift-slate also defines logCRMActivity / logTaskActivity / logBookingActivity /
// logRouteActivity, but never calls them — its activity feed only ever contains
// estimate_* and invoice_* rows. We intentionally omit those loggers to preserve parity
// and avoid introducing unused exports. Add them here if/when product wants to extend
// the feed beyond swift-slate's behavior.
