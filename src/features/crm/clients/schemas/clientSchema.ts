import { z } from "zod";

export const clientSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  company: z.string().optional(),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email address"),
  service_street: z.string().min(1, "Service street is required"),
  service_apt: z.string().optional(),
  service_city: z.string().min(1, "Service city is required"),
  service_state: z.string().min(1, "Service state is required"),
  service_zip: z.string().min(1, "Service zip is required"),
  billing_street: z.string().min(1, "Billing street is required"),
  billing_apt: z.string().optional(),
  billing_city: z.string().min(1, "Billing city is required"),
  billing_state: z.string().min(1, "Billing state is required"),
  billing_zip: z.string().min(1, "Billing zip is required"),
  client_type: z.enum(["individual", "business"]),
  contact_preference: z.enum(["phone", "email", "whatsapp"]),
  instructions: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type ClientFormData = z.infer<typeof clientSchema>;
