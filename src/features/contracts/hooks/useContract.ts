/**
 * @module useContract
 * React Query hook for a single contract by ID.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/shared/config/queryKeys";
import type { Contract } from "../types/contract.types";

const USE_MOCKS = import.meta.env.VITE_USE_CONTRACT_MOCKS === "true";

async function getContract(id: string): Promise<Contract> {
  if (USE_MOCKS) {
    const svc = await import("../mocks/contractsMockService");
    return svc.fetchContractByIdMock(id);
  }
  const svc = await import("../services/contractsService");
  return svc.fetchContractById(id);
}

async function getContractByToken(token: string): Promise<Contract> {
  if (USE_MOCKS) {
    const svc = await import("../mocks/contractsMockService");
    return svc.fetchContractByTokenMock(token);
  }
  const svc = await import("../services/contractsService");
  return svc.fetchContractByToken(token);
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: QK.contract(id!),
    queryFn: () => getContract(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useContractByToken(token: string | undefined) {
  return useQuery({
    queryKey: ["contract-public", token],
    queryFn: () => getContractByToken(token!),
    enabled: !!token,
    staleTime: 0,
    retry: false,
  });
}

export function useAcceptContract(token: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("No token");
      if (USE_MOCKS) {
        const svc = await import("../mocks/contractsMockService");
        return svc.acceptContractMock(token);
      }
      const svc = await import("../services/contractsService");
      return svc.acceptContract(token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-public", token] });
      toast.success("Contract accepted");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to accept contract");
    },
  });
}
