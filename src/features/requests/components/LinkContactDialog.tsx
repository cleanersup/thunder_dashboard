/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase rows (bookings extended fields not in generated types) */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { ClientSelect } from "@/shared/components/common/ClientSelect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QK } from "@/shared/config/queryKeys";

interface LinkContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  onLinked: () => void;
}

// Lead flow retired from the UI (matches swift-slate): requests link to a client only.
export function LinkContactDialog({ open, onOpenChange, bookingId, onLinked }: LinkContactDialogProps) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [saving, setSaving]         = useState(false);

  const handleLink = async () => {
    if (!selectedId) {
      toast.error("Please select a client");
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("bookings")
        .update({
          client_id:    selectedId,
          lead_id:      null,
          contact_type: "client",
        })
        .eq("id", bookingId);
      if (error) throw error;
      toast.success("Contact linked");
      await queryClient.invalidateQueries({ queryKey: QK.requests });
      onLinked();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to link contact");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setSelectedId(undefined);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg font-bold">Link Contact</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Associate this request with an existing client
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 space-y-4">
          <ClientSelect
            value={selectedId}
            onChange={(client) => setSelectedId(client?.id)}
          />

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleLink} disabled={saving || !selectedId}>
              {saving ? "Linking..." : "Link Contact"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
