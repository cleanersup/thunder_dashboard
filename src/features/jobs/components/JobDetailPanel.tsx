/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase rows (jobs extended fields not in generated types) */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Briefcase, Calendar, Clock, User, Mail, Phone, MapPin,
  Edit, CheckCircle, XCircle, Trash2, Download, Play,
  CalendarClock, FileText, MoreHorizontal, Receipt, ChevronRight,
} from "lucide-react";
import { Button }       from "@/shared/components/ui/button";
import { SidePanel }    from "@/shared/components/common/SidePanel";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { Calendar as CalendarPicker } from "@/shared/components/ui/calendar";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { JobStatusBadge }     from "./JobStatusBadge";
import { JobCompleteDialog }  from "./JobCompleteDialog";
import { AddJobPage }         from "../pages/AddJobPage";
import { useJob }             from "../hooks/useJobs";
import { useDeleteJob, useUpdateJobStatus } from "../hooks/useJobMutations";
import { jobsService } from "../services/jobsService";
import { QK } from "@/shared/config/queryKeys";
import { getEffectiveJobStatus } from "../types/job.types";
import { JOB_STATUS_BADGE }   from "../config/jobStatusConfig";
import { generateJobPDF }     from "../services/generateJobPDF";
import { useProfile }         from "@/shared/hooks/useProfile";
import { useAllEmployees }    from "@/features/employees/hooks/useEmployees";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{children}</h3>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function Divider() { return <hr className="border-border" />; }

interface JobDetailPanelProps {
  jobId:     string | null;
  open:      boolean;
  onClose:   () => void;
  onUpdated: () => void;
}

