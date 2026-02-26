import { z } from "zod";

export const leadSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  company_name: z.string().optional(),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required"),
  apt_suite: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip_code: z.string().min(1, "Zip code is required"),
  lead_source: z.enum(["facebook", "google", "instagram", "website", "referral", "flyer", "other"]),
  referral_name: z.string().optional(),
  referral_company: z.string().optional(),
  service_interested: z.enum(["residential", "commercial"]),
  estimate_budget: z.number().optional().nullable(),
  priority_level: z.enum(["low", "medium", "high"]),
  status: z.enum(["new", "contacted", "walkthrough", "estimate send", "decision"]).default("new"),
  next_followup_date: z.string().optional().nullable(),
  internal_notes: z.string().optional(),
  walkthrough_date: z.string().optional().nullable(),
  walkthrough_time: z.string().optional().nullable(),
  decision_result: z.enum(["won", "lost"]).optional().nullable(),
});

export type LeadFormData = z.infer<typeof leadSchema>;
