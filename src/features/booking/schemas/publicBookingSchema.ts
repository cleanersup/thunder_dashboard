import { z } from "zod";
import { postalRule, stateRule } from "@/shared/constants/countries";

/**
 * Formulario público de booking.
 *
 * El país no se pide: sale del dueño vía `get_public_company_profile`
 * (`company_country`) y solo sirve para validar estado y código postal.
 * El insert no manda país — `create-booking` lo resuelve con el país de la cuenta.
 */
export function buildPublicBookingSchema(country: string) {
  const postal = postalRule(country);
  const state  = stateRule(country);
  return z.object({
  lead_name:    z.string().min(1, "Name is required").max(100),
  email:        z.string().email("Valid email is required").max(255),
  phone:        z.string().min(10, "Valid phone is required").max(20),
  service_type: z.enum(["residential", "commercial"]),
  street:       z.string().min(1, "Street is required").max(255),
  apt_suite:    z.string().optional(),
  city:         z.string().min(1, "City is required").max(100),
  state:        z.string().min(1, "State is required").max(state.maxLength, state.message),
  zip_code:     z.string().regex(postal.pattern, postal.message),

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
}

export type PublicBookingFormData = z.infer<ReturnType<typeof buildPublicBookingSchema>>;
