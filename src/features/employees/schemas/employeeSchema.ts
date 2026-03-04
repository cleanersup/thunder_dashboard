import { z } from "zod";

export const dayScheduleSchema = z.object({
  AM:    z.boolean(),
  PM:    z.boolean(),
  NIGHT: z.boolean(),
});

export const employeeSchema = z.object({
  full_name:        z.string().min(1, "Full name is required"),
  email:            z.string().email("Valid email is required"),
  phone:            z.string().min(1, "Phone is required"),
  street:           z.string().optional(),
  apt_suite:        z.string().optional(),
  city:             z.string().optional(),
  state:            z.string().optional(),
  zip:              z.string().optional(),
  gender:           z.enum(["male", "female"], { required_error: "Gender is required" }),
  birthday:         z.string().min(1, "Date of birth is required"),
  position:         z.string().optional(),
  hourly_rate:      z.coerce.number().positive().optional().nullable(),
  available_days:   z.record(dayScheduleSchema).optional(),
  additional_notes: z.string().optional(),
  documents:        z.array(z.string()).optional(),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;
