/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase rows (linked estimate fields not in generated types) */
import { useState } from "react";
import { formatDisplayDate, formatDisplayDateTime } from "@/shared/utils/formatters";
import { useNavigate } from "react-router-dom";
import {
  Calendar, Clock, Mail, Phone, MapPin,
  Home, Building2, XCircle, FileText,
  Navigation, Trash2, MessageSquare, ArrowRightLeft, Edit,
  Archive, RefreshCw, Receipt, ClipboardList, ChevronRight, Image as ImageIcon, Loader2, Link2, MoreHorizontal,
} from "lucide-react";
import { Button }         from "@/shared/components/ui/button";
import { Badge }          from "@/shared/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ConfirmDialog }  from "@/shared/components/common/ConfirmDialog";
import { AddressRouteMap } from "@/shared/components/common/AddressRouteMap";
import { SidePanel }      from "@/shared/components/common/SidePanel";
import { useProfile }     from "@/shared/hooks/useProfile";
import { ConvertRequestDialog } from "./ConvertRequestDialog";
import { EditRequestPage }      from "../pages/EditRequestPage";
import { LinkContactDialog }    from "./LinkContactDialog";
import { AddWalkthroughPage }   from "@/features/walkthroughs/pages/AddWalkthroughPage";
import { useWalkthrough }       from "@/features/walkthroughs/hooks/useWalkthroughs";
import { useEstimate }          from "@/features/estimates/hooks/useEstimates";
import { useClientProperties }  from "@/features/crm/clients/hooks/useClientProperties";
import {
  useCancelRequest, useDeleteRequest,
  useArchiveRequest, useRestoreRequest,
} from "../hooks/useRequests";
import type { Booking, BookingAttachmentMeta, WalkthroughConvertConfig } from "../types/request.types";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/shared/utils/cn";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(booking: Booking): { label: string; color: string; bg: string } {
  const s = booking.status;
  if (s === "new")       return { label: "New",       color: "hsl(25 95% 53%)",   bg: "hsl(25 95% 53% / 0.15)"  };
  if (s === "archived")  return { label: "Archived",  color: "hsl(220 9% 46%)",   bg: "hsl(220 9% 46% / 0.15)"  };
  if (s === "cancelled") return { label: "Cancelled", color: "hsl(0 72% 51%)",    bg: "hsl(0 72% 51% / 0.15)"   };
  if (s === "converted") {
    const label = booking.converted_to_type
      ? `→ ${booking.converted_to_type === "walkthrough" ? "Walkthrough" : "Estimate"}`
      : "Converted";
    return { label, color: "hsl(270 70% 50%)", bg: "hsl(270 70% 50% / 0.15)" };
  }
  return { label: s, color: "hsl(220 9% 46%)", bg: "hsl(220 9% 46% / 0.15)" };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function InfoRow({
  icon: Icon, label, value, className,
}: {
  icon: React.ElementType; label: string; value: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value ?? "—"}</p>
      </div>
    </div>
  );
}

function Divider() {
  return <hr className="border-border" />;
}

const resolveUrl = (att: BookingAttachmentMeta) =>
  supabase.storage.from("route-files").getPublicUrl(att.path).data.publicUrl;

// ─── Props ────────────────────────────────────────────────────────────────────

