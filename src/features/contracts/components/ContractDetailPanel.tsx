/**
 * @module ContractDetailPanel
 * F23f: Side panel for a Contract record — replaces ContractDetailModal.
 * Shows all contract information + footer actions by status.
 * Actions mirror the table row dropdown menu exactly.
 */
import { format, parseISO } from "date-fns";
import {
  User, Mail, Phone, MapPin, CalendarIcon, DollarSign,
  FileSignature, ClipboardList, Send, Edit2, Mail as MailIcon,
  RotateCcw, Download, Trash2,
} from "lucide-react";
import { Button }           from "@/shared/components/ui/button";
import { Separator }        from "@/shared/components/ui/separator";
import { SidePanel }        from "@/shared/components/common/SidePanel";
import { useSendContractEmail } from "../hooks/useSendContractEmail";
import { useSendContractSMS }   from "../hooks/useSendContractSMS";
import type { Contract, ContractStatus } from "../types/contract.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE_MAP: Record<ContractStatus, { label: string; bg: string; color: string }> = {
  Draft:    { label: "Draft",    bg: "bg-muted",          color: "text-muted-foreground" },
  Pending:  { label: "Pending",  bg: "bg-blue-100",       color: "text-blue-700" },
  Active:   { label: "Active",   bg: "bg-green-100",      color: "text-green-700" },
  Expiring: { label: "Expiring", bg: "bg-yellow-100",     color: "text-yellow-800" },
  Expired:  { label: "Expired",  bg: "bg-red-100",        color: "text-red-700" },
};

const FREQ_LABEL: Record<string, string> = {
  "one-time": "One-time",
  weekly:     "Weekly",
  biweekly:   "Biweekly",
  monthly:    "Monthly",
};

const canEdit   = (s: ContractStatus) => s === "Draft" || s === "Pending";
const canSend   = (s: ContractStatus) => s === "Pending" || s === "Active" || s === "Expiring";
const canRenew  = (s: ContractStatus) => s === "Active" || s === "Expiring" || s === "Expired";
const canDelete = (s: ContractStatus) => s === "Draft" || s === "Pending" || s === "Expired";

// ─── InfoRow ─────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value ?? "—"}</p>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContractDetailPanelProps {
  contract:    Contract | null;
  open:        boolean;
  onClose:     () => void;
  onEdit?:     (contract: Contract) => void;
  onRenew?:    (contract: Contract) => void;
  onDownload?: (contract: Contract) => void;
  onDelete?:   (contract: Contract) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContractDetailPanel({
  contract, open, onClose, onEdit, onRenew, onDownload, onDelete,
}: ContractDetailPanelProps) {
  const sendEmail = useSendContractEmail();
  const sendSMS   = useSendContractSMS();

  const fmtDate = (iso: string | null) =>
    iso ? format(parseISO(iso), "MMM d, yyyy") : "—";

  const badgeInfo     = contract ? STATUS_BADGE_MAP[contract.status] ?? STATUS_BADGE_MAP.Draft : undefined;
  const activeClauses = contract ? contract.sections.filter((c) => c.body?.trim()).length : 0;

  const handleResend = () => {
    if (!contract) return;
    const email = contract.recipient_email?.trim();
    if (email) sendEmail.mutate({ contractId: contract.id, recipientEmail: email });
    const phone = contract.recipient_phone?.trim();
    if (phone) {
      const contractUrl = contract.public_share_token
        ? `${window.location.origin}/public/contract/${contract.public_share_token}`
        : `${window.location.origin}/public/contract/${contract.id}`;
      sendSMS.mutate({
        phoneNumber: phone,
        clientName: contract.recipient_name,
        contractUrl,
        contractTotal: Number(contract.total),
        isUpdate: true,
      });
    }
  };

  const footer = contract ? (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit(contract.status) && onEdit && (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { onClose(); onEdit(contract); }}>
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </Button>
      )}
      {canSend(contract.status) && (contract.recipient_email?.trim() || contract.recipient_phone?.trim()) && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={sendEmail.isPending || sendSMS.isPending}
          onClick={handleResend}
        >
          <MailIcon className="w-3.5 h-3.5" /> Resend
        </Button>
      )}
      {canRenew(contract.status) && onRenew && (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { onClose(); onRenew(contract); }}>
          <RotateCcw className="w-3.5 h-3.5" /> Renew
        </Button>
      )}
      {onDownload && (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onDownload(contract)}>
          <Download className="w-3.5 h-3.5" /> Download PDF
        </Button>
      )}
      {canDelete(contract.status) && onDelete && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
          onClick={() => { onClose(); onDelete(contract); }}
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </Button>
      )}
    </div>
  ) : undefined;

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={contract?.contract_number ?? ""}
      badge={badgeInfo}
      footer={footer}
    >
      {contract && (
        <div className="p-4 space-y-6">

          {/* Recipient */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recipient</h3>
            <InfoRow icon={User}   label="Name"    value={contract.recipient_name} />
            <InfoRow icon={Mail}   label="Email"   value={contract.recipient_email ?? "—"} />
            <InfoRow icon={Phone}  label="Phone"   value={contract.recipient_phone ?? "—"} />
            <InfoRow icon={MapPin} label="Address" value={contract.recipient_address ?? "—"} />
          </section>

          <Separator />

          {/* Contract Period */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contract Period</h3>
            <InfoRow icon={CalendarIcon}  label="Start Date" value={fmtDate(contract.start_date)} />
            <InfoRow icon={CalendarIcon}  label="End Date"   value={fmtDate(contract.end_date)} />
            <InfoRow icon={DollarSign}    label="Amount"     value={`$${Number(contract.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
            <InfoRow icon={FileSignature} label="Frequency"  value={FREQ_LABEL[contract.payment_frequency] ?? contract.payment_frequency} />
          </section>

          <Separator />

          {/* Content */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Content</h3>
            <InfoRow
              icon={ClipboardList}
              label="Policies"
              value={`${activeClauses} clause${activeClauses !== 1 ? "s" : ""}`}
            />
            <InfoRow
              icon={Send}
              label="Delivery"
              value={
                contract.delivery_method === "email" ? "Email"
                  : contract.delivery_method === "sms" ? "SMS"
                  : "Email + SMS"
              }
            />
          </section>

          <Separator />

          {/* Timestamps */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Timestamps</h3>
            <InfoRow icon={CalendarIcon} label="Created" value={fmtDate(contract.created_at)} />
            <InfoRow icon={CalendarIcon} label="Updated" value={fmtDate(contract.updated_at)} />
            {contract.renewed_at && (
              <InfoRow icon={FileSignature} label="Renewed" value={fmtDate(contract.renewed_at)} />
            )}
          </section>

        </div>
      )}
    </SidePanel>
  );
}
