import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/shared/utils/cn";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateTotalHours(startTime: string, endTime: string): number | null {
  if (!startTime || !endTime) return null;
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH,   endM]   = endTime.split(":").map(Number);
  const diff = (endH * 60 + endM) - (startH * 60 + startM);
  return diff > 0 ? diff / 60 : null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  scheduledDate: string;
  scheduledTime: string;
  endTime: string | null | undefined;
  errors: Partial<Record<"scheduled_date" | "scheduled_time", string>>;
  onDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentScheduleStep({
  scheduledDate,
  scheduledTime,
  endTime,
  errors,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
}: Props) {
  const [dateOpen, setDateOpen] = useState(false);

  const totalHours = calculateTotalHours(scheduledTime, endTime ?? "");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Select date</h2>
        <p className="text-sm text-muted-foreground">Choose the service date</p>
      </div>

      {/* Date picker */}
      <div className="space-y-2">
        <Label>Date *</Label>
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !scheduledDate && "text-muted-foreground",
                errors.scheduled_date && "border-destructive",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {scheduledDate
                ? format(new Date(scheduledDate + "T00:00:00"), "PPP")
                : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={scheduledDate ? new Date(scheduledDate + "T00:00:00") : undefined}
              onSelect={(d) => {
                if (d) { onDateChange(format(d, "yyyy-MM-dd")); setDateOpen(false); }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {errors.scheduled_date && (
          <p className="text-xs text-destructive">{errors.scheduled_date}</p>
        )}
      </div>

      {/* Service time */}
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Service time</h2>
          <p className="text-sm text-muted-foreground">Set start and end time</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="start-time">Start time *</Label>
            <Input
              id="start-time"
              type="time"
              value={scheduledTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              className={cn(errors.scheduled_time && "border-destructive")}
            />
            {errors.scheduled_time && (
              <p className="text-xs text-destructive">{errors.scheduled_time}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-time">End time</Label>
            <Input
              id="end-time"
              type="time"
              value={endTime ?? ""}
              onChange={(e) => onEndTimeChange(e.target.value || null)}
            />
          </div>
        </div>
      </div>

      {/* Total hours per employee — only shown when both times are set and diff is positive */}
      {totalHours !== null && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between dark:bg-blue-950/30 dark:border-blue-800">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Total Hours per Employee
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Based on service time selected
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">
              {totalHours.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">
              {totalHours === 1 ? "hour" : "hours"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
