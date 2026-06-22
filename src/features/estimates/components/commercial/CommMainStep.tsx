/**
 * @module CommMainStep — Step 3 (Commercial)
 * Total employees, hourly rate, cleaning duration, start/end time.
 */
import { Plus, Minus, Users, DollarSign, Timer, AlarmClock } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
import { toDecimalString } from "@/shared/utils/numericInput";

export interface CommMainStepProps {
  employeeCount:    number;
  hourlyRate:       string;
  cleaningDuration: number;
  startTime:        string;
  errors:           Record<string, boolean>;
  onEmployeeCountChange:    (v: number) => void;
  onHourlyRateChange:       (v: string) => void;
  onCleaningDurationChange: (v: number) => void;
  onStartTimeChange:        (v: string) => void;
  onClearError:             (key: string) => void;
}

function Counter({ value, onChange, min = 0, step = 1 }: {
  value: number; onChange: (v: number) => void; min?: number; step?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(Math.max(min, value - step))}
        className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(value + step)}
        className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90">
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

function calcEndTime(start: string, durationHours: number): string {
  if (!start || durationHours <= 0) return "";
  const [h, m] = start.split(":").map(Number);
  const totalMinutes = h * 60 + m + Math.round(durationHours * 60);
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

export function CommMainStep({
  employeeCount, hourlyRate, cleaningDuration, startTime, errors,
  onEmployeeCountChange, onHourlyRateChange, onCleaningDurationChange, onStartTimeChange,
  onClearError,
}: CommMainStepProps) {

  const endTime = calcEndTime(startTime, cleaningDuration);

  return (
    <div className="space-y-5">

      {/* Total employees */}
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Total Employees
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Select the number of employees needed for this cleaning</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-foreground">Employees</span>
            <Counter value={employeeCount} onChange={(v) => { onEmployeeCountChange(v); onClearError("employeeCount"); }} />
          </div>
          {errors.employeeCount && <p className="text-xs text-destructive">Please specify the number of employees</p>}
        </CardContent>
      </Card>

      {/* Hourly rate */}
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            Hourly Rate Per Employee
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Enter the hourly rate you pay per employee</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              type="text" inputMode="decimal" placeholder="0.00" value={hourlyRate}
              onChange={(e) => { onHourlyRateChange(toDecimalString(e.target.value)); onClearError("hourlyRate"); }}
              className={cn("pl-7", errors.hourlyRate && "border-destructive")}
            />
          </div>
          {errors.hourlyRate && <p className="text-xs text-destructive">Please enter the hourly rate</p>}
        </CardContent>
      </Card>

      {/* Cleaning duration */}
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Timer className="h-5 w-5 text-muted-foreground" />
            Cleaning Duration
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">How many hours will it take to clean this property?</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-foreground">
              {cleaningDuration} {cleaningDuration === 1 ? "hour" : "hours"}
            </span>
            <Counter value={cleaningDuration} onChange={(v) => { onCleaningDurationChange(v); onClearError("cleaningDuration"); }} />
          </div>
          {errors.cleaningDuration && <p className="text-xs text-destructive">Please specify the cleaning duration in hours</p>}
        </CardContent>
      </Card>

      {/* Time */}
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlarmClock className="h-5 w-5 text-muted-foreground" />
            Time
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Set the start time for the cleaning service</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Input
              type="time" value={startTime}
              onChange={(e) => { onStartTimeChange(e.target.value); onClearError("startTime"); }}
              className={errors.startTime ? "border-destructive" : ""}
            />
            {errors.startTime && <p className="text-xs text-destructive">Please select the start time</p>}
          </div>
          <div className="space-y-2">
            <Label>End Time</Label>
            <Input type="time" value={endTime} readOnly className="bg-muted/50 cursor-not-allowed" />
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
