/**
 * @module CommMainStep — Step 3 (Commercial)
 * Total employees, hourly rate, cleaning duration, start/end time.
 */
import { Plus, Minus } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent } from "@/shared/components/ui/card";
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
    <div className="space-y-[5px]">

      {/* Total employees */}
      <Card className="rounded-none border-0">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Total Employees</h2>
            <p className="text-sm text-muted-foreground mt-1">Select the number of employees needed for this cleaning</p>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-foreground">Employees</span>
            <Counter value={employeeCount} onChange={(v) => { onEmployeeCountChange(v); onClearError("employeeCount"); }} />
          </div>
          {errors.employeeCount && <p className="text-xs text-destructive">Please specify the number of employees</p>}
        </CardContent>
      </Card>

      {/* Hourly rate */}
      <Card className="rounded-none border-0">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Hourly Rate Per Employee</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter the hourly rate you pay per employee</p>
          </div>
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
      <Card className="rounded-none border-0">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Cleaning Duration</h2>
            <p className="text-sm text-muted-foreground mt-1">How many hours will it take to clean this property?</p>
          </div>
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
      <Card className="rounded-none border-0">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Time</h2>
            <p className="text-sm text-muted-foreground mt-1">Set the start time for the cleaning service</p>
          </div>
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
