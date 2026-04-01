/**
 * @module useContractOwnerProfile
 * Fetches the public company profile of a contract owner by userId.
 * Used by PublicContractPage to display the company header in the preview.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchContractOwnerProfile } from "../services/contractsService";

export function useContractOwnerProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["contract-owner-profile", userId],
    queryFn: () => fetchContractOwnerProfile(userId!),
    enabled:   !!userId,
    staleTime: 60_000,
  });
}
