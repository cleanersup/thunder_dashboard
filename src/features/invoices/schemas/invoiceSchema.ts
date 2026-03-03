/**
 * @module invoiceSchema
 * Zod validation schema for the Create/Edit Invoice form.
 */
import { z } from "zod";

export const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  price: z.number().min(0, "Price must be 0 or more"),
  qty: z.number().min(1, "Quantity must be at least 1"),
  total: z.number().min(0),
});

export const invoiceSchema = z.object({
  serviceType:  z.string().min(1, "Service type is required"),
  invoiceDate:  z.string().min(1, "Invoice date is required"),
  dueDate:      z.string().min(1, "Due date is required"),
  invoiceName:  z.string().optional(),
  clientId:     z.string().min(1, "Please select a client"),
  clientName:   z.string().min(1),
  companyName:  z.string().optional(),
  email:        z.string().email("Valid email required"),
  phone:        z.string().min(1, "Phone is required"),
  address:      z.string().min(1, "Address is required"),
  apt:          z.string().optional(),
  city:         z.string().min(1, "City is required"),
  state:        z.string().min(1, "State is required"),
  zip:          z.string().min(1, "ZIP is required"),
  lineItems:    z.array(lineItemSchema).min(1, "Add at least one line item"),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.string(),
  taxRate:      z.string(),
  notes:        z.string().optional(),
});

export type InvoiceSchemaValues = z.infer<typeof invoiceSchema>;
