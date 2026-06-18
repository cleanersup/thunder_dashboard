import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Receipt, ClipboardList, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/components/ui/dialog";
import { resolveOrCreateContact } from "../services/requestsService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QK } from "@/shared/config/queryKeys";
import type { Booking, WalkthroughConvertConfig } from "../types/request.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapTimePreference(pref: string | null | undefined): string {
  if (!pref) return "09:00";
  const t = pref.trim().toLowerCase();
  if (/^\d{1,2}:\d{2}$/.test(t)) return t.padStart(5, "0");
  if (t === "am" || t.includes("morning"))              return "09:00";
  if (t === "pm" || t.includes("afternoon"))            return "14:00";
  if (t.includes("evening") || t.includes("night"))     return "18:00";
  return "09:00";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConvertRequestDialogProps {
  request: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the estimate route is ready — navigate to it from the parent. */
  onEstimateConvert?: (route: string, state: Record<string, unknown>) => void;
  /** Called with walkthrough prefill config so the parent can open the modal. */
  onWalkthroughConvert: (config: WalkthroughConvertConfig) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConvertRequestDialog({
  request,
  open,
  onOpenChange,
  onEstimateConvert,
  onWalkthroughConvert,
}: ConvertRequestDialogProps) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState<"estimate" | "walkthrough" | null>(null);

  if (!request) return null;

  const serviceType = (request.service_type === "commercial" ? "commercial" : "residential") as
    "residential" | "commercial";

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: QK.requests });
    qc.invalidateQueries({ queryKey: QK.request(request.id) });
  };

  const handleConvert = async (target: "estimate" | "walkthrough") => {
    setLoading(target);
    try {
      const contact = await resolveOrCreateContact(request);

      if (target === "estimate") {
        const route = serviceType === "commercial"
          ? "/estimates/new/commercial"
          : "/estimates/new/residential";
        onOpenChange(false);
        onEstimateConvert?.(route, {
          prefill: {
            [contact.type === "client" ? "client_id" : "lead_id"]: contact.id,
            service_type: serviceType,
          },
          fromRequestId: request.id,
        });
        return;
      }

      // ── Walkthrough ───────────────────────────────────────────────────────
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const prefillBase = {
        prefillContactType: contact.type,
        prefillContactId:   contact.id,
        prefillServiceType: serviceType,
        prefillNotes:       request.service_details ?? undefined,
      };

      // ── Case A: preferred_date exists — create draft immediately ──────────
      if (request.preferred_date) {
        const { data: draft, error: draftError } = await (supabase as any)
          .from("walkthroughs")
          .insert({
            user_id:            user.id,
            client_id:          contact.type === "client" ? contact.id : null,
            lead_id:            contact.type === "lead"   ? contact.id : null,
            walkthrough_type:   contact.type,
            service_type:       serviceType,
            scheduled_date:     request.preferred_date,
            scheduled_time:     mapTimePreference(request.time_preference),
            assigned_employees: [],
            notes:              request.service_details || null,
            status:             "Draft",
          })
          .select("id")
          .single();

        if (draftError) throw draftError;

        // Finalize conversion immediately — request becomes "converted"
        await (supabase as any).rpc("finalize_booking_conversion", {
          p_booking_id:     request.id,
          p_estimate_id:    null,
          p_walkthrough_id: draft.id,
        });

        invalidate();
        onOpenChange(false);

        // Open form in EDIT mode — will UPDATE the draft (not INSERT new)
        onWalkthroughConvert({
          ...prefillBase,
          walkthroughEditId: draft.id,   // ← tells form to UPDATE
          prefillDate: request.preferred_date,
          prefillTime: mapTimePreference(request.time_preference),
          // fromRequestId omitted — finalize already done
        });
        toast.success("Draft walkthrough created — complete the details");
        return;
      }

      // ── Case B: no preferred_date — form handles finalize after save ──────
      onOpenChange(false);
      onWalkthroughConvert({
        ...prefillBase,
        fromRequestId: request.id,   // ← triggers finalize after user saves
        // walkthroughEditId omitted — will INSERT new walkthrough
      });
      toast.success("Opening walkthrough form");

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Conversion failed";
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  };

  const options = [
    {
      key:         "estimate"    as const,
      label:       "Estimate",
      description: `Create a ${serviceType} estimate`,
      icon:        <Receipt className="w-5 h-5 text-blue-500" />,
    },
    {
      key:         "walkthrough" as const,
      label:       "Walkthrough",
      description: `Schedule a ${serviceType} walkthrough visit`,
      icon:        <ClipboardList className="w-5 h-5 text-green-500" />,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="text-lg font-bold">Convert Request</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Select what to create from <span className="font-medium">{request.lead_name}</span>'s request
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 space-y-2">
          {options.map((opt) => {
            const isLoading  = loading === opt.key;
            const isDisabled = loading !== null;
            return (
              <button
                key={opt.key}
                disabled={isDisabled}
                onClick={() => handleConvert(opt.key)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-secondary/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="p-2 rounded-lg bg-secondary/60 flex-shrink-0">
                  {isLoading
                    ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    : opt.icon
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
