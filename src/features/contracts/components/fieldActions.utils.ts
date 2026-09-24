/** Tracks how the current value was produced. */
export type FieldSource = "empty" | "user" | "default";

export type FieldState =
  | "EMPTY_NO_DEFAULT"
  | "EMPTY_WITH_DEFAULT"
  | "FILLED_USER"
  | "FILLED_DEFAULT"
  | "MODIFIED_DEFAULT";

/**
 * Derives the current field state from value + savedDefault + source.
 * Pure function — safe to call in render.
 */
export function deriveFieldState(
  value: string,
  defaultValue: string,
  source: FieldSource,
): FieldState {
  const v = value.trim();
  const d = defaultValue.trim();

  if (!v) return d ? "EMPTY_WITH_DEFAULT" : "EMPTY_NO_DEFAULT";
  if (source === "default" || v === d) return "FILLED_DEFAULT";
  if (d) return "MODIFIED_DEFAULT";
  return "FILLED_USER";
}

/**
 * Infers an initial FieldSource from an existing value + its default.
 * Use this when loading form data from the DB to avoid treating saved
 * content as "user-typed" when it actually equals the stored default.
 */
export function initialSource(value: string, defaultValue: string): FieldSource {
  if (!value?.trim()) return "empty";
  if (value.trim() === defaultValue?.trim()) return "default";
  return "user";
}
