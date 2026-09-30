/**
 * @module CommMainStep — Step 3 (Commercial)
 * Total employees, hourly rate, cleaning duration, start/end time.
 */
import { Plus, Minus, Users, DollarSign, Timer, AlarmClock } from "lucide-react";
import { FormSection, FloatingInput, TimeField } from "@/shared/components/forms";

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
      <FormSection
        icon={Users}
        title="Total Employees"
        subtitle="Select the number of employees needed for this cleaning"
      >
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-foreground">Employees</span>
            <Counter value={employeeCount} onChange={(v) => { onEmployeeCountChange(v); onClearError("employeeCount"); }} />
          </div>
          {errors.employeeCount && <p className="text-xs text-destructive">Please specify the number of employees</p>}
</FormSection>

      {/* Hourly rate */}
      <FormSection
        icon={DollarSign}
        title="Hourly Rate Per Employee"
        subtitle="Enter the hourly rate you pay per employee"
      >
          <FloatingInput
            id="comm-hourly-rate"
            label="Hourly rate ($)"
            type="decimal"
            required
            value={hourlyRate}
            onChange={(v) => { onHourlyRateChange(v); onClearError("hourlyRate"); }}
            error={errors.hourlyRate && "Please enter the hourly rate"}
          />
</FormSection>

      {/* Cleaning duration */}
      <FormSection
        icon={Timer}
        title="Cleaning Duration"
        subtitle="How many hours will it take to clean this property?"
      >
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-foreground">
              {cleaningDuration} {cleaningDuration === 1 ? "hour" : "hours"}
            </span>
            <Counter value={cleaningDuration} onChange={(v) => { onCleaningDurationChange(v); onClearError("cleaningDuration"); }} />
          </div>
          {errors.cleaningDuration && <p className="text-xs text-destructive">Please specify the cleaning duration in hours</p>}
</FormSection>

      {/* Time */}
      <FormSection
        icon={AlarmClock}
        title="Time"
        subtitle="Set the start time for the cleaning service"
      >
          {/* Inicio y fin son una sola decisión y se leen juntos. El fin no se
              teclea: sale de sumar la duración a la hora de inicio. */}
          <div className="grid grid-cols-2 gap-3">
            <TimeField
              id="comm-start-time"
              label="Start Time"
              required
              value={startTime}
              onChange={(v: string) => { onStartTimeChange(v); onClearError("startTime"); }}
              error={errors.startTime && "Please select the start time"}
            />
            <TimeField
              id="comm-end-time"
              label="End Time"
              value={endTime}
              onChange={() => {}}
              disabled
            />
          </div>
</FormSection>

    </div>
  );
}
