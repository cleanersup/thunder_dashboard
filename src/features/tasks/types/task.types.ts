import type { Database } from "@/integrations/supabase/types";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "to do" | "in progress" | "completed";

export type TaskWithClient = Task & {
  clients?: {
    id: string;
    full_name: string;
    company: string | null;
    phone: string;
    email: string;
  } | null;
};
