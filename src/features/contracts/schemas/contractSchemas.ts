/**
 * @module contractSchemas
 * Zod validation schemas for contract wizard steps.
 */
import { z } from "zod";

// ─── Step 1 ───────────────────────────────────────────────────────────────────

export const contractStep1Schema = z.object({
  recipient_name: z.string().min(1, "Name is required"),
  recipient_email: z.string().email("Invalid email").or(z.literal("")),
  recipient_phone: z.string().optional().default(""),
  recipient_address: z.string().optional().default(""),
  recipient_type: z.literal("client"),
  recipient_id: z.string().nullable().optional(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  total: z
    .string()
    .min(1, "Total is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
      message: "Total must be a valid number",
    }),
  payment_frequency: z.enum(["one-time", "weekly", "biweekly", "monthly"]),
  who_we_are: z.string().optional().default(""),
  why_choose_us: z.string().optional().default(""),
  our_services: z.string().optional().default(""),
  service_coverage: z.string().optional().default(""),
}).refine(
  (data) => {
    if (!data.start_date || !data.end_date) return true;
    return new Date(data.end_date) > new Date(data.start_date);
  },
  { message: "End date must be after start date", path: ["end_date"] }
);

export type ContractStep1Schema = z.infer<typeof contractStep1Schema>;

// ─── Step 2 ───────────────────────────────────────────────────────────────────

const clauseSchema = z.object({
  key: z.string(),
  title: z.string(),
  body: z.string(),
  enabled: z.boolean(),
  order: z.number(),
});

export const contractStep2Schema = z.object({
  sections: z.array(clauseSchema).min(1, "At least one clause is required"),
});

export type ContractStep2Schema = z.infer<typeof contractStep2Schema>;

// ─── Step 3 ───────────────────────────────────────────────────────────────────

export const contractStep3Schema = z.object({
  delivery_method: z.enum(["email", "sms", "both"]),
});

export type ContractStep3Schema = z.infer<typeof contractStep3Schema>;
