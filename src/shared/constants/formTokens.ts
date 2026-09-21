/**
 * @module formTokens
 * Tokens de los controles de formulario (input, textarea, select, triggers).
 *
 * Una sola definición de alto, hover, foco y error para que **todo control se
 * comporte igual** sin importar quién lo renderiza. Los primitivos de `ui/` ya
 * traen hover/foco; estos tokens añaden lo que es específico de un formulario
 * (alto uniforme) y sirven para cualquier control a medida — un botón que abre
 * un picker, por ejemplo — que deba verse como un campo más.
 *
 * Jerarquía visual: reposo (`border-input`) → hover (`border-primary/60`) →
 * foco (`border-primary`). Nunca relleno: el fondo se reserva para los estados
 * seleccionados (chips de OptionGrid).
 */

/** Alto único de todo control de formulario. */
export const FORM_CONTROL_HEIGHT = "h-12";

/** Separación entre secciones (cards) de un formulario y entre los campos de una sección. */
export const FORM_SECTION_GAP = "space-y-2.5";
export const FORM_FIELD_GAP   = "space-y-3";

/** Hover unificado — solo resalta el borde, y nunca en un control deshabilitado. */
export const FORM_CONTROL_HOVER = "enabled:hover:border-primary/60";

/** Foco unificado — borde primario, sin ring. */
export const FORM_CONTROL_FOCUS =
  "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary focus:border-primary";

/** Borde de error (se aplica sobre el resto). */
export const FORM_CONTROL_ERROR = "border-destructive";

/** Base completa de un control de formulario a medida (botones tipo campo). */
export const FORM_CONTROL = [
  FORM_CONTROL_HEIGHT,
  "w-full rounded-md border border-input bg-background px-3 text-sm transition-colors",
  FORM_CONTROL_HOVER,
  FORM_CONTROL_FOCUS,
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");
