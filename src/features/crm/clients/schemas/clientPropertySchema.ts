import { z } from "zod";
import { postalRule, stateRule } from "@/shared/constants/countries";

/**
 * Esquema de una propiedad para el país del dueño — el código postal y el
 * estado se validan con el formato de ese país.
 *
 * `country` no es un campo del formulario: la propiedad siempre está en el país
 * de operación del dueño y se rellena desde `useOwnerCountry()`.
 */
export function buildClientPropertySchema(country: string) {
  const postal = postalRule(country);
  const state = stateRule(country);

  return z.object({
    title:      z.string().optional(),
    street:     z.string().min(1, "Street is required"),
    apt_suite:  z.string().optional(),
    city:       z.string().min(1, "City is required"),
    state:      z.string().min(1, "State is required").max(state.maxLength, state.message),
    zip_code:   z.string().min(1, "ZIP code is required").regex(postal.pattern, postal.message),
    is_primary: z.boolean().default(false),
  });
}

export type ClientPropertySchema = z.infer<ReturnType<typeof buildClientPropertySchema>>;
