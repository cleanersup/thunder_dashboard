/**
 * @module useContract
 * React Query hooks for a single contract by ID or public token.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/shared/config/queryKeys";
import {
  fetchContractById,
  fetchContractByToken,
  acceptContract,
} from "../services/contractsService";

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: QK.contract(id!),
    queryFn: () => fetchContractById(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useContractByToken(token: string | undefined) {
  return useQuery({
    queryKey: ["contract-public", token],
    queryFn: () => fetchContractByToken(token!),
    enabled: !!token,
    staleTime: 0,
    retry: false,
  });
}

export function useAcceptContract(token: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!token) throw new Error("No token");
      return acceptContract(token);
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
