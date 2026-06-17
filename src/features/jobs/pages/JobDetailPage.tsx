import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  ChevronLeft, Edit, MapPin, User, Calendar, Clock,
  Briefcase, CheckCircle, XCircle, Trash2, Download,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { JobStatusBadge } from "../components/JobStatusBadge";
import { JobCompleteDialog } from "../components/JobCompleteDialog";
import { useJob } from "../hooks/useJobs";
import { useDeleteJob, useUpdateJobStatus } from "../hooks/useJobMutations";
import { generateJobPDF } from "../services/generateJobPDF";
import { useProfile } from "@/shared/hooks/useProfile";
import { useAllEmployees } from "@/features/employees/hooks/useEmployees";
import { getEffectiveJobStatus } from "../types/job.types";

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export function JobDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id);
  const { mutate: deleteJob, isPending: deleting } = useDeleteJob();
  const { mutate: updateStatus } = useUpdateJobStatus();
  const { data: profile }        = useProfile();
  const { data: allEmployees = [] } = useAllEmployees();

  const [showComplete, setShowComplete]   = useState(false);
  const [showDelete, setShowDelete]       = useState(false);
  const [showCancel, setShowCancel]       = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!job) return;
    setDownloadingPDF(true);
    try {
      const assignedEmployees = allEmployees.filter((e) => job.employeeIds.includes(e.id));
      await generateJobPDF(
        job,
        assignedEmployees.map((e) => ({ first_name: e.first_name, last_name: e.last_name })),
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

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!job) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <p className="text-muted-foreground">Job not found</p>
      <Button variant="outline" onClick={() => navigate("/jobs")}>Back to Jobs</Button>
    </div>
  );

  const effectiveStatus = getEffectiveJobStatus(job);
  const propertyAddress = [job.propertyStreet, job.propertyApt, job.propertyCity, job.propertyState, job.propertyZip]
    .filter(Boolean).join(", ");

  return (
    <div className="p-2.5 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/jobs")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Job #{job.jobNumber}</h1>
              <JobStatusBadge status={job.status} job={job} />
            </div>
            <p className="text-sm text-muted-foreground">{job.clientName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {effectiveStatus !== "Completed" && effectiveStatus !== "Cancelled" && (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate(`/jobs/${job.id}/edit`)}>
                <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
              </Button>
              {effectiveStatus !== "Missed" && (
                <Button size="sm" onClick={() => setShowComplete(true)}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Complete
                </Button>
              )}
              <Button variant="outline" size="sm" className="text-warning hover:text-warning" onClick={() => setShowCancel(true)}>
                <XCircle className="h-3.5 w-3.5 mr-1.5" /> Cancel
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-2.5">
        {/* Left */}
        <div className="space-y-2.5">

          {/* Job Info */}
          <Card className="border border-border/50 shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-base">Job Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={Briefcase}  label="Service Type"  value={<span className="capitalize">{job.serviceType}</span>} />
              <InfoRow icon={Calendar}   label="Date"          value={format(parseISO(job.jobDate), "EEEE, MMMM d, yyyy")} />
              {(job.startTime || job.endTime) && (
                <InfoRow
                  icon={Clock}
                  label="Time"
                  value={`${job.startTime || "—"}${job.endTime ? ` – ${job.endTime}` : ""}`}
                />
              )}
              {job.jobDetails && (
                <InfoRow icon={Briefcase} label="Job Details" value={job.jobDetails} />
              )}
            </CardContent>
          </Card>

          {/* Client */}
          <Card className="border border-border/50 shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-base">Client</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={User}   label="Name"  value={job.clientName} />
              <InfoRow icon={User}   label="Email" value={job.clientEmail} />
              <InfoRow icon={User}   label="Phone" value={job.clientPhone} />
              {propertyAddress && (
                <InfoRow icon={MapPin} label="Service Address" value={propertyAddress} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right */}
        <div className="space-y-2.5">

          {/* Services / Pricing */}
          <Card className="border border-border/50 shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-base">Services & Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-3">
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
                    <span>Discount</span>
                    <span>-${job.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {job.applyTax && job.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({job.taxRate}%)</span>
                    <span>${job.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-1.5">
                  <span>Total</span>
                  <span>${job.total.toFixed(2)}</span>
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
            </CardContent>
          </Card>

          {/* Notes */}
          {job.notes && (
            <Card className="border border-border/50 shadow-none">
              <CardHeader className="pb-2"><CardTitle className="text-base">Internal Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{job.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <JobCompleteDialog job={job} open={showComplete} onOpenChange={setShowComplete} />

      <ConfirmDialog
        open={showCancel}
        onOpenChange={setShowCancel}
        title="Cancel Job"
        description="This job will be marked as cancelled."
        onConfirm={() => updateStatus({ id: job.id, status: "Cancelled" }, { onSuccess: () => setShowCancel(false) })}
        confirmLabel="Cancel Job"
        variant="destructive"
      />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Job"
        description="This job will be permanently deleted."
        onConfirm={() => deleteJob(job.id, { onSuccess: () => navigate("/jobs") })}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleting}
      />
    </div>
  );
}
