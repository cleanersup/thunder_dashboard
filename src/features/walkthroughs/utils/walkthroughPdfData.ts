import { format, parse } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import type { WalkthroughWithContact, WalkthroughEmployeeForPdf } from "../services/walkthroughsService";
import type { ContactInfo } from "./walkthroughUtils";
import type { WalkthroughPDFData } from "../services/generateWalkthroughPDF";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ResRow = Database["public"]["Tables"]["residential_walkthrough_data"]["Row"];
type ComRow = Database["public"]["Tables"]["commercial_walkthrough_data"]["Row"];

/**
 * Maps profile + walkthrough + optional on-site data into {@link WalkthroughPDFData} for PDF generation.
 */
export function buildWalkthroughPdfData(
  profile: Profile,
  walkthrough: WalkthroughWithContact,
  contact: ContactInfo | null,
  residential: ResRow | null,
  commercial: ComRow | null,
  employees: WalkthroughEmployeeForPdf[],
): WalkthroughPDFData {
  const scheduledDate = (() => {
    try {
      return format(new Date(walkthrough.scheduled_date + "T12:00:00"), "MM/dd/yyyy");
    } catch {
      return String(walkthrough.scheduled_date ?? "");
    }
  })();

  const scheduledTime = walkthrough.scheduled_time
    ? format(parse(walkthrough.scheduled_time, "HH:mm:ss", new Date()), "hh:mm a")
    : "";

  return {
    companyLogo: profile.company_logo ?? undefined,
    companyName: profile.company_name || "Company Name",
    companyPhone: profile.company_phone || profile.phone_number || "",
    companyEmail: profile.company_email || "",
    companyAddress: `${profile.company_address || ""}${
      profile.company_apt_suite ? ` ${profile.company_apt_suite}` : ""
    }, ${profile.company_city || ""}, ${profile.company_state || ""} ${profile.company_zip || ""}`.replace(
      /^[,\s]+|[,\s]+$/g,
      "",
    ),
    walkthroughId: walkthrough.id,
    status: walkthrough.status,
    createdAt: walkthrough.created_at
      ? format(new Date(walkthrough.created_at), "MMM dd, yyyy 'at' h:mm a")
      : "",
    updatedAt:
      walkthrough.updated_at && walkthrough.updated_at !== walkthrough.created_at
        ? format(new Date(walkthrough.updated_at), "MMM dd, yyyy 'at' h:mm a")
        : undefined,
    completedAt: walkthrough.completed_at
      ? format(new Date(walkthrough.completed_at), "MMM dd, yyyy 'at' h:mm a")
      : undefined,
    estimateSentAt: walkthrough.estimate_sent_at
      ? format(new Date(walkthrough.estimate_sent_at), "MMM dd, yyyy 'at' h:mm a")
      : undefined,
    clientOrLeadInfo: {
      full_name: contact?.full_name ?? walkthrough.contact_name,
      company: undefined,
      phone: contact?.phone ?? walkthrough.contact_phone ?? "",
      email: contact?.email ?? walkthrough.contact_email ?? "",
      service_street: contact?.service_street ?? "",
      service_city: contact?.service_city ?? "",
      service_state: contact?.service_state ?? "",
      service_zip: contact?.service_zip ?? "",
    },
    walkthroughType: walkthrough.walkthrough_type,
    serviceType: walkthrough.service_type,
    scheduledDate,
    scheduledTime,
    duration: walkthrough.duration ?? undefined,
    notes: walkthrough.notes ?? undefined,
    assignedEmployees: employees.length > 0 ? employees : undefined,
    residentialData: residential
      ? {
          ...residential,
          extra_services: Array.isArray(residential.extra_services)
            ? (residential.extra_services as string[])
            : [],
        }
      : undefined,
    commercialData: commercial
      ? {
          ...commercial,
          selected_week_days: Array.isArray(commercial.selected_week_days)
            ? (commercial.selected_week_days as string[])
            : typeof commercial.selected_week_days === "string"
              ? [commercial.selected_week_days as string]
              : [],
          extra_services: Array.isArray(commercial.extra_services)
            ? (commercial.extra_services as string[])
            : [],
        }
      : undefined,
  };
}
