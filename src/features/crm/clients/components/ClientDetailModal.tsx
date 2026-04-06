import { useState } from "react";
import {
  User, Building2, Phone, Mail, MapPin, MessageCircle, MessageSquare,
  Briefcase, FileText, Edit, Trash2, UserX, UserCheck, Route, Receipt,
} from "lucide-react";
import { DetailModal, InfoRow } from "@/shared/components/common/DetailModal";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { ClientForm } from "./ClientForm";
import { useClient, useDeleteClient, useUpdateClient } from "../hooks/useClients";
import { CLIENT_STATUS_BADGE } from "@/shared/constants/styleTokens";
import { formatPhoneDisplay } from "@/shared/utils/phoneInput";
import { toast } from "sonner";
import type { Client } from "../../types/crm.types";

// ─── Action button ────────────────────────────────────────────────────────────
function ActionButton({
  icon: Icon,
  iconBg,
  iconColor = "text-primary",
  label,
  description,
  labelColor = "text-foreground",
  onClick,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor?: string;
  label: string;
  description: string;
  labelColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
    >
      <div className={`p-2 rounded-md flex-shrink-0 ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div>
        <p className={`text-sm font-semibold ${labelColor}`}>{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
interface ClientDetailModalProps {
  client: Client | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Full-detail modal for a client record.
 * Shows personal info, addresses, business details, and quick actions.
 * Inline edit and delete without navigating away from the clients table.
 */
export function ClientDetailModal({ client, open, onClose }: ClientDetailModalProps) {
  const { mutate: deleteClient } = useDeleteClient();
  const { mutate: updateClient } = useUpdateClient();
  const [showEdit, setShowEdit]     = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Always read from the query cache so edits reflect immediately
  const { data: liveClient } = useClient(client?.id);
  const c = liveClient ?? client;

  if (!c) return null;

  const handleDelete = () => deleteClient(c.id, { onSuccess: onClose });

  const handleToggleStatus = () => {
    const next = c.status === "active" ? "inactive" : "active";
    updateClient({ id: c.id, payload: { status: next } });
  };

  const mapsUrl = (street: string, apt: string | null | undefined, city: string, state: string, zip: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${street} ${apt ?? ""} ${city} ${state} ${zip}`)}`;

  const billingLine = [
    `${c.billing_street}${c.billing_apt ? `, ${c.billing_apt}` : ""}`,
    `${c.billing_city}, ${c.billing_state} ${c.billing_zip}`,
  ].join("\n");

  const serviceLine = [
    `${c.service_street}${c.service_apt ? `, ${c.service_apt}` : ""}`,
    `${c.service_city}, ${c.service_state} ${c.service_zip}`,
  ].join("\n");

  return (
    <>
      <DetailModal
        open={open}
        onClose={onClose}
        title={c.full_name}
        badge={{
          label: c.status,
          className: CLIENT_STATUS_BADGE[c.status] ?? "bg-secondary text-secondary-foreground",
        }}
      >
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">

          {/* ── Left: Personal Info + Addresses ──────────────────────── */}
          <div className="p-6 space-y-6">

            <section>
              <h3 className="text-sm font-bold text-foreground mb-4">Personal Information</h3>
              <div className="space-y-4">
                <InfoRow icon={User}      label="Full Name" value={c.full_name} />
                {c.company && <InfoRow icon={Building2} label="Company" value={c.company} />}

                {/* Phone with call + SMS shortcuts */}
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{formatPhoneDisplay(c.phone)}</p>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <a
                          href={`sms:${c.phone}`}
                          className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
                          aria-label="Send SMS"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        </a>
                        <a
                          href={`tel:${c.phone}`}
                          className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
                          aria-label="Call"
                        >
                          <Phone className="h-3.5 w-3.5 text-primary" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email with mailto shortcut */}
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{c.email}</p>
                      <a
                        href={`mailto:${c.email}`}
                        className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors flex-shrink-0"
                        aria-label="Send email"
                      >
                        <Mail className="h-3.5 w-3.5 text-primary" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-border" />

            {/* Billing Address */}
            <section>
              <h3 className="text-sm font-bold text-foreground mb-4">Billing Address</h3>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 flex items-start justify-between gap-2">
                  <p className="text-sm font-medium whitespace-pre-line">{billingLine}</p>
                  <a
                    href={mapsUrl(c.billing_street, c.billing_apt, c.billing_city, c.billing_state, c.billing_zip)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors flex-shrink-0"
                    aria-label="Open in Maps"
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                  </a>
                </div>
              </div>
            </section>

            <hr className="border-border" />

            {/* Service Address */}
            <section>
              <h3 className="text-sm font-bold text-foreground mb-4">Service Address</h3>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 flex items-start justify-between gap-2">
                  <p className="text-sm font-medium whitespace-pre-line">{serviceLine}</p>
                  <a
                    href={mapsUrl(c.service_street, c.service_apt, c.service_city, c.service_state, c.service_zip)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors flex-shrink-0"
                    aria-label="Open in Maps"
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                  </a>
                </div>
              </div>
            </section>
          </div>

          {/* ── Right: Business Details + Quick Actions ───────────────── */}
          <div className="p-6 space-y-6">

            <section>
              <h3 className="text-sm font-bold text-foreground mb-4">Business Details</h3>
              <div className="space-y-4">
                <InfoRow icon={Briefcase}     label="Client Type"         value={<span className="capitalize">{c.client_type}</span>} />
                <InfoRow icon={MessageCircle} label="Contact Preference"  value={<span className="capitalize">{c.contact_preference}</span>} />
                {c.instructions && (
                  <InfoRow icon={FileText} label="Instructions" value={c.instructions} />
                )}
              </div>
            </section>

            <hr className="border-border" />

            <section>
              <h3 className="text-sm font-bold text-foreground mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {/* Always visible */}
                <ActionButton
                  icon={Edit}
                  iconBg="bg-primary/10"
                  label="Edit"
                  description="Modify client details"
                  onClick={() => setShowEdit(true)}
                />

                {/* Active-only actions */}
                {c.status === "active" && (
                  <>
                    <ActionButton
                      icon={FileText}
                      iconBg="bg-primary/10"
                      label="Send Estimate"
                      description="Create and send estimate"
                      onClick={() => toast.info("Coming soon")}
                    />
                    <ActionButton
                      icon={Route}
                      iconBg="bg-primary/10"
                      label="Add to Route"
                      description="Add client to service route"
                      onClick={() => toast.info("Coming soon")}
                    />
                    <ActionButton
                      icon={Receipt}
                      iconBg="bg-primary/10"
                      label="Send Invoice"
                      description="Create and send invoice"
                      onClick={() => toast.info("Coming soon")}
                    />
                    <ActionButton
                      icon={UserX}
                      iconBg="bg-warning/10"
                      iconColor="text-warning"
                      label="Deactivate"
                      description="Set client as inactive"
                      onClick={handleToggleStatus}
                    />
                  </>
                )}

                {/* Inactive-only actions */}
                {c.status === "inactive" && (
                  <ActionButton
                    icon={UserCheck}
                    iconBg="bg-success/10"
                    iconColor="text-success"
                    label="Activate"
                    description="Set client as active"
                    onClick={handleToggleStatus}
                  />
                )}

                {/* Always visible */}
                <ActionButton
                  icon={Trash2}
                  iconBg="bg-destructive/10"
                  iconColor="text-destructive"
                  label="Delete"
                  description="Remove client permanently"
                  labelColor="text-destructive"
                  onClick={() => setShowDelete(true)}
                />
              </div>
            </section>
          </div>
        </div>
      </DetailModal>

      <ClientForm open={showEdit} onClose={() => setShowEdit(false)} client={c} />
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Client"
        description={`Are you sure? ${c.full_name} will be permanently deleted.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  );
}
