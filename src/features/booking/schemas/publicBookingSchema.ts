import { z } from "zod";

/**
 * Formulario público de booking.
 *
 * El estado y el código postal se validan de forma tolerante: esta pantalla no
 * tiene sesión, así que no puede saber en qué país opera el dueño (el RPC
 * `get_public_company_profile` todavía no devuelve el país). Hasta que lo haga,
 * una regla de EE. UU. aquí rechazaría direcciones legítimas de cualquier otro
 * país.
 */
export const publicBookingSchema = z.object({
  lead_name:    z.string().min(1, "Name is required").max(100),
  email:        z.string().email("Valid email is required").max(255),
  phone:        z.string().min(10, "Valid phone is required").max(20),
  service_type: z.enum(["residential", "commercial"]),
  street:       z.string().min(1, "Street is required").max(255),
  apt_suite:    z.string().optional(),
  city:         z.string().min(1, "City is required").max(100),
  state:        z.string().min(1, "State is required").max(100),
  zip_code:     z.string().regex(/^[A-Za-z0-9][A-Za-z0-9 -]{1,11}$/, "Enter valid ZIP code"),

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
  // Esquema nuevo (swift-slate). Los valores legacy am/pm se normalizan en lectura.
  time_preference:  z.enum(["anytime", "morning", "afternoon", "evening"]).optional().nullable(),
  custom_answers:   z.record(z.string()).optional(),
});

export type PublicBookingFormData = z.infer<typeof publicBookingSchema>;
