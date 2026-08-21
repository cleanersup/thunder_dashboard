import { z } from "zod";
import { STATES_BY_COUNTRY } from "@/shared/constants/countries";

export const signupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    phoneNumber: z.string().min(1, "Phone number is required"),
    companyName: z.string().optional(),
    companyCountry: z.string().min(1, "This field is required"),
    companyState: z.string().optional(),
    referralCode: z.string().optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    agreeToTerms: z
      .boolean()
      .refine((val) => val === true, "You must agree to the terms and conditions"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .superRefine((data, ctx) => {
    const states = STATES_BY_COUNTRY[data.companyCountry] ?? [];
    if (states.length > 0 && !data.companyState) {
      ctx.addIssue({ code: "custom", message: "This field is required", path: ["companyState"] });
    }
  });

export type SignupFormData = z.infer<typeof signupSchema>;
