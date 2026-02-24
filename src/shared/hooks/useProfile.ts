import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Fetches the authenticated user's profile from Supabase.
 * Creates a blank profile row if none exists yet (first login after signup).
 *
 * @returns TanStack Query result containing the profile row or null
 * @example
 * const { data: profile, isLoading } = useProfile();
 */
export function useProfile() {
  return useQuery<Profile | null>({
    queryKey: ["profile"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // First login — create an empty profile
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({ user_id: user.id, first_name: "", last_name: "" })
          .select()
          .maybeSingle();

        if (createError) throw createError;
        return newProfile;
      }

      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/**
 * Builds a formatted full address string from a profile row.
 * @param profile - Profile row from Supabase
 * @returns Formatted address or empty string if profile is null
 */
export function getCompanyAddress(profile: Profile | null | undefined): string {
  if (!profile) return "";
  const apt = profile.company_apt_suite ? ` ${profile.company_apt_suite}` : "";
  return `${profile.company_address}${apt}, ${profile.company_city}, ${profile.company_state} ${profile.company_zip}`;
}
