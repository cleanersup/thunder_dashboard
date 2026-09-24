/**
 * @module useContractDescription
 * Hook for generating and saving Step 1 company-description fields via the
 * `generate-company-description` edge function and Supabase profiles table.
 *
 * Supported types:
 *  - who_we_are        — template only (no extra payload)
 *  - why_choose_us     — template only
 *  - our_services      — template + optional services[] appended as bullets
 *  - service_coverage  — template + optional cities[] appended as bullets
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast }    from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QK }       from "@/shared/config/queryKeys";
import { DESCRIPTION_PROFILE_MAP } from "../config/contracts.config";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

export type DescriptionField = "who_we_are" | "why_choose_us" | "our_services" | "service_coverage";

interface GenerateOptions {
  /** For `our_services`: list of service names to append as bullets. */
  services?: string[];
  /** For `service_coverage`: list of cities/areas to append as bullets. */
  cities?: string[];
}

/**
 * Provides auto-generate and save-as-default for the contract wizard Step 1 text fields.
 */
export function useContractDescription() {
  const queryClient = useQueryClient();
  const [generatingField, setGeneratingField] = useState<DescriptionField | null>(null);
  const [savingField,     setSavingField]     = useState<DescriptionField | null>(null);

  /**
   * Calls the edge function and returns the generated description string,
   * or null if the call fails.
   */
  const generateField = async (
    type: DescriptionField,
    options: GenerateOptions = {},
  ): Promise<string | null> => {
    setGeneratingField(type);
    try {
      const body: Record<string, unknown> = { type };
      if (options.services?.length) body.services = options.services;
      if (options.cities?.length)   body.cities   = options.cities;

      const { data, error } = await supabase.functions.invoke(
        "generate-company-description",
        { body },
      );
      if (error) throw error;
      if (data?.description) {
        toast.success("Content generated!");
        return data.description as string;
      }
      return null;
    } catch {
      toast.error("Failed to generate content");
      return null;
    } finally {
      setGeneratingField(null);
    }
  };

  /**
   * Saves the given field value as the user's default in their profile.
   * Next time the wizard opens, the field will be pre-populated with this value.
   */
  const saveDescription = async (field: DescriptionField, value: string): Promise<void> => {
    if (!value.trim()) { toast.error("Field is empty — nothing to save"); return; }
    setSavingField(field);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const profileCol = DESCRIPTION_PROFILE_MAP[field];
      await db.from("profiles").update({ [profileCol]: value }).eq("user_id", user.id);

      queryClient.invalidateQueries({ queryKey: QK.profile });
      toast.success("Saved as default");
    } catch {
      toast.error("Failed to save default");
    } finally {
      setSavingField(null);
    }
  };

  return { generateField, generatingField, saveDescription, savingField };
}
