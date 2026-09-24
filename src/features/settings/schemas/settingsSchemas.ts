import { z } from "zod";

export const editProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  phoneNumber: z.string().min(1, "Phone number is required"),
});

export type EditProfileFormData = z.infer<typeof editProfileSchema>;

export const editCompanySchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(100),
  companyEmail: z.string().email("Invalid email address"),
  companyPhone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required").max(200),
  aptSuite: z.string().max(50).optional(),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(2),
  zip: z.string().min(5, "ZIP must be 5 digits").max(5, "ZIP must be 5 digits"),
});

export type EditCompanyFormData = z.infer<typeof editCompanySchema>;

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
