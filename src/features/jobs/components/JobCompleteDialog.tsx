import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { useUpdateJobStatus } from "../hooks/useJobMutations";
import type { Job } from "../types/job.types";

interface JobCompleteDialogProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobCompleteDialog({ job, open, onOpenChange }: JobCompleteDialogProps) {
  const { mutate: updateStatus, isPending } = useUpdateJobStatus();

  const handleConfirm = () => {
    if (!job) return;
    updateStatus({ id: job.id, status: "Completed" }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Complete Job"
      description="Mark this job as completed? This will trigger the final invoice generation."
      onConfirm={handleConfirm}
      confirmLabel="Complete Job"
      isLoading={isPending}
    />
  );
}
