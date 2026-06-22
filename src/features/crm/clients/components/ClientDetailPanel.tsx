import { useState } from "react";
import {
  User, Building2, Phone, Mail, MapPin, MessageSquare,
  MessageCircle, Briefcase, FileText, Edit, Trash2, UserX, UserCheck, Route, Receipt,
  CreditCard, Plus,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { SidePanel } from "@/shared/components/common/SidePanel";
import { ClientForm } from "./ClientForm";
import { ClientCardSetupDialog } from "./ClientCardSetupDialog";
import { PropertyCard } from "./PropertyCard";
import { PropertyForm } from "./PropertyForm";
import { useClientProperties } from "../hooks/useClientProperties";
import type { ClientProperty } from "../types/clientProperty.types";
import {
  useClient,
  useDeleteClient,
  useUpdateClient,
  useClearClientSavedCard,
} from "../hooks/useClients";
import { formatPhoneDisplay, isPhoneValid } from "@/shared/utils/phoneInput";
import { toast } from "sonner";
import type { Client } from "../../types/crm.types";

// ─── Row ─────────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value ?? "—"}</p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ClientDetailPanelProps {
  client: Client | null;
  open: boolean;
  onClose: () => void;
}

export function ClientDetailPanel({ client, open, onClose }: ClientDetailPanelProps) {
  const { mutate: deleteClient } = useDeleteClient();
  const { mutate: updateClient } = useUpdateClient();
  const clearSavedCard = useClearClientSavedCard();
  const [showEdit, setShowEdit]     = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showRemoveCard, setShowRemoveCard] = useState(false);
  const [showCardSetup, setShowCardSetup] = useState(false);
  const [propertyFormOpen, setPropertyFormOpen]       = useState(false);
  const [editingProperty, setEditingProperty]         = useState<ClientProperty | undefined>();

  const { data: properties = [] } = useClientProperties(client?.id);

  const { data: liveClient } = useClient(client?.id);
  const c = liveClient ?? client;

  const handleDelete = () => {
    if (!c) return;
    deleteClient(c.id, { onSuccess: onClose });
  };

  const handleToggleStatus = () => {
    if (!c) return;
    const next = c.status === "active" ? "inactive" : "active";
    updateClient({ id: c.id, payload: { status: next } });
  };

  const handleRemoveSavedCard = () => {
    if (!c) return;
    clearSavedCard.mutate(c.id, { onSuccess: () => setShowRemoveCard(false) });
  };

  // SidePanel applies badge.color/badge.bg as inline CSS, so these must be color
  // values (not Tailwind classes). Mirrors the RequestDetailPanel status badge.
  const badge = c
    ? c.status === "active"
      ? { label: "Active",   color: "hsl(var(--green-vibrant))", bg: "hsl(var(--green-vibrant) / 0.15)" }
      : { label: "Inactive", color: "hsl(220 9% 46%)",           bg: "hsl(220 9% 46% / 0.15)" }
    : undefined;

  const footer = c ? (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setShowEdit(true)} className="flex-1">
        <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="px-2.5">···</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {c.status === "active" && (
            <>
              <DropdownMenuItem onClick={() => toast.info("Coming soon")}>
                <FileText className="h-3.5 w-3.5 mr-2" /> Send Estimate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Coming soon")}>
                <Route className="h-3.5 w-3.5 mr-2" /> Add to Route
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Coming soon")}>
                <Receipt className="h-3.5 w-3.5 mr-2" /> Send Invoice
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleToggleStatus}>
                <UserX className="h-3.5 w-3.5 mr-2 text-warning" /> Deactivate
              </DropdownMenuItem>
            </>
          )}
          {c.status === "inactive" && (
            <DropdownMenuItem onClick={handleToggleStatus}>
              <UserCheck className="h-3.5 w-3.5 mr-2 text-success" /> Activate
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : undefined;

  if (!c) return null;

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

  const hasSavedCard = !!c.stripe_default_payment_method_id;
  const cardBrand = c.card_brand ? c.card_brand.toUpperCase() : "CARD";
  const cardExpiry = c.card_exp_month && c.card_exp_year
    ? `${String(c.card_exp_month).padStart(2, "0")}/${String(c.card_exp_year).slice(-2)}`
    : "—";

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        title={c.full_name}
        badge={badge}
        footer={footer}
      >
        <div className="p-4 space-y-6">

          {/* Personal Info */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personal Information</h3>
            <InfoRow icon={User} label="Full Name" value={c.full_name} />
            {c.company && <InfoRow icon={Building2} label="Company" value={c.company} />}

            {/* Phone with shortcuts */}
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Phone</p>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-medium truncate${isPhoneValid(c.phone) ? "" : " text-destructive"}`}>
                    {formatPhoneDisplay(c.phone)}
                  </p>
                  <div className="flex gap-1.5 shrink-0">
                    <a href={`sms:${c.phone}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors" aria-label="Send SMS">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    </a>
                    <a href={`tel:${c.phone}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors" aria-label="Call">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Email with shortcut */}
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{c.email}</p>
                  <a href={`mailto:${c.email}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors shrink-0" aria-label="Send email">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                  </a>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-border" />

          {/* Billing Address */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Billing Address</h3>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 flex items-start justify-between gap-2">
                <p className="text-sm font-medium whitespace-pre-line">{billingLine}</p>
                <a
                  href={mapsUrl(c.billing_street, c.billing_apt, c.billing_city, c.billing_state, c.billing_zip)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
                  aria-label="Open in Maps"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                </a>
              </div>
            </div>
          </section>

          <hr className="border-border" />

          {/* Service Address */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Service Address</h3>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 flex items-start justify-between gap-2">
                <p className="text-sm font-medium whitespace-pre-line">{serviceLine}</p>
                <a
                  href={mapsUrl(c.service_street, c.service_apt, c.service_city, c.service_state, c.service_zip)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
                  aria-label="Open in Maps"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                </a>
              </div>
            </div>
          </section>

          <hr className="border-border" />

          {/* Business Details */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Business Details</h3>
            <InfoRow icon={Briefcase}     label="Client Type"        value={<span className="capitalize">{c.client_type}</span>} />
            <InfoRow icon={MessageCircle} label="Contact Preference" value={<span className="capitalize">{c.contact_preference}</span>} />
            {c.instructions && (
              <InfoRow icon={FileText} label="Instructions" value={c.instructions} />
            )}
          </section>

          <hr className="border-border" />

          {/* Properties */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Properties</h3>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => { setEditingProperty(undefined); setPropertyFormOpen(true); }}
              >
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            {properties.length === 0 ? (
              <p className="text-sm text-muted-foreground">No properties yet</p>
            ) : (
              properties.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  clientId={c.id}
                  onEdit={(prop) => { setEditingProperty(prop); setPropertyFormOpen(true); }}
                />
              ))
            )}
          </section>

          <hr className="border-border" />

          {/* Payment Methods */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Methods</h3>
            </div>

            {hasSavedCard ? (
              <div className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {cardBrand} ending in {c.card_last4 ?? "••••"}
                    </p>
                    <p className="text-xs text-muted-foreground">Default card · Expires {cardExpiry}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCardSetup(true)}
                  >
                    <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Update Card
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowRemoveCard(true)}
                    disabled={clearSavedCard.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-muted">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">No card on file</p>
                    <p className="text-xs text-muted-foreground">
                      Add a client card securely through Stripe to charge future invoices.
                    </p>
                  </div>
                </div>
                <div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => setShowCardSetup(true)}
                  >
                    <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Add Card
                  </Button>
                </div>
              </div>
            )}
          </section>

        </div>
      </SidePanel>

      <ClientForm open={showEdit} onClose={() => setShowEdit(false)} client={c} />
      <PropertyForm
        open={propertyFormOpen}
        onOpenChange={setPropertyFormOpen}
        clientId={c.id}
        property={editingProperty}
      />
      <ClientCardSetupDialog client={c} open={showCardSetup} onOpenChange={setShowCardSetup} />
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Client"
        description={`Are you sure? ${c.full_name} will be permanently deleted.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
      <ConfirmDialog
        open={showRemoveCard}
        onOpenChange={setShowRemoveCard}
        title="Remove Saved Card"
        description="This removes the saved card from the dashboard for future charges. It will not delete the client."
        onConfirm={handleRemoveSavedCard}
        confirmLabel="Remove Card"
        variant="destructive"
        isLoading={clearSavedCard.isPending}
      />
    </>
  );
}
