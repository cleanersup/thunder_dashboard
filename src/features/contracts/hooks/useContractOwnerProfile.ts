/**
 * @module useContractOwnerProfile
 * Fetches the public company profile of a contract owner by userId.
 * Used by PublicContractPage to display the company header in the preview.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchContractOwnerProfile } from "../services/contractsService";

const USE_MOCKS = import.meta.env.VITE_USE_CONTRACT_MOCKS === "true";

export function useContractOwnerProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["contract-owner-profile", userId],
    queryFn: async () => {
      if (USE_MOCKS) {
        return {
          company_name:    "Thunder Pro Services",
          company_logo:    null,
          company_email:   "info@thunderpro.com",
          company_phone:   "(555) 123-4567",
          company_address: "123 Main Street",
          company_city:    "Miami",
          company_state:   "FL",
          company_zip:     "33101",
        };
      }
      return fetchContractOwnerProfile(userId!);
    },
    enabled:   !!userId,
    staleTime: 60_000,
  });
}
