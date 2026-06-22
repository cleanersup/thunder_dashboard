import { format, parse } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { DURATION_LABELS } from "../config/walkthroughConfig";

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatTime(time: string): string {
  try {
    const fmt = time.split(":").length === 3 ? "HH:mm:ss" : "HH:mm";
    return format(parse(time, fmt, new Date()), "h:mm a");
  } catch {
    return time;
  }
}

/**
 * @param withDayName — prepend full day name, e.g. "Monday, 03/04/2026"
 */
export function formatDate(dateStr: string, withDayName = false): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return format(new Date(y, m - 1, d), withDayName ? "EEEE, MM/dd/yyyy" : "MM/dd/yyyy");
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "Draft":         return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30";
    case "Scheduled":     return "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400";
    case "Pending":       return "bg-orange-500/15 text-orange-700 border-orange-500/30";
    case "Started":       return "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400";
    case "Completed":     return "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400";
    case "Converted":     return "bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-400";
    case "estimate_sent": return "bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-400";
    case "Cancelled":     return "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400";
    default:              return "bg-secondary text-secondary-foreground";
  }
}

export function formatStatusLabel(status: string): string {
  return status === "estimate_sent" ? "Estimate Sent" : status;
}

export function formatDuration(minutes: number): string {
  return DURATION_LABELS[minutes] ?? `${minutes} min`;
}

// ─── Contact enrichment ───────────────────────────────────────────────────────

export interface ContactInfo {
  full_name: string;
  email: string | null;
  phone: string | null;
  service_street: string | null;
  service_city: string | null;
  service_state: string | null;
  service_zip: string | null;
}

/**
 * Fetches full contact info for a single walkthrough.
 * Resolution order: client → lead → booking (fallback).
 */
export async function fetchContactInfo(
  walkthroughType: string,
  clientId: string | null,
  leadId: string | null,
): Promise<ContactInfo | null> {
  if (walkthroughType === "client" && clientId) {
    const { data } = await supabase
      .from("clients")
      .select("full_name, phone, email, service_street, service_city, service_state, service_zip")
      .eq("id", clientId)
      .maybeSingle();
    if (data) return {
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      service_street: data.service_street,
      service_city: data.service_city,
      service_state: data.service_state,
      service_zip: data.service_zip,
    };
  } else if (leadId) {
    const { data: lead } = await supabase
      .from("leads")
      .select("full_name, phone, email, address, city, state, zip_code")
      .eq("id", leadId)
      .maybeSingle();
    if (lead) return {
      full_name: lead.full_name,
      email: lead.email,
      phone: lead.phone,
      service_street: lead.address,
      service_city: lead.city,
      service_state: lead.state,
      service_zip: lead.zip_code,
    };
    const { data: booking } = await supabase
      .from("bookings")
      .select("lead_name, phone, email, street, city, state, zip_code")
      .eq("id", leadId)
      .maybeSingle();
    if (booking) return {
      full_name: booking.lead_name,
      email: booking.email,
      phone: booking.phone,
      service_street: booking.street,
      service_city: booking.city,
      service_state: booking.state,
      service_zip: booking.zip_code,
    };
  }
  return null;
}
