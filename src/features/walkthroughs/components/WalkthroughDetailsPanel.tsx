import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { format, parseISO } from "date-fns";
import {
  formatTime, formatDate, statusBadgeClass, formatStatusLabel, formatDuration,
} from "../utils/walkthroughUtils";
import {
  Phone, Mail, CalendarIcon, Clock, FileText, Users,
  Edit, Trash2, XCircle, FileCheck, MessageSquare, Play, Download,
  CalendarClock, Loader2, User, CheckCircle2, MapPin, Navigation, Circle,
} from "lucide-react";
import { Badge }         from "@/shared/components/ui/badge";
import { Button }        from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { SidePanel }     from "@/shared/components/common/SidePanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { AddWalkthroughPage }  from "../pages/AddWalkthroughPage";
import { AddressRouteMap }     from "@/shared/components/common/AddressRouteMap";
import { toast }         from "sonner";
import { cn }            from "@/shared/utils/cn";
import {
  useUpdateWalkthroughStatus, useDeleteWalkthrough,
  useWalkthroughEmployees, useCurrentUserId, useSendWalkthroughStart,
} from "../hooks/useWalkthroughs";
import {
  buildEstimatePrefillFromWalkthrough,
  fetchWalkthroughPdfContext,
  type WalkthroughWithContact,
} from "../services/walkthroughsService";
import { buildWalkthroughPdfData } from "../utils/walkthroughPdfData";
import { downloadWalkthroughPdf } from "../services/generateWalkthroughPDF";
import { useProfile } from "@/shared/hooks/useProfile";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusToken(cls: string): { color: string; bg: string } {
  if (cls.includes("green"))  return { color: "hsl(142 71% 35%)", bg: "hsl(142 71% 45% / 0.15)" };
  if (cls.includes("blue"))   return { color: "hsl(214 84% 56%)", bg: "hsl(214 84% 56% / 0.15)" };
  if (cls.includes("yellow")) return { color: "hsl(45 93% 42%)",  bg: "hsl(45 93% 47% / 0.15)" };
  if (cls.includes("red"))    return { color: "hsl(0 72% 51%)",   bg: "hsl(0 72% 51% / 0.15)"  };
  if (cls.includes("orange")) return { color: "hsl(25 95% 53%)",  bg: "hsl(25 95% 53% / 0.15)" };
  return { color: "hsl(220 9% 46%)", bg: "hsl(220 9% 46% / 0.15)" };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{children}</h3>;
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

function Divider() { return <hr className="border-border" />; }

// ─── Props ────────────────────────────────────────────────────────────────────

interface WalkthroughDetailsPanelProps {
  walkthrough: WalkthroughWithContact | null;
  open:        boolean;
  onClose:     () => void;
  onUpdated:   () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WalkthroughDetailsPanel({
  walkthrough, open, onClose, onUpdated,
}: WalkthroughDetailsPanelProps) {
  const navigate = useNavigate();

  const { mutate: updateStatus, isPending: isUpdating } = useUpdateWalkthroughStatus();
  const { mutate: deleteMutate, isPending: isDeleting } = useDeleteWalkthrough();
  const { mutateAsync: sendStart, isPending: isStarting } = useSendWalkthroughStart();

  const [cancelOpen,   setCancelOpen]   = useState(false);
  const [deleteOpen,   setDeleteOpen]   = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [qrOpen,       setQrOpen]       = useState(false);
  const [editOpen,     setEditOpen]     = useState(false);

  const { data: userId }            = useCurrentUserId();
  const assignedIds                 = walkthrough?.assigned_employees ?? [];
  const { data: employeeList = [] } = useWalkthroughEmployees(assignedIds, open);
  const { data: profile }           = useProfile();

  const contactCardUrl = `${import.meta.env.VITE_PUBLIC_APP_URL ?? window.location.origin}/contact-card/${userId ?? ""}`;

  // ── Action handlers ───────────────────────────────────────────────────────

  function doStatusUpdate(status: string, successMsg: string) {
    if (!walkthrough) return;
    updateStatus({ id: walkthrough.id, status }, {
      onSuccess: () => { toast.success(successMsg); onUpdated(); onClose(); },
    });
  }

  async function handleStart() {
    if (!walkthrough) return;
    try {
      await sendStart(walkthrough.id);
      setQrOpen(true);
    } catch { toast.error("Failed to send start notification"); }
  }

  function handleNavigateToForm() {
    if (!walkthrough) return;
    setQrOpen(false);
    onClose();
    const path = walkthrough.service_type === "residential"
      ? `/walkthrough/residential/${walkthrough.id}`
      : `/walkthrough/commercial/${walkthrough.id}`;
    navigate(path);
  }

  async function handleDownloadPDF() {
    if (!walkthrough || !profile) { toast.error("Loading profile… try again."); return; }
    try {
      const ctx = await fetchWalkthroughPdfContext(walkthrough.id);
      const pdfData = buildWalkthroughPdfData(profile, ctx.walkthrough, ctx.contact, ctx.residential, ctx.commercial, ctx.employees);
      downloadWalkthroughPdf(pdfData);
      toast.success("PDF downloaded");
    } catch { toast.error("Could not generate PDF"); }
  }

  async function handleGenerateEstimate() {
    if (!walkthrough) return;
    try {
      const prefill = await buildEstimatePrefillFromWalkthrough(walkthrough);
      const path = walkthrough.service_type === "residential"
        ? "/estimates/new/residential"
        : "/estimates/new/commercial";
      navigate(path, { state: { prefill } });
      onClose();
    } catch { toast.error("Could not load walkthrough data for the estimate"); }
  }

  // ── Footer by status ──────────────────────────────────────────────────────

  const s = walkthrough?.status;

  const btnBase    = "size-sm gap-1.5";
  const btnOutline = `${btnBase} variant-outline`;

  const footer = !walkthrough || s === "estimate_sent" || s === "Converted" ? undefined : (
    <div className="flex flex-wrap items-center gap-2">
      {/* Draft */}
      {s === "Draft" && (
        <>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setScheduleOpen(true)} disabled={isUpdating}>
            <CalendarClock className="h-3.5 w-3.5" /> Schedule
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setCancelOpen(true)}>
            <XCircle className="h-3.5 w-3.5" /> Cancel
          </Button>
        </>
      )}

      {/* Scheduled */}
      {s === "Scheduled" && (
        <>
          <Button size="sm" disabled={isStarting} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => void handleStart()}>
            {isStarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {isStarting ? "Sending…" : "Start"}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void handleDownloadPDF()}>
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setCancelOpen(true)}>
            <XCircle className="h-3.5 w-3.5" /> Cancel
          </Button>
        </>
      )}

      {/* Pending / Started */}
      {(s === "Pending" || s === "Started") && (
        <>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setCompleteOpen(true)} disabled={isUpdating}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Complete
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void handleDownloadPDF()}>
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setCancelOpen(true)}>
            <XCircle className="h-3.5 w-3.5" /> Cancel
          </Button>
        </>
      )}

      {/* Completed */}
      {s === "Completed" && (
        <>
          <Button size="sm" className="gap-1.5" onClick={() => void handleGenerateEstimate()}>
            <FileCheck className="h-3.5 w-3.5" /> Generate Estimate
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void handleDownloadPDF()}>
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setCancelOpen(true)}>
            <XCircle className="h-3.5 w-3.5" /> Cancel
          </Button>
        </>
      )}

      {/* Cancelled */}
      {s === "Cancelled" && (
        <>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
            <CalendarClock className="h-3.5 w-3.5" /> Reschedule
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void handleDownloadPDF()}>
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDeleteOpen(true)} disabled={isDeleting}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </>
      )}
    </div>
  );

  if (!walkthrough) return null;

  const badgeCls = statusBadgeClass(walkthrough.status);
  const badge    = { label: formatStatusLabel(walkthrough.status), ...statusToken(badgeCls) };

  // ── Address ──────────────────────────────────────────────────────────────
  const hasAddress = !!(walkthrough.contact_street && walkthrough.contact_city);
  const targetAddress = hasAddress
    ? [walkthrough.contact_street, walkthrough.contact_city, walkthrough.contact_state, walkthrough.contact_zip]
        .filter(Boolean).join(", ")
    : "";
  const companyAddress = [profile?.company_address, profile?.company_city, profile?.company_state, profile?.company_zip]
    .filter(Boolean).join(", ");
  const mapsUrl = targetAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(targetAddress)}`
    : "";

  // ── Timeline steps ───────────────────────────────────────────────────────
  const STEPS: { key: string; label: string; reached: boolean; subtitle: string }[] = [
    {
      key: "created",
      label: "Walkthrough Created",
      reached: true,
      subtitle: format(parseISO(walkthrough.created_at), "MMM d, yyyy 'at' h:mm a"),
    },
    {
      key: "scheduled",
      label: "Scheduled",
      reached: ["Scheduled", "Started", "Pending", "Completed", "Converted", "estimate_sent"].includes(walkthrough.status),
      subtitle: ["Scheduled", "Started", "Pending", "Completed", "Converted", "estimate_sent"].includes(walkthrough.status)
        ? formatDate(walkthrough.scheduled_date, true)
        : "Pending",
    },
    {
      key: "started",
      label: "Started",
      reached: ["Started", "Completed", "Converted", "estimate_sent"].includes(walkthrough.status),
      subtitle: ["Started", "Completed", "Converted", "estimate_sent"].includes(walkthrough.status)
        ? "In progress"
        : "Not started yet",
    },
    {
      key: "completed",
      label: "Completed",
      reached: ["Completed", "Converted", "estimate_sent"].includes(walkthrough.status),
      subtitle: ["Completed", "Converted", "estimate_sent"].includes(walkthrough.status)
        ? "Completed"
        : "Not completed yet",
    },
    {
      key: "converted",
      label: "Converted to Estimate",
      reached: walkthrough.status === "Converted" || walkthrough.status === "estimate_sent",
      subtitle: walkthrough.status === "Converted" || walkthrough.status === "estimate_sent"
        ? "Converted"
        : "Not converted yet",
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <SidePanel open={open} onClose={onClose} title={walkthrough.contact_name} badge={badge} footer={footer}>
        <div className="p-4 space-y-6">

          {/* ── Timeline ──────────────────────────────────────────────── */}
          <section>
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-blue-400" />
              <div className="space-y-5">
                {STEPS.map((step) => (
                  <div key={step.key} className="flex gap-3 relative">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 mt-0.5 z-10 flex items-center justify-center shrink-0",
                      step.reached
                        ? "bg-blue-500 border-blue-500"
                        : "bg-background border-border",
                    )}>
                      {step.reached
                        ? <CheckCircle2 className="w-4 h-4 text-white" />
                        : <Circle className="w-4 h-4 text-muted-foreground" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{step.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <Divider />

          {/* ── Contact ────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionTitle>Contact</SectionTitle>
              <Badge variant="outline" className="text-xs capitalize">
                {walkthrough.walkthrough_type}
              </Badge>
            </div>

            {/* Phone */}
            {walkthrough.contact_phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{walkthrough.contact_phone}</p>
                    <div className="flex gap-1.5 shrink-0">
                      <a href={`sms:${walkthrough.contact_phone}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors" aria-label="SMS">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      </a>
                      <a href={`tel:${walkthrough.contact_phone}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors" aria-label="Call">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Email */}
            {walkthrough.contact_email && (
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{walkthrough.contact_email}</p>
                    <a href={`mailto:${walkthrough.contact_email}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors shrink-0" aria-label="Send email">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </section>

          <Divider />

          {/* ── Schedule ──────────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionTitle>Schedule</SectionTitle>
              <Badge variant="outline" className={cn("text-xs capitalize", badgeCls)}>
                {walkthrough.service_type}
              </Badge>
            </div>

            <InfoRow icon={CalendarIcon} label="Date" value={formatDate(walkthrough.scheduled_date, true)} />
            <InfoRow icon={Clock}        label="Time" value={formatTime(walkthrough.scheduled_time)} />
            {walkthrough.duration && (
              <InfoRow icon={Clock} label="Duration" value={formatDuration(walkthrough.duration)} />
            )}
          </section>

          {/* ── Service Address ───────────────────────────────────────── */}
          {hasAddress && (
            <>
              <Divider />
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionTitle>Service Address</SectionTitle>
                  <Badge variant="outline" className={cn("text-xs capitalize", badgeCls)}>
                    {walkthrough.service_type}
                  </Badge>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{walkthrough.contact_street}</p>
                      <p className="text-sm text-muted-foreground">
                        {walkthrough.contact_city}, {walkthrough.contact_state} {walkthrough.contact_zip}
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
                <AddressRouteMap
                  targetAddress={targetAddress}
                  companyAddress={companyAddress || undefined}
                  className="w-full h-[180px] rounded-lg overflow-hidden"
                />
              </section>
            </>
          )}

          {/* ── Notes ─────────────────────────────────────────────────── */}
          {walkthrough.notes && (
            <>
              <Divider />
              <section className="space-y-2">
                <SectionTitle>Notes</SectionTitle>
                <p className="text-sm leading-relaxed">{walkthrough.notes}</p>
              </section>
            </>
          )}

          {/* ── Assigned Crew ─────────────────────────────────────────── */}
          {(employeeList.length > 0 || assignedIds.length > 0) && (
            <>
              <Divider />
              <section className="space-y-3">
                <SectionTitle>Assigned Crew</SectionTitle>
                {employeeList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Loading employees…</p>
                ) : (
                  <div className="space-y-2">
                    {employeeList.map((emp) => (
                      <div key={emp.id} className="flex items-center gap-2 text-sm p-2.5 rounded-lg bg-muted/40">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                        {emp.position && <span className="text-muted-foreground text-xs">— {emp.position}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* updated_at note */}
          {walkthrough.updated_at !== walkthrough.created_at && (
            <>
              <Divider />
              <p className="text-xs text-muted-foreground">
                Updated {format(parseISO(walkthrough.updated_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </>
          )}

        </div>
      </SidePanel>

      {/* ── QR Code ────────────────────────────────────────────────────── */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm p-6 gap-3">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-center">Share your information with your client</DialogTitle>
            <p className="text-sm text-muted-foreground text-center">
              Ask your client to scan this QR code so they can easily save all of your company's information
            </p>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="p-4 rounded-lg border border-border bg-white">
              <QRCodeSVG value={contactCardUrl} size={180} level="H" includeMargin />
            </div>
            <Button className="w-full h-12 text-base font-semibold" onClick={handleNavigateToForm}>
              Start Walkthrough
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm: Schedule ──────────────────────────────────────────── */}
      <ConfirmDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        title="Schedule Walkthrough?"
        description="This will confirm the walkthrough and notify the client."
        confirmLabel="Yes, Schedule"
        onConfirm={() => { setScheduleOpen(false); doStatusUpdate("Scheduled", "Walkthrough scheduled"); }}
      />

      {/* ── Confirm: Mark Complete ─────────────────────────────────────── */}
      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Mark as Completed?"
        description="Are you sure the walkthrough has been completed?"
        confirmLabel="Yes, Completed"
        onConfirm={() => { setCompleteOpen(false); doStatusUpdate("Completed", "Walkthrough completed"); }}
      />

      {/* ── Confirm: Cancel ────────────────────────────────────────────── */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Walkthrough"
        description="This action will change the walkthrough status to Cancelled. You can reschedule it later if needed."
        confirmLabel="Yes, Cancel"
        variant="destructive"
        onConfirm={() => { setCancelOpen(false); doStatusUpdate("Cancelled", "Walkthrough cancelled"); }}
      />

      {/* ── Confirm: Delete ────────────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Walkthrough"
        description="Are you sure you want to delete this walkthrough? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          deleteMutate(walkthrough.id, {
            onSuccess: () => { setDeleteOpen(false); onUpdated(); onClose(); },
          });
        }}
      />

      {/* Edit walkthrough modal — key forces remount when ID changes */}
      <AddWalkthroughPage
        key={walkthrough.id}
        open={editOpen}
        onClose={() => { setEditOpen(false); onUpdated(); }}
        walkthroughEditId={walkthrough.id}
      />
    </>
  );
}
