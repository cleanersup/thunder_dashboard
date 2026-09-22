/**
 * @module quickQuote
 * Reglas del destinatario de un quick quote.
 *
 * Un quick quote es un estimate residencial **sin cliente ni dirección**: vive en
 * su propia tabla (`quick_quotes`) y lo único personal que pide es a quién
 * enviárselo, ya al final del formulario — pedir esos datos por adelantado era lo
 * que hacía abandonar el proceso.
 *
 * Qué datos hacen falta lo decide el canal elegido, y esa regla vive aquí y no en
 * el componente: la usan tanto el paso de envío (para pintar los campos) como la
 * página (para habilitar el botón y validar antes de guardar).
 */

/** Lo único personal que pide un quick quote. */
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
 * aquí para que las reglas no dependan de un componente.
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
