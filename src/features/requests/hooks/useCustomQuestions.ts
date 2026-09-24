import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomQuestion {
  id:       string;
  question: string;
  formType: string;
}

async function fetchCustomQuestions(): Promise<CustomQuestion[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("booking_forms")
    .select("custom_questions")
    .eq("user_id", user.id);

  if (error) throw error;
  if (!data) return [];

  const all: CustomQuestion[] = [];
  for (const form of data) {
    if (!Array.isArray(form.custom_questions)) continue;
    for (const q of form.custom_questions as unknown[]) {
      if (q && typeof q === "object" && "id" in q && "question" in q && "formType" in q) {
        const typed = q as Record<string, unknown>;
        all.push({
          id:       String(typed.id),
          question: String(typed.question),
          formType: String(typed.formType),
        });
      }
    }
  }
  return all;
}

export function useCustomQuestions() {
  return useQuery<CustomQuestion[]>({
    queryKey:  ["custom-questions"],
    queryFn:   fetchCustomQuestions,
    staleTime: 10 * 60 * 1000,
  });
}
