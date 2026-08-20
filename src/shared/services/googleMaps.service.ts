/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module googleMaps.service
 * Single entry point for the Google Maps JS API (places library) and geocoding.
 * Both `useGoogleMaps` (AddressAutocomplete) and address geocoding go through
 * `loadGoogleMaps`, so the script is injected once per session and concurrent
 * callers share the same load.
 */

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

/**
 * Geocodes a plain address string into coordinates.
 * @param address - Address to look up, e.g. "123 Main St, Miami, FL, 33101"
 * @returns Coordinates, or `null` when the address can't be resolved
 * @example
 * const coords = await geocodeAddress("350 Mission St, San Francisco, CA");
 */
export async function geocodeAddress(address: string): Promise<GeoCoords | null> {
  const query = address.trim();
  if (!query) return null;

  try {
    const google   = await loadGoogleMaps();
    const geocoder = new google.maps.Geocoder();

    return await new Promise<GeoCoords | null>((resolve) => {
      geocoder.geocode({ address: query }, (results: any[], status: string) => {
        const location = status === "OK" ? results?.[0]?.geometry?.location : null;
        resolve(location ? { lat: location.lat(), lng: location.lng() } : null);
      });
    });
  } catch {
    return null;
  }
}
