import { z } from "zod";

export const clientPropertySchema = z.object({
  title:      z.string().optional(),
  street:     z.string().min(1, "Street is required"),
  apt_suite:  z.string().optional(),
  city:       z.string().min(1, "City is required"),
  state:      z.string().min(1, "State is required"),
  zip_code:   z.string().min(1, "ZIP code is required"),
  country:    z.string().optional(),
  is_primary: z.boolean().default(false),
});

export type ClientPropertySchema = z.infer<typeof clientPropertySchema>;
