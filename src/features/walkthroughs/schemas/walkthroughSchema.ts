import { z } from "zod";

/**
 * El walkthrough siempre pertenece a un Client (el flujo de leads se retiró, paridad
 * swift-slate). `walkthrough_type` se mantiene porque es una columna de la tabla, pero
 * su único valor válido es "client".
 */
export const walkthroughSchema = z.object({
  walkthrough_type: z.literal("client").default("client"),
  client_id:        z.string().optional().nullable(),
  property_id:      z.string().optional().nullable(),
  service_type:     z.enum(["residential", "commercial"]),
  scheduled_date:   z.string().min(1, "Date is required"),
  scheduled_time:   z.string().min(1, "Time is required"),
  duration:         z.string().optional(),
  assigned_employees: z.array(z.string()).optional(),
  notes:            z.string().optional(),
});

export type WalkthroughFormData = z.infer<typeof walkthroughSchema>;
