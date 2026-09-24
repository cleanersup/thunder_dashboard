/**
 * Numeric input utilities.
 * Use these to sanitize text inputs that should only accept numbers,
 * instead of relying on type="number" (which has inconsistent UX across browsers).
 *
 * Usage (controlled input):
 *   onChange={(e) => setValue(toIntegerString(e.target.value))}
 *
 * Usage (react-hook-form):
 *   const field = register("price");
 *   <Input {...field} onChange={(e) => { e.target.value = toDecimalString(e.target.value); field.onChange(e); }} />
 */

/**
 * Strips all non-digit characters and removes leading zeros (e.g. "09" → "9",
 * "00" → "0"). Use for whole numbers (counts, square footage, durations…).
 */
export const toIntegerString = (value: string): string =>
  value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

/**
 * Strips all non-digit/dot characters, enforces at most one decimal point, and
 * removes leading zeros from the integer part (e.g. "09" → "9", "020" → "20"),
 * while preserving a single leading zero before a decimal ("0.5" stays "0.5").
 * Use for prices, rates, percentages, and budgets.
 */
export const toDecimalString = (value: string): string => {
  const clean = value.replace(/[^\d.]/g, "");
  const dot = clean.indexOf(".");
  if (dot === -1) return clean.replace(/^0+(?=\d)/, "");
  const intPart  = clean.slice(0, dot).replace(/^0+(?=\d)/, "");
  const fracPart = clean.slice(dot + 1).replace(/\./g, "");
  return `${intPart}.${fracPart}`;
};
