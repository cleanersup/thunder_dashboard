/**
 * @module useContracts
 * React Query hooks for contract list operations.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/shared/config/queryKeys";
import { useAuth } from "@/shared/hooks/useAuth";
import type { Contract, ContractFilters, ContractFormData } from "../types/contract.types";

const USE_MOCKS = import.meta.env.VITE_USE_CONTRACT_MOCKS === "true";

// ─── Shared fetch helpers ─────────────────────────────────────────────────────

async function getContracts(filters?: ContractFilters): Promise<Contract[]> {
  if (USE_MOCKS) {
    const svc = await import("../mocks/contractsMockService");
    return svc.fetchContractsMock(filters);
  }
  const svc = await import("../services/contractsService");
  return svc.fetchContracts(filters);
}

async function getKPIs() {
  if (USE_MOCKS) {
    const svc = await import("../mocks/contractsMockService");
    return svc.fetchContractKPIsMock();
  }
  const svc = await import("../services/contractsService");
  return svc.fetchContractKPIs();
}

async function doCreate(userId: string, data: ContractFormData): Promise<Contract> {
  if (USE_MOCKS) {
    const svc = await import("../mocks/contractsMockService");
    return svc.createContractMock(data);
  }
  const svc = await import("../services/contractsService");
  return svc.createContract(userId, data);
}

async function doUpdate(id: string, data: Partial<ContractFormData>): Promise<Contract> {
  if (USE_MOCKS) {
    const svc = await import("../mocks/contractsMockService");
    return svc.updateContractMock(id, data);
  }
  const svc = await import("../services/contractsService");
  return svc.updateContract(id, data);
}

async function doRenew(id: string, startDate: string, endDate: string): Promise<Contract> {
  if (USE_MOCKS) {
    const svc = await import("../mocks/contractsMockService");
    return svc.renewContractMock(id, startDate, endDate);
  }
  const svc = await import("../services/contractsService");
  return svc.renewContract(id, startDate, endDate);
}

async function doDelete(id: string): Promise<void> {
  if (USE_MOCKS) {
    const svc = await import("../mocks/contractsMockService");
    return svc.deleteContractMock(id);
  }
  const svc = await import("../services/contractsService");
  return svc.deleteContract(id);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useContracts(filters?: ContractFilters) {
  return useQuery({
    queryKey: [...QK.contracts, filters],
    queryFn: () => getContracts(filters),
    staleTime: 30_000,
  });
}

export function useContractKPIs() {
  return useQuery({
    queryKey: [...QK.contracts, "kpis"],
    queryFn: getKPIs,
    staleTime: 30_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateContract() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: ContractFormData) => doCreate(user!.id, data),
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
      doUpdate(id, data),
    onSuccess: (updated) => {
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
      doRenew(id, startDate, endDate),
    onSuccess: (created) => {
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
    mutationFn: (id: string) => doDelete(id),
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
