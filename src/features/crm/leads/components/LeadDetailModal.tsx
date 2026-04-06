import { useState } from "react";
import { User, Building2, Phone, Mail, MapPin, TrendingUp, Briefcase, Tag, Calendar, FileText, Edit, Trash2, UserCheck } from "lucide-react";
import { DetailModal, InfoRow } from "@/shared/components/common/DetailModal";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { LeadForm } from "./LeadForm";
import { useDeleteLead, useLead, useUpdateLead } from "../hooks/useLeads";
import { convertLeadToClient } from "../services/leadsService";
import { LEAD_STATUS_BADGE, PRIORITY_BADGE } from "@/shared/constants/styleTokens";
import { formatPhoneDisplay } from "@/shared/utils/phoneInput";
import { toast } from "sonner";
import type { Lead } from "../../types/crm.types";

// ─── Component ────────────────────────────────────────────────────────────────
interface LeadDetailModalProps {
  /** Lead to display. When null the modal stays closed. */
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Full-detail modal for a lead record.
 * Shows personal info, address, lead details, follow-up notes, and quick actions.
 * Inline edit and delete without navigating away from the kanban.
 */
export function LeadDetailModal({ lead, open, onClose }: LeadDetailModalProps) {
  const { mutate: deleteLead } = useDeleteLead();
  const { mutate: updateLead } = useUpdateLead();
  const [showEdit, setShowEdit]     = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [converting, setConverting] = useState(false);

  // Always read from the query cache so edits reflect immediately
  const { data: liveLead } = useLead(lead?.id);
  const l = liveLead ?? lead;

  if (!l) return null;

  const handleDelete = () => {
    deleteLead(l.id, { onSuccess: onClose });
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      await convertLeadToClient(l!);
      updateLead({ id: l.id, payload: { decision_result: "won" } });
      toast.success(`${l.full_name} converted to client`);
      onClose();
    } catch {
      toast.error("Failed to convert lead to client");
    } finally {
      setConverting(false);
    }
  };

  const addressLine = [
    l.address + (l.apt_suite ? `, ${l.apt_suite}` : ""),
    `${l.city}, ${l.state} ${l.zip_code}`,
  ].join("\n");

  return (
    <>
      <DetailModal
        open={open}
        onClose={onClose}
        title={l.full_name}
        badge={{
          label: l.status,
          className: LEAD_STATUS_BADGE[l.status] ?? "bg-secondary text-secondary-foreground",
        }}
      >
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">

          {/* Left: Personal + Address */}
          <div className="p-6 space-y-6">
            <section>
              <h3 className="text-sm font-bold text-foreground mb-4">Personal Information</h3>
              <div className="space-y-4">
                <InfoRow icon={User}      label="Full Name" value={l.full_name} />
                <InfoRow icon={Building2} label="Company"   value={l.company_name} />
                <InfoRow icon={Phone}     label="Phone"     value={formatPhoneDisplay(l.phone)} />
                <InfoRow icon={Mail}      label="Email"     value={l.email} />
              </div>
            </section>

            <hr className="border-border" />

            <section>
              <h3 className="text-sm font-bold text-foreground mb-4">Address</h3>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm font-medium whitespace-pre-line">{addressLine}</p>
              </div>
            </section>
          </div>

          {/* Right: Lead Details + Follow-up + Quick Actions */}
          <div className="p-6 space-y-6">
            <section>
              <h3 className="text-sm font-bold text-foreground mb-4">Lead Details</h3>
              <div className="space-y-4">
                <InfoRow icon={TrendingUp} label="Lead Source"        value={<span className="capitalize">{l.lead_source}</span>} />
                <InfoRow icon={Briefcase}  label="Service Interested" value={<span className="capitalize">{l.service_interested}</span>} />
                {/* Priority row with badge */}
                <div className="flex items-start gap-3">
                  <Tag className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Priority</p>
                      <p className="text-sm font-medium capitalize">{l.priority_level}</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${PRIORITY_BADGE[l.priority_level] ?? "bg-secondary text-secondary-foreground"}`}>
                      {l.priority_level}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-border" />

            <section>
              <h3 className="text-sm font-bold text-foreground mb-4">Follow-up</h3>
              <div className="space-y-4">
                {l.next_followup_date ? (
                  <InfoRow icon={Calendar} label="Next Follow-up" value={l.next_followup_date} />
                ) : (
                  <p className="text-xs text-muted-foreground">No follow-up scheduled</p>
                )}
                {l.internal_notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Notes</p>
                      <p className="text-sm text-foreground">{l.internal_notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <hr className="border-border" />

            <section>
              <h3 className="text-sm font-bold text-foreground mb-3">Quick Actions</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>
                  <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                {l.status === "decision" && l.decision_result !== "won" && (
                  <Button size="sm" onClick={handleConvert} disabled={converting}>
                    <UserCheck className="h-3.5 w-3.5 mr-1" />
                    {converting ? "Converting..." : "Convert to Client"}
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => setShowDelete(true)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
            </section>
          </div>
        </div>
      </DetailModal>

      <LeadForm open={showEdit} onClose={() => setShowEdit(false)} lead={l} />
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Lead"
        description={`Are you sure? ${l.full_name} will be permanently deleted.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  );
}
