import { useState } from "react";
import { formatDisplayDate } from "@/shared/utils/formatters";
import { CalendarIcon, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import type { TimeEntry } from "../types/timeClock.types";

interface Props {
  entries: TimeEntry[];
  selectedDate: Date;
  onDateChange: (d: Date) => void;
  onSelectEmployee: (entry: TimeEntry) => void;
  isLoading: boolean;
}

function fmtHours(h: number) {
  return `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`;
}

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function TodayTab({ entries, selectedDate, onDateChange, onSelectEmployee, isLoading }: Props) {
  const navigate = useNavigate();
  const [calOpen, setCalOpen] = useState(false);

  // Group by employee_id
  const grouped = entries.reduce<Record<string, TimeEntry[]>>((acc, e) => {
    if (!acc[e.employee_id]) acc[e.employee_id] = [];
    acc[e.employee_id].push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-3 p-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDisplayDate(selectedDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => { if (d) { onDateChange(d); setCalOpen(false); } }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2"
          onClick={() => navigate("/timeline")}
        >
          <Activity className="w-4 h-4" />
          Activity
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          No employees clocked in on {formatDisplayDate(selectedDate)}
        </p>
      ) : (
        Object.entries(grouped).map(([empId, empEntries]) => {
          const emp        = empEntries[0].employees;
          const totalHours = empEntries.reduce((s, e) => s + (e.total_hours ?? 0), 0);
          const totalPay   = totalHours * (emp?.hourly_rate ?? 0);
          const isActive   = empEntries.some((e) => e.clock_in_time && !e.clock_out_time);

          return (
            <Card
              key={empId}
              className="border border-border/50 shadow-none cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => onSelectEmployee(empEntries[0])}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      {emp?.avatar_url && <AvatarImage src={emp.avatar_url} alt={`${emp.first_name}`} />}
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials(emp?.first_name ?? "", emp?.last_name ?? "")}
                      </AvatarFallback>
                    </Avatar>
                    {/* Status dot */}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                        isActive ? "bg-green-500 animate-pulse" : "bg-purple-500"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {emp?.first_name} {emp?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{emp?.position}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {empEntries.length} shift{empEntries.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{fmtHours(totalHours)}</p>
                    <p className="text-xs text-muted-foreground">${totalPay.toFixed(2)}</p>
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

