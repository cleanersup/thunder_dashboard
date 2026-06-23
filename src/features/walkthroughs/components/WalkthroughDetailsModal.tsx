import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/shared/config/queryKeys";
import { QRCodeSVG } from "qrcode.react";
import {
  formatTime,
  formatDate,
  statusBadgeClass,
  formatStatusLabel,
  formatDuration,
} from "../utils/walkthroughUtils";
import {
  User,
  Phone,
  Mail,
  Briefcase,
  CalendarIcon,
  Clock,
  FileText,
  Users,
  Edit,
  Trash2,
  XCircle,
  FileCheck,
  MessageSquare,
  Play,
  Download,
  CalendarClock,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { toast } from "sonner";
import { useUpdateWalkthroughStatus, useDeleteWalkthrough, useWalkthroughEmployees, useCurrentUserId, useSendWalkthroughStart } from "../hooks/useWalkthroughs";
import {
  createEstimateDraftFromWalkthrough,
  fetchWalkthroughPdfContext,
  type WalkthroughWithContact,
} from "../services/walkthroughsService";
import { buildWalkthroughPdfData } from "../utils/walkthroughPdfData";
import { downloadWalkthroughPdf } from "../services/generateWalkthroughPDF";
import { useProfile } from "@/shared/hooks/useProfile";

// ─── Props ────────────────────────────────────────────────────────────────────

interface WalkthroughDetailsModalProps {
  walkthrough: WalkthroughWithContact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WalkthroughDetailsModal({
  walkthrough,
  open,
  onOpenChange,
  onUpdated,
}: WalkthroughDetailsModalProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { mutate: updateStatus }                       = useUpdateWalkthroughStatus();
  const { mutate: deleteMutate, isPending: isDeleting } = useDeleteWalkthrough();
  const { mutateAsync: sendStart, isPending: isStarting } = useSendWalkthroughStart();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [qrOpen,     setQrOpen]     = useState(false);

  const { data: userId }      = useCurrentUserId();
  const assignedIds           = walkthrough?.assigned_employees ?? [];
  const { data: employeeList = [] } = useWalkthroughEmployees(assignedIds, open);
  const { data: profile }     = useProfile();

  const contactCardUrl = `${import.meta.env.VITE_PUBLIC_APP_URL ?? window.location.origin}/contact-card/${userId ?? ""}`;

  if (!walkthrough) return null;

  const { status } = walkthrough;

  // ── Actions ──────────────────────────────────────────────────────────────

  function handleEdit() {
    onOpenChange(false);
    navigate(`/walkthroughs/${walkthrough!.id}/edit`);
  }

  /** Sends start notification then shows QR dialog. On QR confirm, navigates to the on-site form. */
  async function handleStartWalkthrough() {
    try {
      await sendStart(walkthrough!.id);
      setQrOpen(true);
    } catch {
      toast.error("Failed to send start notification");
    }
  }

  function handleNavigateToForm() {
    setQrOpen(false);
    onOpenChange(false);
    const path = walkthrough!.service_type === "residential"
      ? `/walkthrough/residential/${walkthrough!.id}`
      : `/walkthrough/commercial/${walkthrough!.id}`;
    navigate(path);
  }

  function handleCancel() {
    updateStatus(
      { id: walkthrough!.id, status: "Cancelled" },
      {
        onSuccess: () => {
          toast.success("Walkthrough cancelled");
          setCancelOpen(false);
          onUpdated();
          onOpenChange(false);
        },
      }
    );
  }

  function handleDelete() {
    deleteMutate(walkthrough!.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        onUpdated();
        onOpenChange(false);
      },
    });
  }

  async function handleDownloadPDF() {
    if (!profile) {
      toast.error("Loading profile… try again in a moment.");
      return;
    }
    try {
      const ctx = await fetchWalkthroughPdfContext(walkthrough!.id);
      const pdfData = buildWalkthroughPdfData(
        profile,
        ctx.walkthrough,
        ctx.contact,
        ctx.residential,
        ctx.commercial,
        ctx.employees,
      );
      await downloadWalkthroughPdf(pdfData);
      toast.success("PDF downloaded");
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Could not generate PDF");
    }
  }

  async function handleGenerateEstimate() {
    try {
      const { estimateId, route } = await createEstimateDraftFromWalkthrough(walkthrough!);
      qc.invalidateQueries({ queryKey: QK.walkthroughs });
      qc.invalidateQueries({ queryKey: QK.estimates });
      navigate(route, { state: { isEditing: true, isConversionDraft: true, estimateId } });
      onOpenChange(false);
    } catch {
      toast.error("Could not generate estimate from walkthrough");
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl lg:max-w-[720px] p-0 gap-0 max-h-[90vh] overflow-hidden">
          {/* Header */}
          <DialogHeader className="flex-row items-center gap-3 px-6 py-3 border-b border-border/50 bg-[#202B3D]">
            <DialogTitle className="text-lg font-bold text-white">
              {walkthrough.contact_name}
            </DialogTitle>
            <Badge variant="outline" className={statusBadgeClass(status)}>
              {formatStatusLabel(status)}
            </Badge>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-60px)]">
            <div className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* ── Left Column ──────────────────────────────────────── */}
                <div className="space-y-4">

                  {/* Contact Info */}
                  <Card className="border border-border/50">
                    <CardContent className="p-5 space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">Contact Information</h4>

                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Name</p>
                          <p className="text-sm font-medium">{walkthrough.contact_name}</p>
                        </div>
                      </div>

                      {walkthrough.contact_phone && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-primary shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Phone</p>
                              <p className="text-sm font-medium">{walkthrough.contact_phone}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <a
                              href={`sms:${walkthrough.contact_phone}`}
                              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-primary" />
                            </a>
                            <a
                              href={`tel:${walkthrough.contact_phone}`}
                              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5 text-primary" />
                            </a>
                          </div>
                        </div>
                      )}

                      {walkthrough.contact_email && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-primary shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Email</p>
                              <p className="text-sm font-medium">{walkthrough.contact_email}</p>
                            </div>
                          </div>
                          <a
                            href={`mailto:${walkthrough.contact_email}`}
                            className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5 text-primary" />
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Walkthrough Details */}
                  <Card className="border border-border/50">
                    <CardContent className="p-5 space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">Walkthrough Details</h4>

                      <div className="flex items-center gap-3">
                        <Briefcase className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Service Type</p>
                          <p className="text-sm font-medium capitalize">{walkthrough.service_type}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Date</p>
                          <p className="text-sm font-medium">{formatDate(walkthrough.scheduled_date, true)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Time</p>
                          <p className="text-sm font-medium">{formatTime(walkthrough.scheduled_time)}</p>
                        </div>
                      </div>

                      {walkthrough.duration && (
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Duration</p>
                            <p className="text-sm font-medium">
                              {formatDuration(walkthrough.duration)}
                            </p>
                          </div>
                        </div>
                      )}

                      {walkthrough.notes && (
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Notes</p>
                            <p className="text-sm">{walkthrough.notes}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* ── Right Column ─────────────────────────────────────── */}
                <div className="space-y-4">

                  {/* Assigned Employees */}
                  <Card className="border border-border/50">
                    <CardContent className="p-5 space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Assigned Employees
                      </h4>
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
                    </CardContent>
                  </Card>

                  {/* Quick Actions — hidden for estimate_sent */}
                  {status !== "estimate_sent" && (
                    <Card className="border border-border/50">
                      <CardContent className="p-5 space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">Quick Actions</h4>

                        {/* ── Scheduled ─────────────────────────────────── */}
                        {status === "Scheduled" && (
                          <>
                            <Button
                              variant="outline"
                              className="w-full justify-start gap-2"
                              onClick={handleEdit}
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start gap-2 text-green-600 border-green-500/30 hover:bg-green-500/10"
                              onClick={handleStartWalkthrough}
                              disabled={isStarting}
                            >
                              <Play className="w-4 h-4" />
                              {isStarting ? "Sending..." : "Start Walkthrough"}
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start gap-2"
                              onClick={handleDownloadPDF}
                            >
                              <Download className="w-4 h-4" />
                              Download PDF
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => setCancelOpen(true)}
                            >
                              <XCircle className="w-4 h-4" />
                              Cancel Walkthrough
                            </Button>
                          </>
                        )}

                        {/* ── Pending ───────────────────────────────────── */}
                        {status === "Pending" && (
                          <>
                            <Button
                              variant="outline"
                              className="w-full justify-start gap-2"
                              onClick={handleEdit}
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start gap-2"
                              onClick={handleDownloadPDF}
                            >
                              <Download className="w-4 h-4" />
                              Download PDF
                            </Button>
                          </>
                        )}

                        {/* ── Completed ─────────────────────────────────── */}
                        {status === "Completed" && (
                          <>
                            <Button
                              variant="outline"
                              className="w-full justify-start gap-2"
                              onClick={handleGenerateEstimate}
                            >
                              <FileCheck className="w-4 h-4" />
                              Generate Estimate
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start gap-2"
                              onClick={handleDownloadPDF}
                            >
                              <Download className="w-4 h-4" />
                              Download PDF
                            </Button>
                          </>
                        )}

                        {/* ── Cancelled ─────────────────────────────────── */}
                        {status === "Cancelled" && (
                          <>
                            <Button
                              variant="outline"
                              className="w-full justify-start gap-2"
                              onClick={handleEdit}
                            >
                              <CalendarClock className="w-4 h-4" />
                              Reschedule
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start gap-2"
                              onClick={handleDownloadPDF}
                            >
                              <Download className="w-4 h-4" />
                              Download PDF
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => setDeleteOpen(true)}
                              disabled={isDeleting}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

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
            {/* QR Code */}
            <div className="p-4 rounded-lg border border-border bg-white">
              <QRCodeSVG
                value={contactCardUrl}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>

            {/* Navigate to form */}
            <Button className="w-full h-12 text-base font-semibold" onClick={handleNavigateToForm}>
              Start Walkthrough
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel confirm */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Walkthrough"
        description="This action will change the walkthrough status to Cancelled. You can reschedule it later if needed."
        confirmLabel="Yes, Cancel"
        variant="destructive"
        onConfirm={handleCancel}
      />

      {/* Delete confirm */}
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
