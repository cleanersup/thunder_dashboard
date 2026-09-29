/**
 * @module RecurrenceFields
 * Cada cuánto vuelve la cuadrilla.
 *
 * Los campos van apareciendo según lo que haga falta: mientras el job sea de una
 * sola vez no hay nada que configurar, y "Repeat on" solo tiene sentido en una
 * repetición semanal. Así el caso normal —un job suelto— se queda en una línea.
 *
 * Los textos y las opciones son los de `JobTypeFlowContent` en swift-slate: las
 * dos aplicaciones escriben las mismas columnas y deben ofrecer lo mismo.
 */
import { Label } from "@/shared/components/ui/label";
import { OptionGrid, SelectField, DateField } from "@/shared/components/forms";
import { cn } from "@/shared/utils/cn";
import { withRequiredMark } from "@/shared/utils/formLabel";
import type { RecurrenceFrequency } from "../types/job.types";
import { RECURRENCE_OPTIONS, WEEK_DAYS, repeatEveryOptions } from "../config/jobRecurrence";

const FREQUENCY_OPTIONS = [
  { value: "one_time",  label: "One-Time" },
  { value: "recurring", label: "Recurring" },
];

interface RecurrenceFieldsProps {
  isRecurring: boolean;
  onIsRecurring: (v: boolean) => void;
  frequency: RecurrenceFrequency | "";
  onFrequency: (v: RecurrenceFrequency) => void;
  /** "Repeat every N" — se guarda como texto porque viene de un select. */
  repeatEvery: string;
  onRepeatEvery: (v: string) => void;
  /** Días elegidos, 0=Domingo … 6=Sábado. Solo se usan en la frecuencia semanal. */
  weekDays: number[];
  onToggleWeekDay: (day: number) => void;
  endRepeatOn: Date | undefined;
  onEndRepeatOn: (d: Date | undefined) => void;
  /** Fecha del job: la repetición no puede acabar antes de la primera visita. */
  jobDate?: Date;
  errors?: {
    frequency?: boolean | string;
    weekDays?:  boolean | string;
    endRepeatOn?: boolean | string;
  };
  disabled?: boolean;
}

export function RecurrenceFields({
  isRecurring, onIsRecurring,
  frequency, onFrequency,
  repeatEvery, onRepeatEvery,
  weekDays, onToggleWeekDay,
  endRepeatOn, onEndRepeatOn,
  jobDate,
  errors = {},
  disabled = false,
}: RecurrenceFieldsProps) {
  // Sin frecuencia elegida no se puede decir "cada cuántas" ni "hasta cuándo".
  const showDetails = isRecurring && !!frequency;

  // Fragmento y no un `div`: así los campos son hijos directos del `FormSection`
  // y heredan su separación en lugar de inventarse una propia.
  return (
    <>
      <OptionGrid
        label="Frequency"
        options={FREQUENCY_OPTIONS}
        value={isRecurring ? "recurring" : "one_time"}
        onChange={(v) => onIsRecurring(v === "recurring")}
        disabled={disabled}
      />

      {isRecurring && (
        <SelectField
          placeholder="Recurring frequency"
          value={frequency}
          onChange={(v) => onFrequency(v as RecurrenceFrequency)}
          options={RECURRENCE_OPTIONS}
          error={errors.frequency}
          disabled={disabled}
          required
        />
      )}

      {showDetails && (
        <>
          <SelectField
            placeholder="Repeat every"
            value={repeatEvery}
            onChange={onRepeatEvery}
            options={repeatEveryOptions(frequency)}
            disabled={disabled}
          />

          {frequency === "weekly" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {withRequiredMark("Repeat on", true)}
              </Label>
              <div className="flex gap-2">
                {WEEK_DAYS.map((d) => {
                  const active = weekDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggleWeekDay(d.value)}
                      aria-pressed={active}
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : errors.weekDays
                            ? "border-destructive text-foreground"
                            : "border-input text-foreground enabled:hover:border-primary/60",
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              {typeof errors.weekDays === "string" && (
                <p className="text-xs text-destructive">{errors.weekDays}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Pick more than one day to visit several times a week.
              </p>
            </div>
          )}

          <DateField
            placeholder="End repeat on"
            value={endRepeatOn}
            onChange={onEndRepeatOn}
            // Acabar antes de empezar no significa nada, y el backend no lo
            // rechaza: simplemente no genera ninguna ocurrencia.
            disabledDates={jobDate ? (d) => d < jobDate : undefined}
            error={errors.endRepeatOn}
            disabled={disabled}
          />
          {!errors.endRepeatOn && (
            <p className="-mt-1 text-xs text-muted-foreground">
              Ends a year out unless you change it. Extend it whenever you need.
            </p>
          )}
        </>
      )}
    </>
  );
}
