import { useState } from "react";
import { formatDisplayDate, formatDisplayDateShort } from "@/shared/utils/formatters";
import {
  User, Phone, Mail, MessageSquare, Briefcase, Calendar,
  DollarSign, Edit, Trash2, Clock, UserCheck, UserX,
  FileDown, Download, FileText, MapPin,
} from "lucide-react";
import { Badge }   from "@/shared/components/ui/badge";
import { Button }  from "@/shared/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { SidePanel }     from "@/shared/components/common/SidePanel";
import { toast }         from "sonner";
import { useProfile }    from "@/shared/hooks/useProfile";
import { useUpdateEmployeeStatus, useDeleteEmployee } from "../hooks/useEmployees";
import { generateEmployeeSheetPDF } from "../services/generateEmployeeSheetPDF";
import { downloadEmployeeDocument } from "../services/employeesService";
import { EmployeeForm } from "./EmployeeForm";
import { formatPhoneDisplay, isPhoneValid } from "@/shared/utils/phoneInput";
import type { Employee } from "../services/employeesService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAddress(emp: Employee): string | null {
  const parts: string[] = [];
  if (emp.street) parts.push(emp.street);
  if (emp.apt_suite) parts.push(emp.apt_suite);
  if (emp.city || emp.state || emp.zip) {
    const cityStateZip = [emp.city, emp.state, emp.zip].filter(Boolean).join(", ");
    if (cityStateZip) parts.push(cityStateZip);
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

type DayShifts = { AM: boolean; PM: boolean; NIGHT: boolean };
type AvailabilityMap = Record<string, DayShifts>;

const DAYS_ORDER = [
  { key: "monday",    label: "Monday" },
  { key: "tuesday",   label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday",  label: "Thursday" },
  { key: "friday",    label: "Friday" },
  { key: "saturday",  label: "Saturday" },
  { key: "sunday",    label: "Sunday" },
];

function getShifts(avail: AvailabilityMap, key: string): string[] {
  const data = avail[key] ?? avail[key.charAt(0).toUpperCase() + key.slice(1)];
  if (!data) return [];
  const shifts: string[] = [];
  if (data.AM)    shifts.push("AM");
  if (data.PM)    shifts.push("PM");
  if (data.NIGHT) shifts.push("Night");
  return shifts;
}

function statusBadge(status: string): { color: string; bg: string } {
  if (status === "active")   return { color: "hsl(142 71% 35%)", bg: "hsl(142 71% 45% / 0.15)" };
  if (status === "inactive") return { color: "hsl(0 72% 51%)",   bg: "hsl(0 72% 51% / 0.15)" };
  return { color: "hsl(45 93% 47%)", bg: "hsl(45 93% 47% / 0.15)" };
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

interface EmployeeDetailsPanelProps {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
  onEmployeeUpdated?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmployeeDetailsPanel({
  employee,
  open,
  onClose,
  onEmployeeUpdated,
}: EmployeeDetailsPanelProps) {
  const { data: profile } = useProfile();
  const { mutate: updateStatus } = useUpdateEmployeeStatus();
  const { mutate: deleteEmployee, isPending: isDeleting } = useDeleteEmployee();

  const [editOpen, setEditOpen]     = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!employee) return null;

  const avail = (employee.available_days ?? {}) as AvailabilityMap;
  const badge = statusBadge(employee.status);

  // ── Actions ──────────────────────────────────────────────────────────────

  function handleActivate() {
    updateStatus(
      { id: employee!.id, status: "active" },
      { onSuccess: () => { toast.success("Employee activated successfully"); onEmployeeUpdated?.(); } },
    );
  }

  function handleSuspend() {
    updateStatus(
      { id: employee!.id, status: "inactive" },
      { onSuccess: () => { toast.success("Employee suspended successfully"); onEmployeeUpdated?.(); } },
    );
  }

  function handleDownloadPDF() {
    if (!profile) { toast.error("Missing company information"); return; }
    try {
      generateEmployeeSheetPDF({
        companyLogo:    profile.company_logo    ?? undefined,
        companyName:    profile.company_name    ?? "Company",
        companyPhone:   profile.company_phone   ?? "",
        companyEmail:   profile.company_email   ?? "",
        companyAddress: profile.company_address ?? "",
        companyCity:    profile.company_city    ?? "",
        companyState:   profile.company_state   ?? "",
        companyZip:     profile.company_zip     ?? "",
        firstName:   employee!.first_name,
        lastName:    employee!.last_name,
        email:       employee!.email    ?? undefined,
        phone:       employee!.phone    ?? undefined,
        birthday:    employee!.birthday
          ? formatDisplayDateShort(employee!.birthday)
          : undefined,
        gender:    employee!.gender    ?? "",
        position:  employee!.position  ?? "",
        hourlyRate: employee!.hourly_rate ?? undefined,
        status:    employee!.status,
        street:    employee!.street    ?? undefined,
        aptSuite:  employee!.apt_suite ?? undefined,
        city:      employee!.city      ?? undefined,
        state:     employee!.state     ?? undefined,
        zip:       employee!.zip       ?? undefined,
        availability:    avail,
        additionalNotes: employee!.additional_notes ?? undefined,
      });
      toast.success("Employee sheet downloaded successfully");
    } catch {
      toast.error("Failed to generate PDF");
    }
  }

  function handleDelete() {
    deleteEmployee(employee!.id, {
      onSuccess: () => { setDeleteOpen(false); onClose(); onEmployeeUpdated?.(); },
    });
  }

  // ── Footer ────────────────────────────────────────────────────────────────

  const footer = (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="flex-1">
        <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
      </Button>
      {(employee.status === "inactive" || employee.status === "under review") && (
        <Button size="sm" variant="outline" onClick={handleActivate} className="flex-1 text-green-600 border-green-500/30 hover:bg-green-500/10">
          <UserCheck className="h-3.5 w-3.5 mr-1.5" /> Activate
        </Button>
      )}
      {employee.status === "active" && (
        <Button size="sm" variant="outline" onClick={handleSuspend} className="flex-1 text-orange-500 border-orange-500/30 hover:bg-orange-500/10">
          <UserX className="h-3.5 w-3.5 mr-1.5" /> Suspend
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={handleDownloadPDF} className="px-2.5">
        <FileDown className="h-3.5 w-3.5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="px-2.5">···</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const address = formatAddress(employee);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        title={`${employee.first_name} ${employee.last_name}`}
        badge={{ label: employee.status, color: badge.color, bg: badge.bg }}
        footer={footer}
      >
        <div className="p-4 space-y-6">

          {/* Personal Information */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personal Information</h3>

            <InfoRow icon={User}      label="Full Name" value={`${employee.first_name} ${employee.last_name}`} />
            <InfoRow icon={Briefcase} label="Position"  value={<span className="capitalize">{employee.position || "Not Specified"}</span>} />

            {/* Phone with shortcuts */}
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Phone Number</p>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-medium truncate${employee.phone && !isPhoneValid(employee.phone) ? " text-destructive" : ""}`}>
                    {employee.phone ? formatPhoneDisplay(employee.phone) : "Not specified"}
                  </p>
                  {employee.phone && (
                    <div className="flex gap-1.5 shrink-0">
                      <a href={`sms:${employee.phone}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors" aria-label="Send SMS">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      </a>
                      <a href={`tel:${employee.phone}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors" aria-label="Call">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Email with shortcut */}
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Email Address</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{employee.email || "Not specified"}</p>
                  {employee.email && (
                    <a href={`mailto:${employee.email}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors shrink-0" aria-label="Send email">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {address && <InfoRow icon={MapPin} label="Address" value={address} />}

            {employee.birthday && (
              <InfoRow icon={Calendar} label="Date of Birth" value={formatDisplayDate(employee.birthday)} />
            )}
          </section>

          <hr className="border-border" />

          {/* Employment Details */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Employment Details</h3>
            <InfoRow icon={User} label="Gender" value={<span className="capitalize">{employee.gender || "Not specified"}</span>} />
            {employee.hourly_rate && (
              <InfoRow icon={DollarSign} label="Hourly Rate" value={`$${employee.hourly_rate}/hr`} />
            )}
          </section>

          <hr className="border-border" />

          {/* Availability */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Availability</h3>
            <div className="space-y-1">
              {DAYS_ORDER.map(({ key, label }) => {
                const shifts = getShifts(avail, key);
                return (
                  <div key={key} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{label}</span>
                    </div>
                    <div className="flex gap-1">
                      {shifts.length > 0 ? (
                        shifts.map((shift) => (
                          <Badge key={shift} variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] px-1.5 py-0">
                            {shift}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400 text-[10px] px-1.5 py-0">
                          Off
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Documents */}
          {(employee.documents?.length ?? 0) > 0 && (
            <>
              <hr className="border-border" />
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Documents</h3>
                <div className="space-y-2">
                  {(employee.documents ?? []).map((doc, idx) => {
                    const docName = doc.split("/").pop() ?? "document";
                    const empName = `${employee.first_name}_${employee.last_name}`.replace(/\s+/g, "_");
                    return (
                      <div key={idx} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 bg-secondary/20">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <p className="text-sm font-medium text-foreground truncate">{docName}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-8 w-8"
                          onClick={() => downloadEmployeeDocument(doc, `${empName}_${docName}`).catch(() => toast.error("Failed to download document"))}
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          <hr className="border-border" />

          {/* Timeline */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Timeline</h3>
            <InfoRow icon={Calendar} label="Created" value={formatDisplayDate(employee.created_at)} />
            {employee.updated_at && (
              <InfoRow icon={Clock} label="Last Updated" value={formatDisplayDate(employee.updated_at)} />
            )}
          </section>

        </div>
      </SidePanel>

      <EmployeeForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        employeeId={employee.id}
        onUpdated={() => { setEditOpen(false); onEmployeeUpdated?.(); }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Employee"
        description="Are you sure you want to delete this employee? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
