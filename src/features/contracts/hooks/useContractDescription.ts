/**
 * @module useContractDescription
 * Hook for generating Step 1 company-description fields via the
 * `generate-company-description` edge function.
 *
 * Supported types:
 *  - who_we_are        — template only (no extra payload)
 *  - why_choose_us     — template only
 *  - our_services      — template + optional services[] appended as bullets
 *  - service_coverage  — template + optional cities[] appended as bullets
 */
import { useState } from "react";
import { toast }    from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type DescriptionField = "who_we_are" | "why_choose_us" | "our_services" | "service_coverage";

interface GenerateOptions {
  /** For `our_services`: list of service names to append as bullets. */
  services?: string[];
  /** For `service_coverage`: list of cities/areas to append as bullets. */
  cities?: string[];
}

/**
 * Provides auto-generate operations for the contract wizard Step 1 text fields.
 */
export function useContractDescription() {
  const [generatingField, setGeneratingField] = useState<DescriptionField | null>(null);

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

  return { generateField, generatingField };
}
