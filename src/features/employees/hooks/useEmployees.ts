import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchEmployees,
  fetchAllEmployees,
  fetchEmployeeById,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  checkDeleteGuard,
  deleteEmployee,
} from "../services/employeesService";
import type { EmployeeFormData } from "../schemas/employeeSchema";
import { QK } from "@/shared/config/queryKeys";

export type EmployeeOption = { id: string; name: string };

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Lightweight picker list — only active employees, id + name. */
export function useEmployees() {
  return useQuery({
    queryKey: QK.employees,
    queryFn: fetchEmployees,
    staleTime: 5 * 60 * 1000,
  });
}

/** All employees (all statuses) with full fields for EmployeesPage. */
export function useAllEmployees() {
  return useQuery({
    queryKey: QK.employeesAll,
    queryFn: fetchAllEmployees,
    staleTime: 2 * 60 * 1000,
  });
}

/** Single employee by ID. */
export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: QK.employee(id!),
    queryFn: () => fetchEmployeeById(id!),
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Write ────────────────────────────────────────────────────────────────────

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EmployeeFormData) => createEmployee(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.employees });
      qc.invalidateQueries({ queryKey: QK.employeesAll });
      toast.success("Employee added successfully");
    },
    onError: () => toast.error("Failed to add employee"),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EmployeeFormData }) =>
      updateEmployee(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: QK.employees });
      qc.invalidateQueries({ queryKey: QK.employeesAll });
      qc.invalidateQueries({ queryKey: QK.employee(updated.id) });
      toast.success("Employee updated successfully");
    },
    onError: () => toast.error("Failed to update employee"),
  });
}

export function useUpdateEmployeeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateEmployeeStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.employees });
      qc.invalidateQueries({ queryKey: QK.employeesAll });
    },
    onError: () => toast.error("Failed to update employee status"),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const reason = await checkDeleteGuard(id);
      if (reason) throw new Error(reason);
      await deleteEmployee(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.employees });
      qc.invalidateQueries({ queryKey: QK.employeesAll });
      toast.success("Employee deleted successfully");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to delete employee"),
  });
}
