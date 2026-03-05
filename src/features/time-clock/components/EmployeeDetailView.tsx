import { useState } from "react";
import { eachDayOfInterval, format } from "date-fns";
import {
  ChevronLeft,
  Plus,
  Clock,
  DollarSign,
  CalendarIcon,
  CheckCircle,
  MessageSquare,
  Mail,
  Download,
} from "lucide-react";
import type { QueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { toast } from "sonner";
import { QK } from "@/shared/config/queryKeys";
import { useEmployeeTimeEntries, usePaidPeriods, useMarkAsPaid } from "../hooks/useTimeClock";
import { ShiftCard } from "./ShiftCard";
import { EmployeeLocationMap } from "./EmployeeLocationMap";
import {
  generateEmployeeTimesheetPDF,
  type EmployeeTimesheetData,
} from "../services/generateTimesheetPDF";
import type { TimeEntry } from "../types/timeClock.types";
import type { useShiftTimeEdit } from "../hooks/useShiftTimeEdit";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  employee: TimeEntry;
  onBack: () => void;
  detailDateFrom: Date;
  detailDateTo: Date;
  onDateFromChange: (d: Date) => void;
  onDateToChange: (d: Date) => void;
  shiftEdit: ReturnType<typeof useShiftTimeEdit>;
  queryClient: QueryClient;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function getStatusInfo(entry: TimeEntry) {
  if (entry.clock_in_time && !entry.clock_out_time)
    return { label: "Active", className: "bg-green-500/20 text-green-700 dark:text-green-400" };
  if (entry.break_start_time && !entry.break_end_time)
    return { label: "On Break", className: "bg-pink-500/20 text-pink-700 dark:text-pink-400" };
  if (entry.clock_in_time && entry.clock_out_time)
    return { label: "Completed", className: "bg-purple-500/20 text-purple-700 dark:text-purple-400" };
  return { label: "Scheduled", className: "bg-blue-500/20 text-blue-700 dark:text-blue-400" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmployeeDetailView({
  employee,
  onBack,
  detailDateFrom,
  detailDateTo,
  onDateFromChange,
  onDateToChange,
  shiftEdit,
  queryClient,
}: Props) {
  const [actionsOpen, setActionsOpen]         = useState(false);
  const [markPaidOpen, setMarkPaidOpen]       = useState(false);
  const [fromPickerOpen, setFromPickerOpen]   = useState(false);
  const [toPickerOpen, setToPickerOpen]       = useState(false);

  const fromStr = format(detailDateFrom, "yyyy-MM-dd");
  const toStr   = format(detailDateTo,   "yyyy-MM-dd");

  const { data: entries = [] }     = useEmployeeTimeEntries(employee.employee_id, fromStr, toStr);
  const { data: paidPeriods = [] } = usePaidPeriods(employee.employee_id);
  const markAsPaidMutation         = useMarkAsPaid();

  const isDatePaid = (dateStr: string) =>
    paidPeriods.some((p) => dateStr >= p.start_date && dateStr <= p.end_date);

  const totalHours = entries.reduce((s, e) => s + (e.total_hours ?? 0), 0);
  const hourlyRate = employee.employees?.hourly_rate ?? 0;
  const totalPay   = totalHours * hourlyRate;

  const status = getStatusInfo(employee);
  const empName = `${employee.employees?.first_name ?? ""} ${employee.employees?.last_name ?? ""}`.trim();

  // Build timesheet data for PDF
  function buildTimesheetData(): EmployeeTimesheetData {
    return {
      employeeName: empName,
      position:     employee.employees?.position ?? "",
      dateRange:    `${format(detailDateFrom, "MMMM d, yyyy")} - ${format(detailDateTo, "MMMM d, yyyy")}`,
      dateFrom:     detailDateFrom,
      dateTo:       detailDateTo,
      entries:      entries.map((e) => ({
        date:             e.date,
        clock_in_time:    e.clock_in_time,
        break_start_time: e.break_start_time,
        break_end_time:   e.break_end_time,
        clock_out_time:   e.clock_out_time,
        total_hours:      e.total_hours,
      })),
      totalHours,
      hourlyRate,
      totalPay,
    };
  }

  function downloadPDF() {
    if (!entries.length) { toast.error("No entries to download"); return; }
    const blob = generateEmployeeTimesheetPDF(buildTimesheetData());
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `Timesheet_${empName.replace(/\s+/g, "_")}_${fromStr}_${toStr}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("PDF downloaded successfully", { duration: 2000 });
  }

  function handleMarkPaidConfirm() {
    markAsPaidMutation.mutate(
      { empId: employee.employee_id, startDate: fromStr, endDate: toStr },
      {
        onSuccess: () => {
          setMarkPaidOpen(false);
          setActionsOpen(false);
          queryClient.invalidateQueries({ queryKey: QK.paidPeriods(employee.employee_id) });
        },
      },
    );
  }

  // Generate all dates in range
  const allDates = eachDayOfInterval({ start: detailDateFrom, end: detailDateTo });

  return (
    <div className="space-y-2.5">
      {/* Header */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="p-2 -ml-1 hover:bg-secondary rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <h2 className="text-base font-semibold text-foreground">{empName}</h2>
            <Button size="icon" className="rounded-[5px]" onClick={() => setActionsOpen(true)}>
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employee info card */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Avatar className="w-12 h-12 shrink-0">
              {employee.employees?.avatar_url && (
                <AvatarImage src={employee.employees.avatar_url} alt={empName} />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(employee.employees?.first_name ?? "", employee.employees?.last_name ?? "")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-foreground">{empName}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.className}`}>
                  {status.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{employee.employees?.position}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total hours for this period</p>
            </div>
            <p className="text-sm text-foreground">
              {Math.floor(totalHours)}h {Math.round((totalHours % 1) * 60)}m
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Pay</p>
            </div>
            <p className="text-sm font-semibold text-foreground">${totalPay.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Date range pickers */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            {/* From */}
            <Popover open={fromPickerOpen} onOpenChange={setFromPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 h-9">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(detailDateFrom, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={detailDateFrom}
                  onSelect={(d) => { if (d) { onDateFromChange(d); setFromPickerOpen(false); } }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <span className="text-xs text-muted-foreground">to</span>

            {/* To */}
            <Popover open={toPickerOpen} onOpenChange={setToPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 h-9">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(detailDateTo, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={detailDateTo}
                  onSelect={(d) => { if (d) { onDateToChange(d); setToPickerOpen(false); } }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Date entries */}
      {allDates.map((currentDate) => {
        const dateStr   = format(currentDate, "yyyy-MM-dd");
        const dayEntries = entries.filter((e) => e.date === dateStr);
        const paid       = isDatePaid(dateStr);

        return (
          <Card key={dateStr} className="border border-border/50 shadow-none">
            <CardContent className="p-4">
              {/* Date header */}
              <div
                className={`relative border rounded-lg p-3 mb-3 ${
                  paid
                    ? "border-red-300 dark:border-red-700"
                    : dayEntries.length > 0
                    ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950"
                    : "border-border bg-muted/50"
                }`}
              >
                {dayEntries.length > 0 && paid && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-500 dark:bg-green-600 flex items-center justify-center">
                    <span
                      className="bg-background px-2 text-xs font-semibold text-green-600 dark:text-green-400"
                      style={{ transform: "translateY(-50%)" }}
                    >
                      Paid
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon
                      className={`w-3.5 h-3.5 ${
                        dayEntries.length > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      }`}
                    />
                    <p
                      className={`text-xs ${
                        dayEntries.length > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      }`}
                    >
                      Date
                    </p>
                  </div>
                  <p
                    className={`text-sm ${
                      dayEntries.length > 0 ? "text-green-700 dark:text-green-300" : "text-foreground"
                    }`}
                  >
                    {format(currentDate, "EEE M/d")}
                  </p>
                </div>
              </div>

              {/* Shifts */}
              {dayEntries.length > 0 && (
                <div className="space-y-3">
                  {[...dayEntries]
                    .sort((a, b) => {
                      const ta = a.clock_in_time ? new Date(a.clock_in_time).getTime() : 0;
                      const tb = b.clock_in_time ? new Date(b.clock_in_time).getTime() : 0;
                      return ta - tb;
                    })
                    .map((shift, idx) => (
                      <div key={shift.id} className="space-y-2">
                        <ShiftCard
                          entry={shift}
                          shiftLabel={dayEntries.length > 1 ? `Shift ${idx + 1}` : undefined}
                          isEditing={shiftEdit.editingShiftId === shift.id}
                          editDraftValues={shiftEdit.editDraftValues}
                          onSetDraftValues={shiftEdit.setEditDraftValues}
                          onStartEdit={shiftEdit.startEdit}
                          onCancelEdit={shiftEdit.cancelEdit}
                          onRequestSave={shiftEdit.requestSave}
                          isPaid={paid}
                        />
                        {(shift.clock_in_latitude != null || shift.clock_out_latitude != null) && (
                          <EmployeeLocationMap entry={shift} className="w-full h-[180px]" />
                        )}
                      </div>
                    ))}

                  {/* Daily total */}
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-muted-foreground">Total Hours</p>
                    <p className="text-sm text-foreground">
                      {(() => {
                        const h = dayEntries.reduce((s, e) => s + (e.total_hours ?? 0), 0);
                        return `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`;
                      })()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Actions dialog */}
      <Dialog open={actionsOpen} onOpenChange={setActionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actions</DialogTitle>
            <DialogDescription>
              Choose an action to perform for this employee's timesheet
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 font-normal bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900"
              onClick={() => { setActionsOpen(false); setMarkPaidOpen(true); }}
            >
              <div className="p-1.5 bg-green-500/20 rounded">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              Mark shift as paid
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 font-normal"
              onClick={() => {
                if (!entries.length) { toast.error("No entries to send"); return; }
                if (!employee.employees?.phone) { toast.error("Employee phone number not found"); return; }
                toast.success(`Timesheet sent to ${employee.employees.first_name} via SMS`);
                setActionsOpen(false);
              }}
            >
              <div className="p-1.5 bg-blue-500/20 rounded">
                <MessageSquare className="w-4 h-4 text-blue-600" />
              </div>
              Send timesheet by text
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 font-normal"
              onClick={() => {
                if (!entries.length) { toast.error("No entries to send"); return; }
                if (!employee.employees?.email) { toast.error("Employee email not found"); return; }
                toast.success(`Timesheet sent to ${employee.employees.first_name} via email`);
                setActionsOpen(false);
              }}
            >
              <div className="p-1.5 bg-blue-500/20 rounded">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              Send timesheet by email
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 font-normal"
              onClick={() => { downloadPDF(); setActionsOpen(false); }}
            >
              <div className="p-1.5 bg-blue-500/20 rounded">
                <Download className="w-4 h-4 text-blue-600" />
              </div>
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid confirmation */}
      <Dialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Shift as Paid</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this shift as paid? Once marked as paid, you will no
              longer be able to edit this shift. We recommend carefully reviewing the shift before
              marking it as paid.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMarkPaidOpen(false)}
              disabled={markAsPaidMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkPaidConfirm} disabled={markAsPaidMutation.isPending}>
              {markAsPaidMutation.isPending ? "Marking..." : "Mark as Paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
