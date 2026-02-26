import { z } from "zod";

export const taskSchema = z.object({
  title:       z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  priority:    z.enum(["low", "medium", "high"]),
  status:      z.enum(["to do", "in progress", "completed"]),
  due_date:    z.string().optional().nullable(),
});

export type TaskFormData = z.infer<typeof taskSchema>;
