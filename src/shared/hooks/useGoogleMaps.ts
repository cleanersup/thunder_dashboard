/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module useGoogleMaps
 * Loads the Google Maps JS API (with places library) once per session.
 * Mirrors swift-slate/src/hooks/useGoogleMaps.tsx.
 */
import { useEffect, useState } from "react";
import { loadGoogleMaps } from "@/shared/services/googleMaps.service";

export function useGoogleMaps() {
  const [google, setGoogle] = useState<any>(null);
  const [error,  setError]  = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => { if (!cancelled) setGoogle(g); })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        console.error(err.message);
      });
    return () => { cancelled = true; };
  }, []);

  return { loaded: google !== null, error, google };
}
