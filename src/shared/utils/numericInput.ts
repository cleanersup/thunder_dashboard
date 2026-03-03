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

/** Strips all non-digit characters. Use for whole numbers (counts, square footage, durations…). */
export const toIntegerString = (value: string): string => value.replace(/\D/g, "");

/**
 * Strips all non-digit/dot characters and enforces at most one decimal point.
 * Use for prices, rates, percentages, and budgets.
 */
export const toDecimalString = (value: string): string => {
  const clean = value.replace(/[^\d.]/g, "");
  const dot = clean.indexOf(".");
  if (dot === -1) return clean;
  return clean.slice(0, dot + 1) + clean.slice(dot + 1).replace(/\./g, "");
};
