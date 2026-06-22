import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { jobsService } from "../services/jobsService";
import { QK } from "@/shared/config/queryKeys";
import type { JobStatus, CreateJobInput, UpdateJobInput } from "../types/job.types";

export function useUpdateJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobStatus }) =>
      jobsService.updateStatus(id, status),
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: QK.jobs });
      qc.invalidateQueries({ queryKey: QK.job(job.id) });
    },
    onError: () => toast.error("Failed to update job status"),
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, propertyId }: { input: CreateJobInput; propertyId?: string | null }) =>
      jobsService.create(input, propertyId),
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: QK.jobs });
      qc.invalidateQueries({ queryKey: QK.job(job.id) });
      toast.success("Job created successfully");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create job"),
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
      propertyId,
    }: {
      id: string;
      updates: UpdateJobInput;
      propertyId?: string | null;
    }) => jobsService.update(id, updates, propertyId),
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: QK.jobs });
      qc.invalidateQueries({ queryKey: QK.job(job.id) });
      toast.success("Job updated successfully");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update job"),
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.jobs });
      toast.success("Job deleted");
    },
    onError: () => toast.error("Failed to delete job"),
  });
}

export function useCancelJobGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => jobsService.cancelGroup(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.jobs });
      toast.success("Job series cancelled");
    },
    onError: () => toast.error("Failed to cancel job series"),
  });
}
