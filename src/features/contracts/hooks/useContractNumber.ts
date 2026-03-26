/**
 * @module useContractNumber
 * Hook to generate the next contract number.
 */
import { useQuery } from "@tanstack/react-query";

const USE_MOCKS = import.meta.env.VITE_USE_CONTRACT_MOCKS === "true";

async function getNextNumber(): Promise<string> {
  if (USE_MOCKS) {
    const svc = await import("../mocks/contractsMockService");
    return svc.generateContractNumberMock();
  }
  const svc = await import("../services/contractsService");
  return svc.generateContractNumber();
}

export function useContractNumber() {
  return useQuery({
    queryKey: ["contract-number-next"],
    queryFn: getNextNumber,
    staleTime: 0,
    gcTime: 0,
  });
}
