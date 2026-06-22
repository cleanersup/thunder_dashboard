/**
 * @module useContracts
 * React Query hooks for contract list operations.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/shared/config/queryKeys";
import { useAuth } from "@/shared/hooks/useAuth";
import type { Contract, ContractFilters, ContractFormData } from "../types/contract.types";
import {
  fetchContracts,
  fetchContractKPIs,
  createContract,
  updateContract,
  renewContract,
  deleteContract,
} from "../services/contractsService";

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useContracts(filters?: ContractFilters) {
  return useQuery({
    queryKey: [...QK.contracts, filters],
    queryFn: () => fetchContracts(filters),
    staleTime: 30_000,
  });
}

export function useContractKPIs() {
  return useQuery({
    queryKey: [...QK.contracts, "kpis"],
    queryFn: fetchContractKPIs,
    staleTime: 30_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateContract() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: ContractFormData) => createContract(user!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.contracts });
      toast.success("Contract created");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to create contract");
    },
  });
}

export function useUpdateContract() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContractFormData> }) =>
      updateContract(id, data),
    onSuccess: (updated: Contract) => {
      qc.invalidateQueries({ queryKey: QK.contracts });
      qc.invalidateQueries({ queryKey: QK.contract(updated.id) });
      toast.success("Contract updated");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update contract");
    },
  });
}

export function useRenewContract() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, startDate, endDate }: { id: string; startDate: string; endDate: string }) =>
      renewContract(id, startDate, endDate),
    onSuccess: (created: Contract) => {
      qc.invalidateQueries({ queryKey: QK.contracts });
      qc.invalidateQueries({ queryKey: QK.contract(created.id) });
      toast.success("Contract renewed — draft created");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to renew contract");
    },
  });
}

export function useDeleteContract() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteContract(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QK.contracts });
      qc.removeQueries({ queryKey: QK.contract(id) });
      toast.success("Contract deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to delete contract");
    },
  });
}
