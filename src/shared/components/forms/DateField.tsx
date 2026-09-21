import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { formatDisplayDate } from "@/shared/utils/formatters";
import { withRequiredMark } from "@/shared/utils/formLabel";
import { cn } from "@/shared/utils/cn";
import { FORM_CONTROL_ERROR, FORM_CONTROL_HEIGHT } from "@/shared/constants/formTokens";

export interface DateFieldProps {
  /** Texto guía cuando no hay fecha. El asterisco lo añade `required`. */
  placeholder: string;
  value:       Date | undefined;
  onChange:    (date: Date | undefined) => void;
  /** Restringe el calendario (ej. no permitir fechas pasadas). */
  disabledDates?: (date: Date) => boolean;
  required?:   boolean;
  error?:      boolean | string;
  disabled?:   boolean;
  className?:  string;
}

/**
 * Selector de fecha: botón-campo + calendario en popover, que se cierra al elegir.
 *
 * Se ve y reacciona como un `SelectField` (mismo alto, mismo hover/foco de borde)
 * aunque por dentro sea un botón — el usuario no debería notar la diferencia.
 */
export function DateField({
  placeholder,
  value,
  onChange,
  disabledDates,
  required = false,
  error,
  disabled = false,
  className,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const errorMessage = typeof error === "string" ? error : undefined;

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="field"
            disabled={disabled}
            className={cn(
              FORM_CONTROL_HEIGHT,
              "w-full justify-start text-left",
              !value && "text-muted-foreground",
              error && FORM_CONTROL_ERROR,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {value ? formatDisplayDate(value) : withRequiredMark(placeholder, required)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => { onChange(date); if (date) setOpen(false); }}
            disabled={disabledDates}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      {errorMessage && <p className="text-xs text-destructive mt-1">{errorMessage}</p>}
    </div>
  );
}
