import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { useUpdateJobStatus } from "../hooks/useJobMutations";
import { jobsService } from "../services/jobsService";
import { QK } from "@/shared/config/queryKeys";
import type { Job } from "../types/job.types";

interface JobCompleteDialogProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobCompleteDialog({ job, open, onOpenChange }: JobCompleteDialogProps) {
  const navigate    = useNavigate();
  const qc          = useQueryClient();
  const { mutate: updateStatus } = useUpdateJobStatus();
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    if (!job) return;
    setIsPending(true);
    try {
      // 1. Mark as Completed — backend trigger creates the final invoice
      await jobsService.updateStatus(job.id, "Completed");

      // 2. Refetch job to get invoice_ids written by the trigger
      const refreshed = await jobsService.fetchById(job.id);
      qc.invalidateQueries({ queryKey: QK.jobs });
      qc.invalidateQueries({ queryKey: QK.job(job.id) });

      onOpenChange(false);

      // 3. Navigate to the final invoice (non-deposit) if created
      const finalInvoiceId = refreshed?.invoiceIds?.find(
        (id) => id !== job.depositInvoiceId
      ) ?? refreshed?.invoiceIds?.[0];

      if (finalInvoiceId) {
        toast.success("Job completed — invoice ready to send");
        navigate("/invoices", { state: { openId: finalInvoiceId } });
      } else {
        toast.success("Job completed");
      }
    } catch {
      toast.error("Failed to complete job");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Complete Job</DialogTitle>
          <DialogDescription>
            {job?.applyDeposit
              ? "Mark this job as completed. An invoice will be generated automatically for the remaining balance."
              : "Mark this job as completed. An invoice will be generated automatically."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1 bg-green-600 hover:bg-green-700" disabled={isPending} onClick={handleConfirm}>
            {isPending ? "Completing…" : "Complete Job"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