export function JobDetailPanel({ jobId, open, onClose, onUpdated }: JobDetailPanelProps) {
  const navigate = useNavigate();
  const { data: job, isLoading }    = useJob(jobId ?? undefined);
  const { data: profile }           = useProfile();
  const { data: allEmployees = [] } = useAllEmployees();
  const { mutate: deleteJob,    isPending: deleting }  = useDeleteJob();
  const { mutate: updateStatus, isPending: updating }  = useUpdateJobStatus();
  const qc = useQueryClient();

  const [showComplete,     setShowComplete]     = useState(false);
  const [showDelete,       setShowDelete]       = useState(false);
  const [showCancel,       setShowCancel]       = useState(false);
  const [showPublish,      setShowPublish]      = useState(false);
  const [showEditModal,    setShowEditModal]    = useState(false);
  const [showReschedule,   setShowReschedule]   = useState(false);
  const [rescheduleDate,   setRescheduleDate]   = useState<Date | undefined>();
  const [rescheduleStart,  setRescheduleStart]  = useState("");
  const [rescheduleEnd,    setRescheduleEnd]    = useState("");
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!job) return;
    setDownloadingPDF(true);
    try {
      const assigned = allEmployees.filter((e) => job.employeeIds.includes(e.id));
      await generateJobPDF(
        job,
        assigned.map((e) => ({ first_name: e.first_name, last_name: e.last_name })),
        {
          company_name:    profile?.company_name,
          company_logo:    profile?.company_logo,
          company_phone:   profile?.company_phone,
          company_email:   profile?.company_email,
          company_address: profile?.company_address,
          company_city:    profile?.company_city,
          company_state:   profile?.company_state,
          company_zip:     profile?.company_zip,
        },
      );
    } finally {
      setDownloadingPDF(false);
    }
  };

  const [isRescheduling, setIsRescheduling] = useState(false);

  const handleReschedule = async () => {
    if (!job || !rescheduleDate) return;
    setIsRescheduling(true);
    try {
      // Update date/time and status atomically — avoids intermediate cache invalidation
      // showing "Missed" between the two separate mutation calls
      await jobsService.update(job.id, {
        jobDate:   format(rescheduleDate, "yyyy-MM-dd"),
        startTime: rescheduleStart || undefined,
        endTime:   rescheduleEnd   || undefined,
      });
      await jobsService.updateStatus(job.id, "Upcoming");
      qc.invalidateQueries({ queryKey: QK.jobs });
      qc.invalidateQueries({ queryKey: QK.job(job.id) });
      toast.success(`Rescheduled to ${format(rescheduleDate, "MMMM d, yyyy")}${rescheduleStart ? ` at ${rescheduleStart}` : ""}`);
      setShowReschedule(false);
      setRescheduleDate(undefined);
      onUpdated();
    } catch {
      toast.error("Failed to reschedule job");
    } finally {
      setIsRescheduling(false);
    }
  };

  if (!open) return null;

  const effectiveStatus = job ? getEffectiveJobStatus(job) : null;
  const badgeCls = effectiveStatus ? (JOB_STATUS_BADGE[effectiveStatus] ?? "") : "";

  // derive color/bg from tailwind class for SidePanel badge
  const badgeColor = badgeCls.includes("yellow")  ? "hsl(45 93% 42%)"
    : badgeCls.includes("blue")   ? "hsl(214 84% 56%)"
    : badgeCls.includes("green")  ? "hsl(142 71% 35%)"
    : badgeCls.includes("red")    ? "hsl(0 72% 51%)"
    : "hsl(220 9% 46%)";
  const badgeBg = badgeColor.replace(")", " / 0.15)");

  const badge = effectiveStatus
    ? { label: effectiveStatus, color: badgeColor, bg: badgeBg }
    : undefined;

  const firstInvoiceId = job?.invoiceIds?.[0] ?? null;

  // ── Footer actions by status ───────────────────────────────────────────────
  const footer = (() => {
    if (!job || !effectiveStatus) return undefined;

    if (effectiveStatus === "Draft") return (
      <div className="flex items-center gap-2">
        <Button size="sm" className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowPublish(true)}>
          <Play className="h-3.5 w-3.5" /> Publish & Schedule
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="px-2.5"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setShowEditModal(true)}>
              <Edit className="h-4 w-4 mr-2" /> Edit Job
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowCancel(true)}>
              <XCircle className="h-4 w-4 mr-2" /> Cancel Job
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );

    if (effectiveStatus === "Scheduled") return (
      <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => setShowCancel(true)}>
        <XCircle className="h-3.5 w-3.5" /> Cancel Job
      </Button>
    );

    if (effectiveStatus === "Upcoming" || effectiveStatus === "Today") return (
      <div className="flex items-center gap-2">
        <Button size="sm" className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowComplete(true)}>
          <CheckCircle className="h-3.5 w-3.5" /> Mark as Completed
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="px-2.5"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setShowEditModal(true)}>
              <Edit className="h-4 w-4 mr-2" /> Edit Job
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
  // Only pre-fill date if it's today or future — past dates would be re-marked as missed by backend trigger
  const jobDt = job ? parseISO(job.jobDate) : undefined;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  setRescheduleDate(jobDt && jobDt >= today ? jobDt : undefined);
  setRescheduleStart(job?.startTime ?? "");
  setRescheduleEnd(job?.endTime ?? "");
  setShowReschedule(true);
}}>
              <CalendarClock className="h-4 w-4 mr-2" /> Reschedule
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowCancel(true)}>
              <XCircle className="h-4 w-4 mr-2" /> Cancel Job
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );

    if (effectiveStatus === "Completed") return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={handleDownloadPDF} disabled={downloadingPDF}>
          <Download className="h-3.5 w-3.5" /> {downloadingPDF ? "Generating…" : "Save PDF"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="px-2.5"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {firstInvoiceId && (
              <DropdownMenuItem onClick={() => { onClose(); navigate("/invoices", { state: { openId: firstInvoiceId } }); }}>
                <Receipt className="h-4 w-4 mr-2" /> View Invoice
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete Permanently
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );

    if (effectiveStatus === "Missed") return (
      <div className="flex items-center gap-2">
        <Button size="sm" className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowComplete(true)}>
          <CheckCircle className="h-3.5 w-3.5" /> Mark as Completed
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="px-2.5"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => {
  // Only pre-fill date if it's today or future — past dates would be re-marked as missed by backend trigger
  const jobDt = job ? parseISO(job.jobDate) : undefined;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  setRescheduleDate(jobDt && jobDt >= today ? jobDt : undefined);
  setRescheduleStart(job?.startTime ?? "");
  setRescheduleEnd(job?.endTime ?? "");
  setShowReschedule(true);
}}>
              <CalendarClock className="h-4 w-4 mr-2" /> Reschedule
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowCancel(true)}>
              <XCircle className="h-4 w-4 mr-2" /> Cancel Job
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );

    if (effectiveStatus === "Cancelled") return (
      <div className="flex items-center gap-2">
        <Button size="sm" className="flex-1 gap-1.5" onClick={() => {
  // Only pre-fill date if it's today or future — past dates would be re-marked as missed by backend trigger
  const jobDt = job ? parseISO(job.jobDate) : undefined;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  setRescheduleDate(jobDt && jobDt >= today ? jobDt : undefined);
  setRescheduleStart(job?.startTime ?? "");
  setRescheduleEnd(job?.endTime ?? "");
  setShowReschedule(true);
}}>
          <CalendarClock className="h-3.5 w-3.5" /> Reschedule
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="px-2.5"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete Permanently
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );

    return undefined;
  })();

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        title={job?.jobNumber ? `Job #${job.jobNumber}` : "Job"}
        badge={badge}
        footer={footer}
      >
        {isLoading || !job ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="p-4 space-y-6">

            {/* ── Schedule ─────────────────────────────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <SectionTitle>Schedule</SectionTitle>
                <JobStatusBadge status={job.status} job={job} size="sm" />
              </div>
              <InfoRow icon={Briefcase} label="Service Type"  value={<span className="capitalize">{job.serviceType}</span>} />
              <InfoRow icon={Calendar}  label="Date"          value={format(parseISO(job.jobDate), "EEEE, MMMM d, yyyy")} />
              {(job.startTime || job.endTime) && (
                <InfoRow icon={Clock} label="Time" value={`${job.startTime || "—"}${job.endTime ? ` – ${job.endTime}` : ""}`} />
              )}
            </section>

            <Divider />

            {/* ── Contact ──────────────────────────────────────────────── */}
            <section className="space-y-3">
              <SectionTitle>Client</SectionTitle>
              <InfoRow icon={User}   label="Name"  value={job.clientName} />
              {job.clientEmail && <InfoRow icon={Mail}  label="Email" value={job.clientEmail} />}
              {job.clientPhone && <InfoRow icon={Phone} label="Phone" value={job.clientPhone} />}
              {(job.propertyStreet || job.propertyCity) && (
                <InfoRow
                  icon={MapPin}
                  label="Service Address"
                  value={[job.propertyStreet, job.propertyApt, job.propertyCity, job.propertyState, job.propertyZip].filter(Boolean).join(", ")}
                />
              )}
            </section>

            {/* ── Linked estimate ───────────────────────────────────────── */}
            {(job as any).estimate_id && (
              <>
                <Divider />
                <section className="space-y-2">
                  <SectionTitle>From Estimate</SectionTitle>
                  <button
                    type="button"
                    onClick={() => { onClose(); navigate("/estimates", { state: { openId: (job as any).estimate_id } }); }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="p-2 rounded bg-blue-500/10 flex-shrink-0">
                      <FileText className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Estimate</p>
                      <p className="text-xs text-muted-foreground capitalize">{job.serviceType}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                </section>
              </>
            )}

            <Divider />

            {/* ── Services & Pricing ────────────────────────────────────── */}
            <section className="space-y-3">
              <SectionTitle>Services & Pricing</SectionTitle>
              {job.services.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {s.quantity} × ${s.unitPrice.toFixed(2)}</p>
                  </div>
                  <p className="font-medium">${s.total.toFixed(2)}</p>
                </div>
              ))}
              <div className="border-t pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${job.subtotal.toFixed(2)}</span>
                </div>
                {job.applyDiscount && job.discountAmount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Discount</span><span>-${job.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {job.applyTax && job.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({job.taxRate}%)</span>
                    <span>${job.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-1.5">
                  <span>Total</span><span>${job.total.toFixed(2)}</span>
                </div>
                {job.applyDeposit && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deposit</span>
                      <span className="font-medium">${job.depositAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Balance Due</span>
                      <span className="font-medium">${job.balanceDue.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ── Notes ────────────────────────────────────────────────── */}
            {(job.jobDetails || job.notes) && (
              <>
                <Divider />
                <section className="space-y-3">
                  <SectionTitle>Notes</SectionTitle>
                  {job.jobDetails && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Job Details</p>
                      <p className="text-sm">{job.jobDetails}</p>
                    </div>
                  )}
                  {job.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Internal Notes</p>
                      <p className="text-sm">{job.notes}</p>
                    </div>
                  )}
                </section>
              </>
            )}

            {/* ── Timeline ─────────────────────────────────────────────── */}
            <Divider />
            <section className="space-y-2">
              <SectionTitle>Timeline</SectionTitle>
              <p className="text-xs text-muted-foreground">
                Created {format(new Date(job.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
              {job.updatedAt !== job.createdAt && (
                <p className="text-xs text-muted-foreground">
                  Updated {format(new Date(job.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
            </section>

          </div>
        )}
      </SidePanel>

      {/* Dialogs */}
      {job && <JobCompleteDialog job={job} open={showComplete} onOpenChange={setShowComplete} />}

      <ConfirmDialog
        open={showPublish}
        onOpenChange={setShowPublish}
        title="Publish & Schedule"
        description="The job will be marked as Upcoming and added to the active schedule."
        onConfirm={() => updateStatus({ id: job!.id, status: "Upcoming" }, { onSuccess: () => { setShowPublish(false); onUpdated(); } })}
        confirmLabel="Publish & Schedule"
        isLoading={updating}
      />

      <ConfirmDialog
        open={showCancel}
        onOpenChange={setShowCancel}
        title="Cancel Job"
        description="This job will be marked as cancelled."
        onConfirm={() => updateStatus({ id: job!.id, status: "Cancelled" }, { onSuccess: () => { setShowCancel(false); onUpdated(); } })}
        confirmLabel="Cancel Job"
        variant="destructive"
        isLoading={updating}
      />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Job"
        description="This job will be permanently deleted."
        onConfirm={() => deleteJob(job!.id, { onSuccess: () => { setShowDelete(false); onClose(); onUpdated(); } })}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleting}
      />

      <AddJobPage
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        jobId={job?.id}
      />

      {/* ── Reschedule dialog ──────────────────────────────────────────── */}
      <Dialog open={showReschedule} onOpenChange={setShowReschedule}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl font-bold">Reschedule Job</DialogTitle>
            <DialogDescription>
              Select a new date and time for Job #{job?.jobNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <CalendarPicker
              mode="single"
              selected={rescheduleDate}
              onSelect={setRescheduleDate}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="pointer-events-auto"
            />
          </div>
          <div className="px-6 pb-4 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start Time</Label>
              <Input type="time" value={rescheduleStart} onChange={(e) => setRescheduleStart(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">End Time</Label>
              <Input type="time" value={rescheduleEnd} onChange={(e) => setRescheduleEnd(e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="px-6 pb-6 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowReschedule(false)}>Cancel</Button>
            <Button className="flex-1" disabled={!rescheduleDate || isRescheduling} onClick={handleReschedule}>
              {isRescheduling ? "Saving…" : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
