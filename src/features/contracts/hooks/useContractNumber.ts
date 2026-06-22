/**
 * @module useContractNumber
 * Hook to generate the next contract number.
 */
import { useQuery } from "@tanstack/react-query";
import { generateContractNumber } from "../services/contractsService";

export function useContractNumber() {
  return useQuery({
    queryKey: ["contract-number-next"],
    queryFn: generateContractNumber,
    staleTime: 0,
    gcTime: 0,
  });
}
