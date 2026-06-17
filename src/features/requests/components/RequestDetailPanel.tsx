import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  User, Calendar, Clock, Mail, Phone, MapPin,
  Home, Building2, XCircle,
  Navigation, Users, UserPlus, Trash2, MessageSquare, ArrowRight,
} from "lucide-react";
import { Button }        from "@/shared/components/ui/button";
import { Badge }         from "@/shared/components/ui/badge";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { AddressRouteMap } from "@/shared/components/common/AddressRouteMap";
import { SidePanel }     from "@/shared/components/common/SidePanel";
import { useProfile }    from "@/shared/hooks/useProfile";
import { ConvertRequestDialog } from "./ConvertRequestDialog";
import {
  useConvertToLead, useConvertToClient,
  useCancelRequest, useDeleteRequest,
} from "../hooks/useRequests";
import type { Booking } from "../types/request.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string): { label: string; color: string; bg: string } {
  if (status === "new")       return { label: "New",       color: "hsl(142 71% 35%)", bg: "hsl(142 71% 45% / 0.15)" };
  if (status === "cancelled") return { label: "Cancelled", color: "hsl(0 72% 51%)",   bg: "hsl(0 72% 51% / 0.15)" };
  return { label: status, color: "hsl(220 9% 46%)", bg: "hsl(220 9% 46% / 0.15)" };
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value ?? "—"}</p>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface RequestDetailPanelProps {
  booking: Booking | null;
  open: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RequestDetailPanel({ booking, open, onClose }: RequestDetailPanelProps) {
  const { mutate: toLead   } = useConvertToLead();
  const { mutate: toClient } = useConvertToClient();
  const { mutate: cancel   } = useCancelRequest();
  const { mutate: remove   } = useDeleteRequest();
  const { data: profile }    = useProfile();

  const [confirmAction, setConfirmAction] = useState<"lead" | "client" | "cancel" | "delete" | null>(null);
  const [convertOpen, setConvertOpen]     = useState(false);

  const handleConfirm = () => {
    if (!confirmAction || !booking) return;
    if (confirmAction === "lead")   toLead(booking,    { onSuccess: onClose });
    if (confirmAction === "client") toClient(booking,  { onSuccess: onClose });
    if (confirmAction === "cancel") cancel(booking.id, { onSuccess: onClose });
    if (confirmAction === "delete") remove(booking.id, { onSuccess: onClose });
    setConfirmAction(null);
  };

  const confirmMessages: Record<string, { title: string; description: string; label: string; variant?: "destructive" }> = {
    lead:   { title: "Move to CRM",       description: "A new lead will be created and this request will be deleted.",   label: "Move to CRM"     },
    client: { title: "Convert to Client", description: "A new client will be created and this request will be deleted.", label: "Convert"         },
    cancel: { title: "Cancel Request",    description: "This request will be marked as cancelled.",                       label: "Cancel Request", variant: "destructive" },
    delete: { title: "Delete Request",    description: "This request will be permanently deleted.",                       label: "Delete",         variant: "destructive" },
  };

  const confirm = confirmAction ? confirmMessages[confirmAction] : null;
  const badge   = booking ? statusBadge(booking.status) : undefined;

  const footer = booking ? (
    <div className="flex flex-wrap items-center gap-2">
      {booking.status === "new" && (
        <Button
          size="sm"
          className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setConvertOpen(true)}
        >
          <ArrowRight className="h-3.5 w-3.5" /> Convert Request
        </Button>
      )}
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setConfirmAction("lead")}>
        <Users className="h-3.5 w-3.5" /> Move to CRM
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5 text-success hover:text-success" onClick={() => setConfirmAction("client")}>
        <UserPlus className="h-3.5 w-3.5" /> Convert to Client
      </Button>
      {booking.status !== "cancelled" && (
        <Button size="sm" variant="outline" className="gap-1.5 text-warning hover:text-warning" onClick={() => setConfirmAction("cancel")}>
          <XCircle className="h-3.5 w-3.5" /> Cancel
        </Button>
      )}
      <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmAction("delete")}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </Button>
    </div>
  ) : undefined;

  if (!booking) return null;

  const additionalServices = Array.isArray(booking.additional_services)
    ? (booking.additional_services as string[])
    : [];

  const customAnswers = booking.custom_answers as Record<string, string> | null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${booking.street}${booking.apt_suite ? " " + booking.apt_suite : ""}, ${booking.city}, ${booking.state} ${booking.zip_code}`
  )}`;

  const targetAddress = [booking.street, booking.apt_suite, booking.city, booking.state, booking.zip_code]
    .filter(Boolean)
    .join(", ");

  const companyAddress = [
    profile?.company_address, profile?.company_city, profile?.company_state, profile?.company_zip,
  ].filter(Boolean).join(", ");

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        title={booking.lead_name}
        badge={badge}
        footer={footer}
      >
        <div className="p-4 space-y-6">

          {/* Contact Information */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact Information</h3>
            <InfoRow icon={User} label="Name" value={booking.lead_name} />

            {/* Email with shortcut */}
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{booking.email}</p>
                  <a href={`mailto:${booking.email}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors shrink-0" aria-label="Send email">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                  </a>
                </div>
              </div>
            </div>

            {/* Phone with shortcuts */}
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Phone</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{booking.phone}</p>
                  <div className="flex gap-1.5 shrink-0">
                    <a href={`sms:${booking.phone}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors" aria-label="SMS">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    </a>
                    <a href={`tel:${booking.phone}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors" aria-label="Call">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                    </a>
                  </div>
                </div>
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
                <div>
                  <p className="text-sm font-medium">{booking.street}{booking.apt_suite && `, ${booking.apt_suite}`}</p>
                  <p className="text-sm text-muted-foreground">{booking.city}, {booking.state} {booking.zip_code}</p>
                </div>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors shrink-0" aria-label="Open in Maps">
                  <Navigation className="h-3.5 w-3.5 text-primary" />
                </a>
              </div>
            </div>

            {targetAddress && (
              <AddressRouteMap
                targetAddress={targetAddress}
                companyAddress={companyAddress || undefined}
                className="w-full h-[180px] rounded-lg overflow-hidden"
              />
            )}
          </section>

          <hr className="border-border" />

          {/* Service Information */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Service Information</h3>
            <InfoRow
              icon={booking.service_type === "residential" ? Home : Building2}
              label="Service Type"
              value={<span className="capitalize">{booking.service_type}</span>}
            />
            {booking.commercial_property_type && (
              <InfoRow
                icon={Building2}
                label="Property Type"
                value={booking.commercial_property_type === "Other"
                  ? booking.other_commercial_type ?? "Other"
                  : booking.commercial_property_type}
              />
            )}
            {booking.bedrooms != null && (
              <InfoRow
                icon={Home}
                label="Size"
                value={`${booking.bedrooms} bed / ${booking.bathrooms ?? 0} bath`}
              />
            )}
          </section>

          {/* Schedule */}
          {(booking.preferred_date || booking.time_preference) && (
            <>
              <hr className="border-border" />
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Schedule</h3>
                {booking.preferred_date && (
                  <InfoRow icon={Calendar} label="Preferred Date" value={format(parseISO(booking.preferred_date), "MMMM dd, yyyy")} />
                )}
                {booking.time_preference && (
                  <InfoRow icon={Clock} label="Time Preference" value={<span className="uppercase">{booking.time_preference}</span>} />
                )}
              </section>
            </>
          )}

          {/* Additional Services */}
          {additionalServices.length > 0 && (
            <>
              <hr className="border-border" />
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Additional Services</h3>
                <div className="flex flex-wrap gap-2">
                  {additionalServices.map((s) => (
                    <Badge key={s} variant="secondary" className="bg-primary/10 text-primary border border-primary/20">
                      {s}
                    </Badge>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Service Details */}
          {booking.service_details && (
            <>
              <hr className="border-border" />
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Service Details</h3>
                <p className="text-sm leading-relaxed">{booking.service_details}</p>
              </section>
            </>
          )}

          {/* Custom Answers */}
          {customAnswers && Object.keys(customAnswers).length > 0 && (
            <>
              <hr className="border-border" />
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Additional Information</h3>
                {Object.entries(customAnswers).map(([q, a]) => (
                  <div key={q}>
                    <p className="text-xs text-muted-foreground mb-1">{q}</p>
                    <p className="text-sm">{a}</p>
                  </div>
                ))}
              </section>
            </>
          )}

          <hr className="border-border" />

          {/* Timeline */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Timeline</h3>
            <InfoRow icon={Clock} label="Request Created" value={format(parseISO(booking.created_at), "MMMM dd, yyyy - h:mm a")} />
            {booking.updated_at !== booking.created_at && (
              <InfoRow icon={Clock} label="Last Updated" value={format(parseISO(booking.updated_at), "MMMM dd, yyyy - h:mm a")} />
            )}
          </section>

        </div>
      </SidePanel>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(v) => { if (!v) setConfirmAction(null); }}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        onConfirm={handleConfirm}
        confirmLabel={confirm?.label ?? "Confirm"}
        variant={confirm?.variant}
      />

      <ConvertRequestDialog
        request={booking}
        open={convertOpen}
        onOpenChange={setConvertOpen}
      />
    </>
  );
}
