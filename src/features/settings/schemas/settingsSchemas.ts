import { z } from "zod";
import { postalRule, stateRule } from "@/shared/constants/countries";

export const editProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  phoneNumber: z.string().min(1, "Phone number is required"),
});

export type EditProfileFormData = z.infer<typeof editProfileSchema>;

/**
 * Esquema de Company Info para un país concreto — el formato de estado y de
 * código postal no es el mismo en todos, y el país ya no se elige aquí: viene
 * del dueño (`useOwnerCountry`).
 *
 * `companyCountry` no está en el esquema ni se envía al guardar: la columna
 * `profiles.company_country` queda congelada al registrarse (trigger
 * `tr_lock_profile_company_country`), así que cualquier valor que mandáramos lo
 * descartaría la base de datos.
 */
export function buildEditCompanySchema(country: string) {
  const postal = postalRule(country);
  const state = stateRule(country);

  return z.object({
    companyName: z.string().min(1, "Company name is required").max(100),
    companyEmail: z.string().email("Invalid email address"),
    companyPhone: z.string().min(1, "Phone number is required"),
    address: z.string().min(1, "Address is required").max(200),
    aptSuite: z.string().max(50).optional(),
    city: z.string().min(1, "City is required").max(100),
    state: z.string().min(1, "State is required").max(state.maxLength, state.message),
    zip: z.string().min(1, "ZIP is required").regex(postal.pattern, postal.message),
  });
}

export type EditCompanyFormData = z.infer<ReturnType<typeof buildEditCompanySchema>>;

export const securitySchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters").max(100),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export type SecurityFormData = z.infer<typeof securitySchema>;
