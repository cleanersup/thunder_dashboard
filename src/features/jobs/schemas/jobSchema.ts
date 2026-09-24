import { z } from "zod";

export const jobServiceItemSchema = z.object({
  id:        z.string(),
  name:      z.string().min(1, "Service name is required"),
  quantity:  z.number().min(1),
  unitPrice: z.number().min(0),
  total:     z.number().min(0),
});

export const jobSchema = z.object({
  // Contact
  contactType: z.enum(["client", "lead"]),
  clientId:    z.string().nullable().optional(),
  leadId:      z.string().nullable().optional(),
  clientName:  z.string().min(1, "Client name is required"),
  clientEmail: z.string().nullable().optional(),
  clientPhone: z.string().nullable().optional(),

  // Property
  propertyStreet: z.string().nullable().optional(),
  propertyApt:    z.string().nullable().optional(),
  propertyCity:   z.string().nullable().optional(),
  propertyState:  z.string().nullable().optional(),
  propertyZip:    z.string().nullable().optional(),

  // Employees
  employeeIds: z.array(z.string()).default([]),

  // Schedule
  serviceType: z.enum(["residential", "commercial"]),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(["daily", "weekly", "every_two_weeks", "monthly"]).nullable().optional(),
  serviceDuration:     z.number().nullable().optional(),
  serviceDurationUnit: z.enum(["months", "years"]).nullable().optional(),
  jobDate:    z.string().min(1, "Date is required"),
  startTime:  z.string().default(""),
  endTime:    z.string().default(""),

  // Services
  services: z.array(jobServiceItemSchema).min(1, "At least one service is required"),
  jobDetails: z.string().nullable().optional(),
  notes:      z.string().nullable().optional(),

  // Pricing
  subtotal:      z.number().min(0),
  applyDiscount: z.boolean().default(false),
  discountType:  z.enum(["percentage", "amount"]).nullable().optional(),
  discountValue: z.number().nullable().optional(),
  discountAmount: z.number().default(0),
  applyTax:      z.boolean().default(false),
  taxRate:       z.number().nullable().optional(),
  taxAmount:     z.number().default(0),
  total:         z.number().min(0),

  // Deposit
  applyDeposit:  z.boolean().default(false),
  depositType:   z.enum(["percentage", "amount"]).nullable().optional(),
  depositValue:  z.number().nullable().optional(),
  depositAmount: z.number().default(0),
  balanceDue:    z.number().default(0),

  // Source
  estimateId:   z.string().nullable().optional(),
  walkthroughId: z.string().nullable().optional(),
  parentJobId:  z.string().nullable().optional(),
  paymentStatus: z.string().optional(),
});

export type JobFormValues = z.infer<typeof jobSchema>;
