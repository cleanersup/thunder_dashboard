import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ClipboardList, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { resolveOrCreateContact } from "../services/requestsService";
import { toast } from "sonner";
import type { Booking } from "../types/request.types";

interface ConvertRequestDialogProps {
  request: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConvertRequestDialog({ request, open, onOpenChange }: ConvertRequestDialogProps) {
  const navigate  = useNavigate();
  const [loading, setLoading] = useState<"estimate" | "walkthrough" | null>(null);

  if (!request) return null;

  const handleConvert = async (target: "estimate" | "walkthrough") => {
    setLoading(target);
    try {
      const contact = await resolveOrCreateContact(request);

      const prefillBase = {
        [contact.type === "client" ? "client_id" : "lead_id"]: contact.id,
        fromRequestId: request.id,
      };

      if (target === "estimate") {
        const route = request.service_type === "commercial"
          ? "/estimates/new/commercial"
          : "/estimates/new/residential";
        navigate(route, {
          state: {
            prefill: {
              ...prefillBase,
              service_type: request.service_type,
            },
            fromRequestId: request.id,
          },
        });
      } else {
        navigate("/walkthroughs/new", {
          state: {
            prefill: {
              ...prefillBase,
              service_type: request.service_type,
            },
            fromRequestId: request.id,
          },
        });
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resolve contact";
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Convert Request</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          What would you like to create from <span className="font-medium">{request.lead_name}</span>'s request?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => handleConvert("estimate")}
            disabled={!!loading}
          >
            {loading === "estimate"
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <FileText className="h-5 w-5 text-primary" />
            }
            <span className="text-sm font-medium">Estimate</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => handleConvert("walkthrough")}
            disabled={!!loading}
          >
            {loading === "walkthrough"
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <ClipboardList className="h-5 w-5 text-primary" />
            }
            <span className="text-sm font-medium">Walkthrough</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
