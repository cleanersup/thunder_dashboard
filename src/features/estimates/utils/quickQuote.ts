/**
 * @module quickQuote
 * Marca de "Quick Quote" sobre un estimate residencial.
 *
 * Un quick quote **ya es un estimate** desde el primer momento — misma tabla,
 * mismos status, mismo envío, mismo botón Accept en el correo. Lo único que
 * cambia es de dónde salen los datos de la persona: no se elige un cliente al
 * empezar (pedir esos datos por adelantado era justo lo que hacía abandonar el
 * formulario), solo se piden nombre y canal de contacto al enviarlo.
 *
 * `estimates` no tiene columna para esto y el backend no se toca, así que la
 * marca vive en `additional_data`, donde ya viven `propertyId`,
 * `assignedEmployees` y los campos de depósito.
 */

/** Clave en `additional_data`. Un solo sitio para que leer y escribir no se separen. */
const QUICK_QUOTE_FLAG = "isQuickQuote";

/** Campos a fusionar en `additional_data` al guardar. Vacío si no es quick quote. */
export function buildQuickQuoteAdditionalFields(isQuick: boolean): Record<string, true> {
  return isQuick ? { [QUICK_QUOTE_FLAG]: true } : {};
}

/** ¿Este estimate nació como quick quote? */
export function isQuickQuote(additionalData: unknown): boolean {
  if (!additionalData || typeof additionalData !== "object") return false;
  return (additionalData as Record<string, unknown>)[QUICK_QUOTE_FLAG] === true;
}

/**
 * Un quick quote no tiene dirección de servicio, pero `estimates` declara
 * address/city/state/zip NOT NULL. Se guardan en blanco — igual que hace
 * `createClientFromRequest` con un request anónimo — y nunca con un placeholder
 * legible tipo "Draft", que acabaría impreso en el PDF que ve el cliente.
 */
export const QUICK_QUOTE_EMPTY_ADDRESS = {
  address: "",
  apt:     null,
  city:    "",
  state:   "",
  zip:     "",
} as const;

/**
 * Un quick quote aceptado sigue sin cliente: los datos de la persona viven
 * denormalizados en la propia fila. Convertirlo en job o en contrato sí exige
 * un `client_id`, así que ahí es donde se completan los datos que faltan.
 */
export function needsClientCompletion(estimate: {
  client_id?:       string | null;
  additional_data?: unknown;
}): boolean {
  return isQuickQuote(estimate.additional_data) && !estimate.client_id;
}

// ─── Destinatario ─────────────────────────────────────────────────────────────

/** Lo único personal que pide un quick quote, y solo en el paso de envío. */
export interface QuickQuoteContact {
  fullName: string;
  email:    string;
  phone:    string;
}

export const EMPTY_QUICK_QUOTE_CONTACT: QuickQuoteContact = {
  fullName: "",
  email:    "",
  phone:    "",
};

/**
 * Canal de envío. Misma unión que `DeliveryMethod` de `ResSendStep`, declarada
 * aquí para que las reglas del quick quote no dependan de un componente.
 */
export type QuickQuoteChannel = "email" | "sms" | "both";

/** El canal decide qué datos de contacto hacen falta: ni uno más. */
export function quickQuoteNeedsEmail(channel: QuickQuoteChannel | null): boolean {
  return channel === "email" || channel === "both";
}

export function quickQuoteNeedsPhone(channel: QuickQuoteChannel | null): boolean {
  return channel === "sms" || channel === "both";
}

/** ¿Hay con qué enviar? Nombre siempre, y el contacto que exija el canal. */
export function isQuickQuoteContactComplete(
  contact: QuickQuoteContact,
  channel: QuickQuoteChannel | null,
): boolean {
  if (!channel) return false;
  if (!contact.fullName.trim()) return false;
  if (quickQuoteNeedsEmail(channel) && !contact.email.trim()) return false;
  if (quickQuoteNeedsPhone(channel) && !contact.phone.trim()) return false;
  return true;
}
