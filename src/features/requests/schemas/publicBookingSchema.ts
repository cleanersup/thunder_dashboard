import { z } from "zod";

export const publicBookingSchema = z.object({
  lead_name:    z.string().min(1, "Name is required").max(100),
  email:        z.string().email("Valid email is required").max(255),
  phone:        z.string().min(10, "Valid phone is required").max(20),
  service_type: z.enum(["residential", "commercial"]),
  street:       z.string().min(1, "Street is required").max(255),
  apt_suite:    z.string().optional(),
  city:         z.string().min(1, "City is required").max(100),
  state:        z.string().length(2, "Enter 2-letter state code"),
  zip_code:     z.string().regex(/^\d{5}(-\d{4})?$/, "Enter valid ZIP code"),

  // Residential
  bedrooms:            z.coerce.number().min(0).optional().nullable(),
  bathrooms:           z.coerce.number().min(0).optional().nullable(),
  additional_services: z.array(z.string()).optional(),

  // Commercial
  commercial_property_type: z.string().optional().nullable(),
  other_commercial_type:    z.string().optional().nullable(),

  // Shared
  service_details:  z.string().max(5000).optional(),
  preferred_date:   z.string().optional().nullable(),
  time_preference:  z.enum(["am", "pm"]).optional().nullable(),
  custom_answers:   z.record(z.string()).optional(),
});

export type PublicBookingFormData = z.infer<typeof publicBookingSchema>;
