/**
 * @module RenewContractModal
 * CON-8: Modal to renew an Active or Expiring contract.
 * Creates a new Draft contract with updated dates, copies all other fields.
 */
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button }       from "@/shared/components/ui/button";
import { Input }        from "@/shared/components/ui/input";
import { Label }        from "@/shared/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/components/ui/dialog";
import { useRenewContract } from "../hooks/useContracts";
import type { Contract } from "../types/contract.types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface RenewContractModalProps {
  contract:  Contract | null;
  open:      boolean;
  onClose:   () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RenewContractModal({ contract, open, onClose }: RenewContractModalProps) {
  const renewM = useRenewContract();

  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");

  // Pre-fill dates when contract changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && contract) {
      setStartDate(contract.end_date ?? "");
      setEndDate("");
    }
    if (!isOpen) onClose();
  };

  const isValid = !!startDate && !!endDate && endDate > startDate;

  const handleSubmit = () => {
    if (!contract || !isValid) return;
    renewM.mutate(
      { id: contract.id, startDate, endDate },
      { onSuccess: onClose },
    );
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Renew Contract
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">{contract.contract_number}</span>
            {" · "}
            {contract.recipient_name}
          </p>
          <p>A new Draft contract will be created with the dates below.</p>
        </div>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="renew-start">New Start Date</Label>
            <Input
              id="renew-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="renew-end">New End Date</Label>
            <Input
              id="renew-end"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose} disabled={renewM.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || renewM.isPending}
          >
            {renewM.isPending ? "Renewing…" : "Renew Contract"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
