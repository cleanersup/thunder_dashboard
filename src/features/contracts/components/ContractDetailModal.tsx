/**
 * @module ContractDetailModal
 * CON-6: Detail modal for a Contract record.
 * Shows all contract information + quick actions by status.
 */
import { format, parseISO } from "date-fns";
import {
  User, Mail, Phone, MapPin, CalendarIcon, DollarSign,
  FileSignature, ClipboardList, Send, Edit2, Mail as MailIcon,
} from "lucide-react";
import { Button }              from "@/shared/components/ui/button";
import { Separator }           from "@/shared/components/ui/separator";
import { DetailModal, InfoRow } from "@/shared/components/common/DetailModal";
import { useSendContractEmail } from "../hooks/useSendContractEmail";
import type { Contract, ContractStatus } from "../types/contract.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE_MAP: Record<ContractStatus, { label: string; className: string }> = {
  Draft:    { label: "Draft",    className: "bg-muted text-muted-foreground" },
  Pending:  { label: "Pending",  className: "bg-blue-100 text-blue-700" },
  Active:   { label: "Active",   className: "bg-green-100 text-green-700" },
  Expiring: { label: "Expiring", className: "bg-yellow-100 text-yellow-800" },
  Expired:  { label: "Expired",  className: "bg-red-100 text-red-700" },
};

const FREQ_LABEL: Record<string, string> = {
  "one-time": "One-time",
  weekly:     "Weekly",
  biweekly:   "Biweekly",
  monthly:    "Monthly",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContractDetailModalProps {
  contract:  Contract | null;
  open:      boolean;
  onClose:   () => void;
  onEdit?:   (contract: Contract) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContractDetailModal({ contract, open, onClose, onEdit }: ContractDetailModalProps) {
  const sendEmail = useSendContractEmail();

  if (!contract) return null;

  const badgeInfo = STATUS_BADGE_MAP[contract.status] ?? STATUS_BADGE_MAP.Draft;
  const canSend   = contract.status !== "Draft";
  const activeClauses = contract.sections.filter((c) => c.body?.trim()).length;

  const fmtDate = (iso: string | null) =>
    iso ? format(parseISO(iso), "MMM d, yyyy") : "—";

  return (
    <DetailModal
      open={open}
      onClose={onClose}
      title={contract.contract_number}
      badge={badgeInfo}
    >
      <div className="p-6 space-y-6">

        {/* ── Recipient & Dates ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Recipient
            </h3>
            <InfoRow icon={User}    label="Name"    value={contract.recipient_name} />
            <InfoRow icon={Mail}    label="Email"   value={contract.recipient_email  ?? "—"} />
            <InfoRow icon={Phone}   label="Phone"   value={contract.recipient_phone  ?? "—"} />
            <InfoRow icon={MapPin}  label="Address" value={contract.recipient_address ?? "—"} />
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Contract Period
            </h3>
            <InfoRow icon={CalendarIcon}  label="Start Date" value={fmtDate(contract.start_date)} />
            <InfoRow icon={CalendarIcon}  label="End Date"   value={fmtDate(contract.end_date)} />
            <InfoRow icon={DollarSign}    label="Amount"     value={`$${Number(contract.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
            <InfoRow icon={FileSignature} label="Frequency"  value={FREQ_LABEL[contract.payment_frequency] ?? contract.payment_frequency} />
          </div>
        </div>

        <Separator />

        {/* ── Contract Content Summary ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Content
            </h3>
            <InfoRow
              icon={ClipboardList}
              label="Policies"
              value={`${activeClauses} clause${activeClauses !== 1 ? "s" : ""}`}
            />
            <InfoRow
              icon={Send}
              label="Delivery"
              value={contract.delivery_method === "email" ? "Email"
                  : contract.delivery_method === "sms"   ? "SMS"
                  : "Email + SMS"}
            />
          </div>

          {/* Dates */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Timestamps
            </h3>
            <InfoRow icon={CalendarIcon} label="Created"  value={fmtDate(contract.created_at)} />
            {contract.sent_at && (
              <InfoRow icon={Send}       label="Sent"     value={fmtDate(contract.sent_at)} />
            )}
            {contract.accepted_at && (
              <InfoRow icon={FileSignature} label="Accepted" value={fmtDate(contract.accepted_at)} />
            )}
          </div>
        </div>

        <Separator />

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Actions
          </h3>
          <div className="flex flex-wrap gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => { onClose(); onEdit(contract); }}
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
            {canSend && contract.recipient_email && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={sendEmail.isPending}
                onClick={() => sendEmail.mutate({ contractId: contract.id, recipientEmail: contract.recipient_email! })}
              >
                <MailIcon className="w-3.5 h-3.5" /> Resend Email
              </Button>
            )}
          </div>
        </div>
      </div>
    </DetailModal>
  );
}
