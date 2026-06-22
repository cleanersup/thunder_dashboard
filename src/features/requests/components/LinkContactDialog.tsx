/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase rows (bookings extended fields not in generated types) */
import { useState } from "react";
import { User } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/shared/utils/cn";
import { QK } from "@/shared/config/queryKeys";

interface LinkContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  onLinked: () => void;
}

type LinkType = "client" | "lead";

export function LinkContactDialog({ open, onOpenChange, bookingId, onLinked }: LinkContactDialogProps) {
  const queryClient = useQueryClient();
  const [linkType, setLinkType]     = useState<LinkType>("client");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [saving, setSaving]         = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: QK.clients,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, company")
        .eq("user_id", user.id)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string; company: string | null }[];
    },
    enabled: open,
  });

  const { data: leads = [] } = useQuery({
    queryKey: QK.leads,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("id, full_name, company_name")
        .eq("user_id", user.id)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string; company_name: string | null }[];
    },
    enabled: open,
  });

  const handleLink = async () => {
    if (!selectedId) {
      toast.error("Please select a contact");
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("bookings")
        .update({
          client_id:    linkType === "client" ? selectedId : null,
          lead_id:      linkType === "lead"   ? selectedId : null,
          contact_type: linkType,
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
    if (!v) {
      setSelectedId(undefined);
      setLinkType("client");
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg font-bold">Link Contact</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Associate this request with an existing client or lead
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {(["client", "lead"] as LinkType[]).map((type) => (
              <Button
                key={type}
                variant="outline"
                onClick={() => { setLinkType(type); setSelectedId(undefined); }}
                className={cn(
                  "h-10 flex items-center justify-start gap-3 px-4",
                  linkType === type ? "bg-blue-50 border-blue-500 text-blue-700" : "",
                )}
              >
                <User className="w-4 h-4" />
                <span className="font-semibold capitalize">{type}</span>
              </Button>
            ))}
          </div>

          <SearchableSelect
            value={selectedId}
            onValueChange={setSelectedId}
            options={
              linkType === "client"
                ? clients.map((c) => ({ value: c.id, label: c.full_name, subtitle: c.company ?? undefined }))
                : leads.map((l) => ({ value: l.id, label: l.full_name, subtitle: l.company_name ?? undefined }))
            }
            placeholder={`Select ${linkType}...`}
            title={`Select ${linkType === "client" ? "Client" : "Lead"}`}
            searchPlaceholder={`Search ${linkType}s...`}
            emptyMessage={`No ${linkType}s found.`}
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
