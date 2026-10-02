/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module googleMaps.service
 * Single entry point for the Google Maps JS API (places library) and geocoding.
 * `useGoogleMaps` (AddressAutocomplete) y los mapas pasan por `loadGoogleMaps`,
 * así que el script se inyecta una vez por sesión y los que piden a la vez
 * comparten la misma carga.
 *
 * Aquí viven también las dos formas de geocodificar, que no son intercambiables:
 * `geocodeRequest()` para lo que se pinta en un mapa (API JS, en el navegador) y
 * `geocodeAddress()` para coordenadas que se guardan (edge function, verificadas
 * contra el país de registro).
 */

import { supabase } from "@/integrations/supabase/client";
import { COUNTRY_SUFFIX } from "@/shared/constants/countries";

const API_KEY   = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const SCRIPT_ID = "google-maps-js-api";

let loadPromise: Promise<any> | null = null;

function currentGoogle(): any | null {
  const g = (window as any).google;
  return g?.maps ? g : null;
}

/**
 * Loads the Google Maps JS API once and resolves with the `google` global.
 * @returns The `google` namespace, ready to use
 * @throws Error when the script fails to load (network / bad API key)
 */
export function loadGoogleMaps(): Promise<any> {
  const already = currentGoogle();
  if (already) return Promise.resolve(already);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<any>((resolve, reject) => {
    const onReady = () => {
      const google = currentGoogle();
      if (google) resolve(google);
      else onFail();
    };
    const onFail = () => {
      loadPromise = null;
      reject(new Error("Failed to load Google Maps"));
    };

    const existing =
      (document.getElementById(SCRIPT_ID) as HTMLScriptElement | null) ??
      document.querySelector<HTMLScriptElement>('script[src*="maps.googleapis.com"]');

    if (existing) {
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", onFail);
      return;
    }

    const script   = document.createElement("script");
    script.id      = SCRIPT_ID;
    script.src     = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async   = true;
    script.defer   = true;
    script.addEventListener("load", onReady);
    script.addEventListener("error", onFail);
    document.head.appendChild(script);
  });

  return loadPromise;
}

export interface GeoCoords {
  lat: number;
  lng: number;
}

// ─── Sesgo de país ────────────────────────────────────────────────────────────
// Las direcciones se guardan sin país, así que una petición pelada a Google se
// interpreta en EE. UU. y la dirección de un cliente colombiano puede resolverse
// en Kansas. Todo lo que pregunta por una dirección pasa por aquí para que el
// sesgo se aplique igual en los mapas, las rutas y el geocoding de jobs.

/**
 * Añade el país a la dirección cuando no es de EE. UU.
 * @param address - Dirección tal como está guardada (sin país)
 * @param country - ISO alpha-2 en minúsculas, de `useOwnerCountry()`
 */
export function withCountrySuffix(address: string, country: string): string {
  const suffix = COUNTRY_SUFFIX[country];
  return suffix ? `${address}, ${suffix}` : address;
}

/**
 * Región para sesgar una petición de Google Maps (`region` espera ccTLD).
 * @param country - ISO alpha-2 en minúsculas
 */
export function toRegion(country: string): string {
  return country.toUpperCase();
}

/**
 * Petición de geocoding atada al país del dueño: la restricción garantiza que
 * ningún resultado caiga en otro país, el sufijo ayuda a Google a interpretar la
 * dirección y la región desempata lo que quede ambiguo.
 *
 * Se devuelve la petición en vez de hacerla porque varias pantallas geocodifican
 * en lote con su propia caché y su propio callback; lo que tienen que compartir
 * es el sesgo, no el bucle.
 *
 * @param address - Dirección tal como está guardada (sin país)
 * @param country - ISO alpha-2 en minúsculas, de `useOwnerCountry()`
 */
export function geocodeRequest(address: string, country: string) {
  return {
    address:               withCountrySuffix(address, country),
    region:                toRegion(country),
    componentRestrictions: { country },
  };
}

// ─── Geocoding verificado (coordenadas que se persisten) ──────────────────────

export interface GeocodeAddressInput {
  street?: string | null;
  city?:   string | null;
  state?:  string | null;
  zip?:    string | null;
}

export type GeocodeOutcome =
  | { ok: true;  coords: GeoCoords }
  | { ok: false; reason: string };

/** Lee el motivo del fallo del cuerpo de la respuesta de la edge function. */
async function failureReason(error: unknown): Promise<string> {
  const context = (error as { context?: Response }).context;

  if (context && typeof context.json === "function") {
    try {
      const body = await context.json() as { error?: string; geocoded_country?: string | null };
      const found = body.geocoded_country ? ` (Google placed it in ${body.geocoded_country})` : "";
      if (body.error) return `${body.error}${found}`;
    } catch {
      // Cuerpo no-JSON: se cae al mensaje genérico.
    }
  }

  return error instanceof Error ? error.message : "unknown error";
}

/**
 * Geocodifica una dirección contra la edge function `geocode-address`.
 *
 * No usa la API JS del navegador a propósito. Esto resuelve coordenadas que se
 * **guardan** (el sitio de trabajo contra el que el fichaje hace geofence), y el
 * backend aporta tres cosas que el cliente no puede: restringe la búsqueda al país
 * de registro del dueño sin que el frontend se lo diga, rechaza con 422 si Google
 * devuelve un punto en otro país, y mantiene la API key en el servidor.
 *
 * Los mapas siguen geocodificando en el navegador con `geocodeRequest()`: pintan
 * marcadores en lote, con caché, y necesitan los objetos `LatLng` de la API JS.
 *
 * @param input - Campos de la dirección; el backend compone la consulta
 * @returns Las coordenadas, o el motivo por el que no se pudo resolver
 */
export async function geocodeAddress(input: GeocodeAddressInput): Promise<GeocodeOutcome> {
  const { data, error } = await supabase.functions.invoke<GeoCoords & { formatted_address?: string }>(
    "geocode-address",
    { body: input },
  );

  if (error) return { ok: false, reason: await failureReason(error) };

  if (typeof data?.lat !== "number" || typeof data?.lng !== "number") {
    return { ok: false, reason: "geocode-address returned no coordinates" };
  }

  return { ok: true, coords: { lat: data.lat, lng: data.lng } };
}
