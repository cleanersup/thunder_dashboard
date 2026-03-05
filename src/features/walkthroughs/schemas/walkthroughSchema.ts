import { z } from "zod";

export const walkthroughSchema = z.object({
  walkthrough_type: z.enum(["client", "lead"]),
  client_id:        z.string().optional().nullable(),
  lead_id:          z.string().optional().nullable(),
  service_type:     z.enum(["residential", "commercial"]),
  scheduled_date:   z.string().min(1, "Date is required"),
  scheduled_time:   z.string().min(1, "Time is required"),
  duration:         z.string().optional(),
  assigned_employees: z.array(z.string()).optional(),
  notes:            z.string().optional(),
});

export type WalkthroughFormData = z.infer<typeof walkthroughSchema>;
