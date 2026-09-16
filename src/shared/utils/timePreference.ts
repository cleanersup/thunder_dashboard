/**
 * @module timePreference
 * Preferencia de horario de un request/booking.
 *
 * Esquema nuevo (swift-slate): `anytime | morning | afternoon | evening`.
 * Los datos legacy `am`/`pm` se normalizan en lectura — NO hay migración de DB,
 * así que cualquier lugar que lea `time_preference` debe pasar por
 * `normalizeTimePreference` / `formatTimePreference`.
 */

export const TIME_PREFERENCE_OPTIONS = [
  { value: "anytime",   label: "Anytime"   },
  { value: "morning",   label: "Morning"   },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening",   label: "Evening"   },
] as const;

export type TimePreference = typeof TIME_PREFERENCE_OPTIONS[number]["value"];

/** Normaliza el valor almacenado al esquema nuevo ("" si no hay valor). */
export function normalizeTimePreference(value: string | null | undefined): string {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "am") return "morning";
  if (v === "pm") return "afternoon";
  return v;
}

/** Etiqueta legible de `time_preference` (maneja legacy am/pm). "" si no hay valor. */
export function formatTimePreference(value: string | null | undefined): string {
  const v = normalizeTimePreference(value);
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : "";
}

/**
 * Mapea la preferencia a una hora concreta HH:mm — usada al convertir un request
 * en walkthrough/job, donde el registro destino necesita un horario real.
 */
export function timePreferenceToTime(value: string | null | undefined): string {
  const v = normalizeTimePreference(value);
  if (!v) return "09:00";
  if (/^\d{1,2}:\d{2}$/.test(v)) return v.padStart(5, "0");
  if (v.includes("morning")) return "09:00";
  if (v.includes("afternoon")) return "14:00";
  if (v.includes("evening") || v.includes("night")) return "18:00";
  return "09:00";
}
