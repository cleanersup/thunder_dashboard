import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Download, Clock, DollarSign } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { toast } from "sonner";
import {
  generateGeneralTimesheetPDF,
  type GeneralTimesheetData,
} from "../services/generateTimesheetPDF";
import type { TimeEntry } from "../types/timeClock.types";

interface Props {
  entries: TimeEntry[];
  isLoading: boolean;
  dateFrom: Date;
  dateTo: Date;
  onDateFromChange: (d: Date) => void;
  onDateToChange: (d: Date) => void;
  onSelectEmployee: (entry: TimeEntry) => void;
}

function fmtHours(h: number) {
  return `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`;
}

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function TimesheetsTab({
  entries,
  isLoading,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onSelectEmployee,
}: Props) {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen,   setToOpen]   = useState(false);

  const totalHours = entries.reduce((s, e) => s + (e.total_hours ?? 0), 0);
  const totalPay   = entries.reduce((s, e) => s + (e.total_hours ?? 0) * (e.employees?.hourly_rate ?? 0), 0);

  // Aggregate by employee
  const empMap = entries.reduce<Record<string, { entry: TimeEntry; hours: number; pay: number }>>(
    (acc, e) => {
      const rate = e.employees?.hourly_rate ?? 0;
      if (!acc[e.employee_id]) {
        acc[e.employee_id] = { entry: e, hours: 0, pay: 0 };
      }
      acc[e.employee_id].hours += e.total_hours ?? 0;
      acc[e.employee_id].pay   += (e.total_hours ?? 0) * rate;
      return acc;
    },
    {},
  );

  function handleDownloadGeneral() {
    if (!entries.length) { toast.error("No entries to download"); return; }
    const employees = Object.values(empMap).map(({ entry, hours, pay }) => ({
      name:       `${entry.employees?.first_name ?? ""} ${entry.employees?.last_name ?? ""}`.trim(),
      totalHours: hours,
      totalPay:   pay,
    }));
    const data: GeneralTimesheetData = {
      dateRange:        `${format(dateFrom, "MMMM d, yyyy")} - ${format(dateTo, "MMMM d, yyyy")}`,
      employees,
      grandTotalHours:  totalHours,
      grandTotalPay:    totalPay,
    };
    generateGeneralTimesheetPDF(data);
    toast.success("PDF downloaded successfully", { duration: 2000 });
  }

  return (
    <div className="space-y-3 p-4">
      {/* Date range + actions */}
      <div className="flex items-center gap-2">
        <Popover open={fromOpen} onOpenChange={setFromOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 h-9">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateFrom, "MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={(d) => { if (d) { onDateFromChange(d); setFromOpen(false); } }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <span className="text-xs text-muted-foreground">to</span>

        <Popover open={toOpen} onOpenChange={setToOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 h-9">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateTo, "MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={(d) => { if (d) { onDateToChange(d); setToOpen(false); } }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="sm" className="h-9 gap-2 shrink-0" onClick={handleDownloadGeneral}>
          <Download className="w-4 h-4" />
          PDF
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border-l-4 pl-4 py-1" style={{ borderLeftColor: "hsl(var(--orange-vibrant))" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-muted-foreground">Total Hours</p>
            <div className="p-1.5 rounded bg-orange-500/20">
              <Clock className="w-3.5 h-3.5" style={{ color: "hsl(var(--orange-vibrant))" }} />
            </div>
          </div>
          <p className="text-lg font-bold text-foreground">{fmtHours(totalHours)}</p>
        </div>
        <div className="border-l-4 pl-4 py-1" style={{ borderLeftColor: "hsl(var(--green-vibrant))" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-muted-foreground">Total Pay</p>
            <div className="p-1.5 rounded bg-green-500/20">
              <DollarSign className="w-3.5 h-3.5" style={{ color: "hsl(var(--green-vibrant))" }} />
            </div>
          </div>
          <p className="text-lg font-bold text-foreground">${totalPay.toFixed(2)}</p>
        </div>
      </div>

      {/* Employee list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : Object.keys(empMap).length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          No entries for this date range
        </p>
      ) : (
        Object.entries(empMap).map(([empId, { entry, hours, pay }]) => {
          const emp = entry.employees;
          return (
            <Card
              key={empId}
              className="border border-border/50 shadow-none cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => onSelectEmployee(entry)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 shrink-0">
                    {emp?.avatar_url && <AvatarImage src={emp.avatar_url} alt={emp.first_name} />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(emp?.first_name ?? "", emp?.last_name ?? "")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {emp?.first_name} {emp?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{emp?.position}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{fmtHours(hours)}</p>
                    <p className="text-xs text-muted-foreground">${pay.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