interface RequestDetailPanelProps {
  booking: Booking | null;
  open:    boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RequestDetailPanel({ booking, open, onClose }: RequestDetailPanelProps) {
  const navigate = useNavigate();

  const { mutate: cancel  } = useCancelRequest();
  const { mutate: remove  } = useDeleteRequest();
  const { mutate: archive } = useArchiveRequest();
  const { mutate: restore } = useRestoreRequest();
  const { data: profile }   = useProfile();

  const [confirmAction, setConfirmAction]         = useState<"cancel" | "archive" | "delete" | null>(null);
  const [convertOpen, setConvertOpen]             = useState(false);
  const [editOpen, setEditOpen]                   = useState(false);
  const [linkContactOpen, setLinkContactOpen]     = useState(false);
  const [lightboxUrl, setLightboxUrl]             = useState<string | null>(null);
  const [walkthroughOpen, setWalkthroughOpen]     = useState(false);
  const [walkthroughConfig, setWalkthroughConfig] = useState<WalkthroughConvertConfig | null>(null);

  const handleConfirm = () => {
    if (!confirmAction || !booking) return;
    if (confirmAction === "cancel")  cancel(booking.id,  { onSuccess: onClose });
    if (confirmAction === "archive") archive(booking.id, { onSuccess: onClose });
    if (confirmAction === "delete")  remove(booking.id,  { onSuccess: onClose });
    setConfirmAction(null);
  };

  const confirmMessages: Record<string, { title: string; description: string; label: string; variant?: "destructive" }> = {
    cancel:  { title: "Cancel Request?",  description: "The request will remain visible with a Cancelled status.", label: "Yes, cancel",      variant: "destructive" },
    archive: { title: "Archive Request?", description: "The request will be archived. You can reactivate it later.", label: "Archive" },
    delete:  { title: "Delete Request?",  description: "This action cannot be undone.",                              label: "Delete permanently", variant: "destructive" },
  };

  const confirm = confirmAction ? confirmMessages[confirmAction] : null;
  const badge   = booking ? statusBadge(booking) : undefined;

  // ── Linked conversion record fetch (must be above the guard) ─────────────
  const linkedWalkthroughId = booking?.converted_to_type === "walkthrough"
    ? (booking.converted_to_id ?? undefined) : undefined;
  const linkedEstimateId = booking?.converted_to_type === "estimate"
    ? (booking.converted_to_id ?? null) : null;

  const {
    data:      linkedWalkthrough,
    isLoading: isLoadingWalkthrough,
    isError:   walkthroughDeleted,
  } = useWalkthrough(linkedWalkthroughId, { staleTime: 0 });

  const {
    data:      linkedEstimate,
    isLoading: isLoadingEstimate,
    isError:   estimateDeleted,
  } = useEstimate(linkedEstimateId, { staleTime: 0 });

  const isLoadingLinked = isLoadingWalkthrough || isLoadingEstimate;

  // ── Property lookup (must be above the guard) ──────────────────────────────
  const { data: clientProperties = [] } = useClientProperties(booking?.client_id ?? undefined);
  const matchedProperty = booking?.client_property_id
    ? clientProperties.find((p) => p.id === booking.client_property_id)
    : clientProperties.find(
        (p) =>
          p.street.toLowerCase().trim() === (booking?.street ?? "").toLowerCase().trim() &&
          p.city.toLowerCase().trim()   === (booking?.city   ?? "").toLowerCase().trim() &&
          p.zip_code.trim()             === (booking?.zip_code ?? "").trim()
      );

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footer = booking ? (
    <div className="flex items-center gap-2">
      {booking.status === "new" && (
        <>
          <Button size="sm" className="flex-1 gap-1.5" onClick={() => setConvertOpen(true)}>
            <ArrowRightLeft className="h-3.5 w-3.5" /> Convert
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="px-2.5">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmAction("archive")}>
                <Archive className="h-4 w-4 mr-2" /> Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmAction("cancel")}>
                <XCircle className="h-4 w-4 mr-2" /> Cancel Request
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
      {booking.status === "cancelled" && (
        <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmAction("delete")}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      )}
      {booking.status === "archived" && (
        <Button size="sm" className="flex-1 gap-1.5" onClick={() => restore(booking.id, { onSuccess: onClose })}>
          <RefreshCw className="h-3.5 w-3.5" /> Reactivate
        </Button>
      )}
    </div>
  ) : undefined;

  if (!booking) return null;

  // ── Derived data ───────────────────────────────────────────────────────────
  const isAnonymous        = !booking.client_id && !booking.lead_id;
  const additionalServices = Array.isArray(booking.additional_services)
    ? (booking.additional_services as string[]) : [];
  const customAnswers      = booking.custom_answers as Record<string, string> | null;
  const attachments        = (booking.attachments ?? []) as BookingAttachmentMeta[];
  const images             = attachments.filter((a) => a.type?.startsWith("image/"));
  const pdfs               = attachments.filter((a) => !a.type?.startsWith("image/"));

