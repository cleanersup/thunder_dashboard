import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  formatTime, formatDate, statusBadgeClass,
  formatStatusLabel, formatDuration,
} from "../utils/walkthroughUtils";
import {
  User, Phone, Mail, Briefcase, CalendarIcon, Clock,
  FileText, Users, Edit, Trash2, XCircle, FileCheck,
  MessageSquare, Play, Download, CalendarClock,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button }  from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { SidePanel }     from "@/shared/components/common/SidePanel";
import { toast }         from "sonner";
import {
  useUpdateWalkthroughStatus, useDeleteWalkthrough,
  useWalkthroughEmployees, useCurrentUserId, useSendWalkthroughStart,
} from "../hooks/useWalkthroughs";
import type { WalkthroughWithContact } from "../services/walkthroughsService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function badgeFromClass(cls: string): { color: string; bg: string } {
  // Map the existing statusBadgeClass CSS to inline style tokens for SidePanel badge.
  if (cls.includes("green"))  return { color: "hsl(142 71% 35%)", bg: "hsl(142 71% 45% / 0.15)" };
  if (cls.includes("blue"))   return { color: "hsl(214 84% 56%)", bg: "hsl(214 84% 56% / 0.15)" };
  if (cls.includes("yellow")) return { color: "hsl(45 93% 42%)",  bg: "hsl(45 93% 47% / 0.15)" };
  if (cls.includes("red"))    return { color: "hsl(0 72% 51%)",   bg: "hsl(0 72% 51% / 0.15)" };
  if (cls.includes("orange")) return { color: "hsl(25 95% 53%)",  bg: "hsl(25 95% 53% / 0.15)" };
  return { color: "hsl(220 9% 46%)", bg: "hsl(220 9% 46% / 0.15)" };
}

// ─── InfoRow ─────────────────────────────────────────────────────────────────

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

interface WalkthroughDetailsPanelProps {
  walkthrough: WalkthroughWithContact | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WalkthroughDetailsPanel({
  walkthrough,
  open,
  onClose,
  onUpdated,
}: WalkthroughDetailsPanelProps) {
  const navigate = useNavigate();

  const { mutate: updateStatus }                         = useUpdateWalkthroughStatus();
  const { mutate: deleteMutate, isPending: isDeleting }  = useDeleteWalkthrough();
  const { mutateAsync: sendStart, isPending: isStarting } = useSendWalkthroughStart();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [qrOpen,     setQrOpen]     = useState(false);

  const { data: userId }            = useCurrentUserId();
  const assignedIds                 = walkthrough?.assigned_employees ?? [];
  const { data: employeeList = [] } = useWalkthroughEmployees(assignedIds, open);

  const contactCardUrl = `${import.meta.env.VITE_PUBLIC_APP_URL ?? window.location.origin}/contact-card/${userId ?? ""}`;

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleStartWalkthrough() {
    if (!walkthrough) return;
    try {
      await sendStart(walkthrough.id);
      setQrOpen(true);
    } catch {
      toast.error("Failed to send start notification");
    }
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

  function handleEdit() {
    if (!walkthrough) return;
    onClose();
    navigate(`/walkthroughs/${walkthrough.id}/edit`);
  }

  function handleGenerateEstimate() {
    if (!walkthrough) return;
    const path = walkthrough.service_type === "residential"
      ? "/estimates/new/residential"
      : "/estimates/new/commercial";
    navigate(path, {
      state: {
        prefill: {
          walkthrough_id: walkthrough.id,
          contact_name:   walkthrough.contact_name,
          client_id:      walkthrough.client_id,
          lead_id:        walkthrough.lead_id,
        },
      },
    });
    onClose();
  }

  function handleCancel() {
    if (!walkthrough) return;
    updateStatus(
      { id: walkthrough.id, status: "Cancelled" },
      {
        onSuccess: () => {
          toast.success("Walkthrough cancelled");
          setCancelOpen(false);
          onUpdated();
          onClose();
        },
      },
    );
  }

  function handleDelete() {
    if (!walkthrough) return;
    deleteMutate(walkthrough.id, {
      onSuccess: () => { setDeleteOpen(false); onUpdated(); onClose(); },
    });
  }

  // ── Footer by status ──────────────────────────────────────────────────────

  const status  = walkthrough?.status;
  const footer  = !walkthrough || status === "estimate_sent" ? undefined : (
    <div className="flex flex-wrap items-center gap-2">
      {status === "Scheduled" && (
        <>
          <Button
            size="sm"
            onClick={handleStartWalkthrough}
            disabled={isStarting}
            className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          >
            <Play className="h-3.5 w-3.5" />
            {isStarting ? "Sending..." : "Start"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleEdit} className="gap-1.5">
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.info("Coming soon")} className="px-2.5">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCancelOpen(true)}
            className="px-2.5 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <XCircle className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
      {status === "Pending" && (
        <>
          <Button size="sm" variant="outline" onClick={handleEdit} className="flex-1 gap-1.5">
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.info("Coming soon")} className="px-2.5">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
      {status === "Completed" && (
        <>
          <Button size="sm" onClick={handleGenerateEstimate} className="flex-1 gap-1.5">
            <FileCheck className="h-3.5 w-3.5" /> Generate Estimate
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.info("Coming soon")} className="px-2.5">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
      {status === "Cancelled" && (
        <>
          <Button size="sm" variant="outline" onClick={handleEdit} className="flex-1 gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" /> Reschedule
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.info("Coming soon")} className="px-2.5">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDeleteOpen(true)}
            disabled={isDeleting}
            className="px-2.5 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );

  if (!walkthrough) return null;

  const badgeCls = statusBadgeClass(walkthrough.status);
  const badge    = { label: formatStatusLabel(walkthrough.status), ...badgeFromClass(badgeCls) };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        title={walkthrough.contact_name}
        badge={badge}
        footer={footer}
      >
        <div className="p-4 space-y-6">

          {/* Contact Information */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact Information</h3>
            <InfoRow icon={User} label="Name" value={walkthrough.contact_name} />

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

            {walkthrough.contact_email && (
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{walkthrough.contact_email}</p>
                    <a href={`mailto:${walkthrough.contact_email}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors shrink-0" aria-label="Email">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </section>

          <hr className="border-border" />

          {/* Walkthrough Details */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Walkthrough Details</h3>
            <InfoRow icon={Briefcase}   label="Service Type" value={<span className="capitalize">{walkthrough.service_type}</span>} />
            <InfoRow icon={CalendarIcon} label="Date"        value={formatDate(walkthrough.scheduled_date, true)} />
            <InfoRow icon={Clock}        label="Time"        value={formatTime(walkthrough.scheduled_time)} />
            {walkthrough.duration && (
              <InfoRow icon={Clock} label="Duration" value={formatDuration(walkthrough.duration)} />
            )}
            {walkthrough.notes && (
              <InfoRow icon={FileText} label="Notes" value={walkthrough.notes} />
            )}
          </section>

          <hr className="border-border" />

          {/* Assigned Employees */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Assigned Employees
            </h3>
            {employeeList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No employees assigned</p>
            ) : (
              <div className="space-y-2">
                {employeeList.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-2 text-sm">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{emp.first_name} {emp.last_name}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </SidePanel>

      {/* QR Code Dialog */}
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

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Walkthrough"
        description="This action will change the walkthrough status to Cancelled. You can reschedule it later if needed."
        confirmLabel="Yes, Cancel"
        variant="destructive"
        onConfirm={handleCancel}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Walkthrough"
        description="Are you sure you want to delete this walkthrough? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
