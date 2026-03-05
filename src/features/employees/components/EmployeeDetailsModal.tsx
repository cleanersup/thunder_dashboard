import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  User,
  Phone,
  Mail,
  MessageSquare,
  Briefcase,
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  Clock,
  UserCheck,
  UserX,
  FileDown,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { toast } from "sonner";
import { useProfile } from "@/shared/hooks/useProfile";
import { useUpdateEmployeeStatus, useDeleteEmployee } from "../hooks/useEmployees";
import { generateEmployeeSheetPDF } from "../services/generateEmployeeSheetPDF";
import { EmployeeForm } from "./EmployeeForm";
import type { Employee } from "../services/employeesService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhone(phone: string) {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function statusBadgeClass(status: string) {
  if (status === "active")   return "bg-green-500/20 text-green-700 dark:text-green-400";
  if (status === "inactive") return "bg-red-500/20 text-red-700 dark:text-red-400";
  return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
}

type DayShifts = { AM: boolean; PM: boolean; NIGHT: boolean };
type AvailabilityMap = Record<string, DayShifts>;

// Days stored with lowercase keys by our form — but legacy swift-slate data uses Title Case.
// We resolve both formats.
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
  // Try lowercase key first, then Title Case fallback
  const data = avail[key] ?? avail[key.charAt(0).toUpperCase() + key.slice(1)];
  if (!data) return [];
  const shifts: string[] = [];
  if (data.AM)    shifts.push("AM");
  if (data.PM)    shifts.push("PM");
  if (data.NIGHT) shifts.push("Night");
  return shifts;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmployeeDetailsModalProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeUpdated?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmployeeDetailsModal({
  employee,
  open,
  onOpenChange,
  onEmployeeUpdated,
}: EmployeeDetailsModalProps) {
  const { data: profile } = useProfile();
  const { mutate: updateStatus } = useUpdateEmployeeStatus();
  const { mutate: deleteEmployee, isPending: isDeleting } = useDeleteEmployee();

  const [editOpen, setEditOpen]     = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!employee) return null;

  const avail = (employee.available_days ?? {}) as AvailabilityMap;

  // ── Actions ──────────────────────────────────────────────────────────────

  function handleActivate() {
    updateStatus(
      { id: employee!.id, status: "active" },
      {
        onSuccess: () => {
          toast.success("Employee activated successfully");
          onEmployeeUpdated?.();
        },
      },
    );
  }

  function handleSuspend() {
    updateStatus(
      { id: employee!.id, status: "inactive" },
      {
        onSuccess: () => {
          toast.success("Employee suspended successfully");
          onEmployeeUpdated?.();
        },
      },
    );
  }

  function handleDownloadPDF() {
    if (!profile) {
      toast.error("Missing company information");
      return;
    }
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
          ? format(parseISO(employee!.birthday), "MM/dd/yyyy")
          : undefined,
        gender:    employee!.gender   ?? "",
        position:  employee!.position ?? "",
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
      onSuccess: () => {
        setDeleteOpen(false);
        onOpenChange(false);
        onEmployeeUpdated?.();
      },
    });
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl lg:max-w-[700px] p-0 gap-0 max-h-[90vh] overflow-hidden">
          {/* Header */}
          <DialogHeader className="flex-row items-center gap-3 px-6 py-3 border-b border-border/50 bg-[#202B3D]">
            <DialogTitle className="text-lg font-bold text-white">
              {employee.first_name} {employee.last_name}
            </DialogTitle>
            <Badge variant="secondary" className={`${statusBadgeClass(employee.status)} capitalize`}>
              {employee.status}
            </Badge>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-60px)]">
            <div className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* ── Left Column ───────────────────────────────────────── */}
                <div className="space-y-4">

                  {/* Personal Information */}
                  <Card className="border border-border/50">
                    <CardContent className="p-5 space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">Personal Information</h4>

                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Full Name</p>
                          <p className="text-sm font-medium text-foreground">
                            {employee.first_name} {employee.last_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Briefcase className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Position</p>
                          <p className="text-sm font-medium text-foreground capitalize">
                            {employee.position || "Not Specified"}
                          </p>
                        </div>
                      </div>

                      {/* Phone with quick actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Phone Number</p>
                            <p className="text-sm font-medium text-foreground">
                              {employee.phone ? formatPhone(employee.phone) : "Not specified"}
                            </p>
                          </div>
                        </div>
                        {employee.phone && (
                          <div className="flex gap-1">
                            <a
                              href={`sms:${employee.phone}`}
                              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-primary" />
                            </a>
                            <a
                              href={`tel:${employee.phone}`}
                              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5 text-primary" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Email with quick action */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Email Address</p>
                            <p className="text-sm font-medium text-foreground">
                              {employee.email || "Not specified"}
                            </p>
                          </div>
                        </div>
                        {employee.email && (
                          <a
                            href={`mailto:${employee.email}`}
                            className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5 text-primary" />
                          </a>
                        )}
                      </div>

                      {employee.birthday && (
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Date of Birth</p>
                            <p className="text-sm font-medium text-foreground">
                              {format(parseISO(employee.birthday), "MMMM dd, yyyy")}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Employment Details */}
                  <Card className="border border-border/50">
                    <CardContent className="p-5 space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">Employment Details</h4>

                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Gender</p>
                          <p className="text-sm font-medium text-foreground capitalize">
                            {employee.gender || "Not specified"}
                          </p>
                        </div>
                      </div>

                      {employee.hourly_rate && (
                        <div className="flex items-center gap-3">
                          <DollarSign className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Hourly Rate</p>
                            <p className="text-sm font-medium text-foreground">
                              ${employee.hourly_rate}/hr
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* ── Right Column ──────────────────────────────────────── */}
                <div className="space-y-4">

                  {/* Availability — always shown */}
                  <Card className="border border-border/50">
                    <CardContent className="p-5">
                      <h4 className="text-sm font-semibold text-foreground mb-4">Availability</h4>
                      <div className="space-y-1">
                        {DAYS_ORDER.map(({ key, label }) => {
                          const shifts = getShifts(avail, key);
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0"
                            >
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">{label}</span>
                              </div>
                              <div className="flex gap-1">
                                {shifts.length > 0 ? (
                                  shifts.map((shift) => (
                                    <Badge
                                      key={shift}
                                      variant="secondary"
                                      className="bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] px-1.5 py-0"
                                    >
                                      {shift}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="bg-red-500/10 text-red-700 dark:text-red-400 text-[10px] px-1.5 py-0"
                                  >
                                    Not Available
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Timeline */}
                  <Card className="border border-border/50">
                    <CardContent className="p-5 space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">Timeline</h4>

                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="text-sm font-medium text-foreground">
                            {format(parseISO(employee.created_at), "MMM dd, yyyy")}
                          </p>
                        </div>
                      </div>

                      {employee.updated_at && (
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Last Updated</p>
                            <p className="text-sm font-medium text-foreground">
                              {format(parseISO(employee.updated_at), "MMM dd, yyyy")}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="border border-border/50">
                    <CardContent className="p-5">
                      <h4 className="text-sm font-semibold text-foreground mb-4">Quick Actions</h4>
                      <div className="space-y-2">

                        <Button
                          variant="outline"
                          className="w-full justify-start rounded-lg h-12 border-border hover:bg-secondary/50"
                          onClick={() => setEditOpen(true)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-primary/10">
                              <Edit className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="font-semibold text-foreground text-sm">Edit Employee</span>
                              <span className="text-xs text-muted-foreground">Modify employee details</span>
                            </div>
                          </div>
                        </Button>

                        {(employee.status === "inactive" || employee.status === "under review") && (
                          <Button
                            variant="outline"
                            className="w-full justify-start rounded-lg h-12 border-border hover:bg-secondary/50"
                            onClick={handleActivate}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-md bg-green-500/10">
                                <UserCheck className="w-4 h-4 text-green-600" />
                              </div>
                              <div className="flex flex-col items-start">
                                <span className="font-semibold text-foreground text-sm">Activate</span>
                                <span className="text-xs text-muted-foreground">Set employee as active</span>
                              </div>
                            </div>
                          </Button>
                        )}

                        {employee.status === "active" && (
                          <Button
                            variant="outline"
                            className="w-full justify-start rounded-lg h-12 border-border hover:bg-secondary/50"
                            onClick={handleSuspend}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-md bg-orange-500/10">
                                <UserX className="w-4 h-4 text-orange-500" />
                              </div>
                              <div className="flex flex-col items-start">
                                <span className="font-semibold text-foreground text-sm">Suspend</span>
                                <span className="text-xs text-muted-foreground">Set employee as inactive</span>
                              </div>
                            </div>
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          className="w-full justify-start rounded-lg h-12 border-border hover:bg-secondary/50"
                          onClick={handleDownloadPDF}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-blue-500/10">
                              <FileDown className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="font-semibold text-foreground text-sm">Download PDF</span>
                              <span className="text-xs text-muted-foreground">Export employee information</span>
                            </div>
                          </div>
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full justify-start rounded-lg h-12 border-border hover:bg-secondary/50"
                          onClick={() => setDeleteOpen(true)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-red-500/10">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="font-semibold text-red-500 text-sm">Delete</span>
                              <span className="text-xs text-muted-foreground">Remove employee permanently</span>
                            </div>
                          </div>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Employee form */}
      <EmployeeForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        employeeId={employee.id}
        onUpdated={() => {
          setEditOpen(false);
          onEmployeeUpdated?.();
        }}
      />

      {/* Delete confirmation */}
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