  const targetAddress  = [booking.street, booking.apt_suite, booking.city, booking.state, booking.zip_code]
    .filter(Boolean).join(", ");
  const companyAddress = [profile?.company_address, profile?.company_city, profile?.company_state, profile?.company_zip]
    .filter(Boolean).join(", ");
  const mapsUrl        = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(targetAddress)}`;

  return (
    <>
      <SidePanel open={open} onClose={onClose} title={booking.lead_name} badge={badge} footer={footer}>
        <div className="p-4 space-y-6">

          {/* ── Converted To ─────────────────────────────────────────────── */}
          {booking.status === "converted" && booking.converted_to_type && (
            <>
              <section className="space-y-2">
                <SectionTitle>Converted To</SectionTitle>

                {isLoadingLinked ? (
                  <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading linked record…
                  </div>
                ) : (walkthroughDeleted && booking.converted_to_type === "walkthrough") ||
                    (estimateDeleted    && booking.converted_to_type === "estimate") ? (
                  <p className="text-sm text-muted-foreground px-1">
                    The linked {booking.converted_to_type} was deleted.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (booking.converted_to_type === "walkthrough" && booking.converted_to_id) {
                        navigate("/walkthroughs", { state: { openId: booking.converted_to_id } });
                      } else if (booking.converted_to_type === "estimate" && booking.converted_to_id) {
                        navigate("/estimates", { state: { openId: booking.converted_to_id } });
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className={cn("p-2 rounded flex-shrink-0",
                      booking.converted_to_type === "estimate" ? "bg-blue-500/10" : "bg-green-500/10"
                    )}>
                      {booking.converted_to_type === "estimate"
                        ? <Receipt className="w-4 h-4 text-blue-500" />
                        : <ClipboardList className="w-4 h-4 text-green-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {booking.converted_to_type === "estimate" ? "Estimate" : "Walkthrough"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.converted_to_type === "walkthrough" && linkedWalkthrough
                          ? `${linkedWalkthrough.service_type} · ${linkedWalkthrough.status}`
                          : booking.converted_to_type === "estimate" && linkedEstimate
                            ? `${(linkedEstimate as any).serviceType ?? (linkedEstimate as any).service_type ?? ""} · ${(linkedEstimate as any).status ?? ""}`.trim().replace(/^·\s*/, "")
                            : "View the linked record"
                        }
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                )}
              </section>
              <Divider />
            </>
          )}

          {/* ── Contact Information ──────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionTitle>Contact</SectionTitle>
              {isAnonymous && (
                <Badge variant="outline" className="text-xs border-orange-400 text-orange-500 bg-orange-50">
                  Unlinked
                </Badge>
              )}
            </div>

            {/* Email */}
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{booking.email || "—"}</p>
                  {booking.email && (
                    <a href={`mailto:${booking.email}`}
                      className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
                      aria-label="Send email"
                    >
                      <Mail className="h-3.5 w-3.5 text-primary" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Phone</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{booking.phone || "—"}</p>
                  {booking.phone && (
                    <div className="flex gap-1.5 shrink-0">
                      <a href={`sms:${booking.phone}`}
                        className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
                        aria-label="SMS"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      </a>
                      <a href={`tel:${booking.phone}`}
                        className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
                        aria-label="Call"
                      >
                        <Phone className="h-3.5 w-3.5 text-primary" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Link to existing contact — only for anonymous requests with status new */}
            {isAnonymous && booking.status === "new" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                onClick={() => setLinkContactOpen(true)}
              >
                <Link2 className="h-4 w-4" />
                Link to existing Client or Lead
              </Button>
            )}
          </section>

          <Divider />

          {/* ── Service Overview (type + schedule together) ───────────────── */}
          <section className="space-y-3">
            <SectionTitle>Service</SectionTitle>

            <InfoRow
              icon={booking.service_type === "residential" ? Home : Building2}
              label="Type"
              value={<span className="capitalize">{booking.service_type}</span>}
            />

            {booking.commercial_property_type && (
              <InfoRow
                icon={Building2}
                label="Property Type"
                value={
                  booking.commercial_property_type === "Other"
                    ? booking.other_commercial_type ?? "Other"
                    : booking.commercial_property_type
                }
              />
            )}

            {booking.bedrooms != null && (
              <InfoRow
                icon={Home}
                label="Size"
                value={`${booking.bedrooms} bed / ${booking.bathrooms ?? 0} bath`}
              />
            )}

            {booking.preferred_date && (
              <InfoRow
                icon={Calendar}
                label="Preferred Date"
                value={formatDisplayDate(booking.preferred_date)}
              />
            )}

            {booking.time_preference && (
              <InfoRow
                icon={Clock}
                label="Time Preference"
                value={<span className="uppercase">{booking.time_preference}</span>}
              />
            )}
          </section>

          <Divider />

          {/* ── Service Address ───────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionTitle>Service Address</SectionTitle>
              <Badge variant="outline" className="text-xs capitalize">
                {booking.service_type}
              </Badge>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 flex items-start justify-between gap-2">
                <div>
                  {matchedProperty?.title && (
                    <p className="text-sm font-semibold mb-0.5">{matchedProperty.title}</p>
                  )}
                  <p className="text-sm font-medium">
                    {booking.street}{booking.apt_suite && `, ${booking.apt_suite}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {booking.city}, {booking.state} {booking.zip_code}
                  </p>
                </div>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
                  aria-label="Open in Maps"
                >
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

          {/* ── Additional Services ───────────────────────────────────────── */}
          {additionalServices.length > 0 && (
            <>
              <Divider />
              <section className="space-y-3">
                <SectionTitle>Additional Services</SectionTitle>
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

          {/* ── Service Details ───────────────────────────────────────────── */}
          {booking.service_details && (
            <>
              <Divider />
              <section className="space-y-2">
                <SectionTitle>Service Details</SectionTitle>
                <p className="text-sm leading-relaxed">{booking.service_details}</p>
              </section>
            </>
          )}

          {/* ── Custom Answers ────────────────────────────────────────────── */}
          {customAnswers && Object.keys(customAnswers).length > 0 && (
            <>
              <Divider />
              <section className="space-y-3">
                <SectionTitle>Additional Information</SectionTitle>
                {Object.entries(customAnswers).map(([q, a]) => (
                  <div key={q}>
                    <p className="text-xs text-muted-foreground mb-0.5">{q}</p>
                    <p className="text-sm font-medium">{a}</p>
                  </div>
                ))}
              </section>
            </>
          )}

          {/* ── Attachments ───────────────────────────────────────────────── */}
          {attachments.length > 0 && (
            <>
              <Divider />
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionTitle>Attachments</SectionTitle>
                  <span className="text-xs text-muted-foreground">{attachments.length}</span>
                </div>

                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {images.map((att) => (
                      <button
                        key={att.path}
                        className="w-20 h-20 rounded-md overflow-hidden border border-border bg-muted flex-shrink-0 hover:opacity-80 transition-opacity"
                        onClick={() => setLightboxUrl(resolveUrl(att))}
                      >
                        <img
                          src={resolveUrl(att)}
                          alt={att.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {pdfs.length > 0 && (
                  <div className="space-y-2">
                    {pdfs.map((att) => (
                      <a
                        key={att.path}
                        href={resolveUrl(att)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors"
                      >
                        <FileText className="h-5 w-5 text-destructive shrink-0" />
                        <span className="text-sm truncate flex-1">{att.name}</span>
                      </a>
                    ))}
                  </div>
                )}

                {images.length === 0 && pdfs.length === 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <ImageIcon className="h-4 w-4" />
                    <span>No attachments</span>
                  </div>
                )}
              </section>
            </>
          )}

          <Divider />

          {/* ── Timeline ──────────────────────────────────────────────────── */}
          <section className="space-y-2">
            <SectionTitle>Timeline</SectionTitle>
            <p className="text-xs text-muted-foreground">
              Created {formatDisplayDateTime(booking.created_at)}
            </p>
            {booking.updated_at !== booking.created_at && (
              <p className="text-xs text-muted-foreground">
                Updated {formatDisplayDateTime(booking.updated_at)}
              </p>
            )}
          </section>

        </div>
      </SidePanel>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-1.5"
            onClick={() => setLightboxUrl(null)}
          >
            <XCircle className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-md"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

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
        onEstimateConvert={(route, state) => { onClose(); navigate(route, { state }); }}
        onWalkthroughConvert={(config) => { setWalkthroughConfig(config); setWalkthroughOpen(true); }}
      />

      <AddWalkthroughPage
        open={walkthroughOpen}
        onClose={() => { setWalkthroughOpen(false); setWalkthroughConfig(null); onClose(); }}
        fromRequestId={walkthroughConfig?.fromRequestId}
        walkthroughEditId={walkthroughConfig?.walkthroughEditId}
        prefillContactType={walkthroughConfig?.prefillContactType}
        prefillContactId={walkthroughConfig?.prefillContactId}
        prefillServiceType={walkthroughConfig?.prefillServiceType}
        prefillDate={walkthroughConfig?.prefillDate}
        prefillTime={walkthroughConfig?.prefillTime}
        prefillNotes={walkthroughConfig?.prefillNotes}
        prefillPropertyId={walkthroughConfig?.prefillPropertyId}
      />

      <EditRequestPage
        bookingId={booking.id}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />

      <LinkContactDialog
        open={linkContactOpen}
        onOpenChange={setLinkContactOpen}
        bookingId={booking.id}
        onLinked={onClose}
      />
    </>
  );
}
