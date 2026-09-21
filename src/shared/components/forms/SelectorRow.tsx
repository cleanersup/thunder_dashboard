import { ChevronRight } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { withRequiredMark } from "@/shared/utils/formLabel";
import {
  FORM_CONTROL_ERROR, FORM_CONTROL_FOCUS, FORM_CONTROL_HOVER,
} from "@/shared/constants/formTokens";

export interface SelectorRowProps {
  /** Texto de invitación, ej. "+ Add Project Details". El asterisco lo añade `required`. */
  label:    string;
  onClick:  () => void;
  /** Marca la sección como obligatoria — misma convención que el resto de campos. */
  required?: boolean;
  error?:   boolean;
  disabled?: boolean;
}

/**
 * Fila vacía que invita a completar una sección — la contraparte de [SummaryRow]
 * cuando todavía no hay datos. Abre el modal de la sección.
 *
 * Se ve como un campo (mismo hover y foco de borde), porque en la práctica lo es:
 * el "valor" se elige en otra pantalla.
 */
export function SelectorRow({ label, onClick, required = false, error = false, disabled = false }: SelectorRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-between rounded-md border border-input bg-background px-4 py-3 text-left text-sm transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        FORM_CONTROL_HOVER,
        FORM_CONTROL_FOCUS,
        error && FORM_CONTROL_ERROR,
      )}
    >
      <span className="text-muted-foreground">{withRequiredMark(label, required)}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
