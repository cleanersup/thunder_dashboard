/**
 * @module useContractClauses
 * Hook for AI clause generation and saving clause defaults to profile.
 * Moves Supabase direct calls out of the wizard page into a proper hook.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QK }       from "@/shared/config/queryKeys";
import { CLAUSE_PROFILE_MAP, CLAUSE_KEY_TO_BACKEND } from "../config/contracts.config";
import type { ContractClause } from "../types/contract.types";

/**
 * Provides AI-generate and save-as-default operations for contract clauses.
 */
export function useContractClauses() {
  const queryClient = useQueryClient();
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [savingKey,     setSavingKey]     = useState<string | null>(null);

  /**
   * Calls the `generate-company-description` edge function to produce clause content.
   * @returns generated text, or null on failure.
   */
  const generateClause = async (
    key: string,
    title: string,
    companyName: string,
  ): Promise<string | null> => {
    setGeneratingKey(key);
    try {
      const backendKey = CLAUSE_KEY_TO_BACKEND[key] ?? key;
      const { data, error } = await supabase.functions.invoke("generate-company-description", {
        body: { companyName, type: "contract_clause", clauseType: backendKey, clauseTitle: title },
      });
      if (error) throw error;
      if (data?.description) {
        toast.success(`${title} generated!`);
        return data.description as string;
      }
      return null;
    } catch {
      toast.error("Failed to generate content");
      return null;
    } finally {
      setGeneratingKey(null);
    }
  };

  /**
   * Saves a clause body (or all custom clauses) as the user's default in their profile.
   */
  const saveClause = async (
    key: string,
    title: string,
    body: string,
    sections: ContractClause[],
  ): Promise<void> => {
    setSavingKey(key);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (key.startsWith("custom_")) {
        const customData = sections
          .filter((c) => c.key.startsWith("custom_"))
          .map((c) => ({ key: c.key, title: c.title, content: c.body }));
        await supabase
          .from("profiles")
          .update({ custom_clauses: customData } as Record<string, unknown>)
          .eq("user_id", user.id);
        queryClient.invalidateQueries({ queryKey: QK.profile });
        toast.success("Custom policy saved as default");
      } else {
        const profileCol = CLAUSE_PROFILE_MAP[key];
        if (!profileCol) return;
        await supabase
          .from("profiles")
          .update({ [profileCol]: body } as Record<string, string>)
          .eq("user_id", user.id);
        queryClient.invalidateQueries({ queryKey: QK.profile });
        toast.success(`${title} saved as default`);
      }
    } catch {
      toast.error("Failed to save clause");
    } finally {
      setSavingKey(null);
    }
  };

  return { generateClause, saveClause, generatingKey, savingKey };
}
