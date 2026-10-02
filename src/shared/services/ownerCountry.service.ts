/**
 * @module ownerCountry.service
 * País de operación del dueño — fuente única para todo el dashboard.
 *
 * Un dueño presta servicio solo en el país con el que se registró, así que ni
 * clientes, ni propiedades, ni empleados, ni direcciones pueden estar en otro.
 * El país no se elige en ningún formulario: se lee de aquí.
 *
 * Orden de resolución:
 *   1. `session.user.user_metadata.country` — el backend lo deja en la sesión al
 *      hacer login, así que está disponible sin ningún request.
 *   2. `rpc("get_my_country")` — respaldo para sesiones emitidas antes de que el
 *      backend poblara el metadata: `user_metadata` solo se refresca cuando se
 *      renueva el token.
 *
 * `profiles.company_country` se sigue escribiendo al guardar Company Info, pero
 * ya no manda: el claim es la fuente canónica.
 *
 * ⚠️ `user_metadata` lo puede escribir el propio usuario desde el cliente
 * (`supabase.auth.updateUser`). Sirve para sesgar sugerencias de direcciones y
 * elegir reglas de formato, **no** para hacer cumplir nada. Cualquier límite real
 * (plan, impuestos, bloqueo de creación) tiene que validarse en el backend.
 */
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** País por defecto cuando el backend todavía no tiene país para la cuenta. */
export const DEFAULT_OWNER_COUNTRY = "us";

export interface OwnerCountry {
  /** ISO alpha-2 en minúsculas — lo que esperan Google Places y las tablas de países. */
  code: string;
  /** Nombre que mandó el backend (`country_name`), si vino. */
  name: string | null;
}

/**
 * Normaliza un código de país a ISO alpha-2 minúsculas.
 * @returns El código, o `null` si no es usable (vacío, `'all'`, longitud distinta de 2)
 */
export function normalizeCountryCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toLowerCase();
  if (code.length !== 2) return null;   // descarta "", "all" y nombres completos
  return code;
}

/**
 * Override de desarrollo para probar la app como un dueño de otro país sin tocar
 * la base de datos: `VITE_OWNER_COUNTRY=co npm run dev`. Inerte en producción.
 */
function devOverride(): OwnerCountry | null {
  if (!import.meta.env.DEV) return null;
  const code = normalizeCountryCode(import.meta.env.VITE_OWNER_COUNTRY);
  return code ? { code, name: null } : null;
}

/**
 * Lee el país del claim que viene en la sesión. Síncrono y sin request.
 * @param session - Sesión de Supabase (de `useAuth()`)
 */
export function ownerCountryFromSession(session: Session | null): OwnerCountry | null {
  const override = devOverride();
  if (override) return override;

  const metadata = session?.user?.user_metadata as
    | { country?: unknown; country_name?: unknown }
    | undefined;

  const code = normalizeCountryCode(metadata?.country);
  if (!code) return null;

  const name = typeof metadata?.country_name === "string" ? metadata.country_name : null;
  return { code, name };
}

/**
 * Pide el país al backend (`get_my_country`, resuelto con el JWT).
 * Solo hace falta cuando el claim no está en la sesión.
 * @returns El país, o `null` si el backend no tiene uno para la cuenta
 */
export async function fetchOwnerCountry(): Promise<OwnerCountry | null> {
  const override = devOverride();
  if (override) return override;

  const { data, error } = await supabase.rpc("get_my_country" as never);
  if (error) return null;

  // El RPC puede venir como objeto o como fila única según cómo esté declarado.
  const row = (Array.isArray(data) ? data[0] : data) as
    | { country?: unknown; country_name?: unknown }
    | null
    | undefined;

  const code = normalizeCountryCode(row?.country);
  if (!code) return null;

  const name = typeof row?.country_name === "string" ? row.country_name : null;
  return { code, name };
}
