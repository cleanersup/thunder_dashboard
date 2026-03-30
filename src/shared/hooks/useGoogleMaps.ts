/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module useGoogleMaps
 * Loads the Google Maps JS API (with places library) once per session.
 * Mirrors swift-slate/src/hooks/useGoogleMaps.tsx.
 */
import { useEffect, useState } from "react";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

// Module-level flags so the script is only injected once
let isLoading = false;
let isLoaded  = false;

export function useGoogleMaps() {
  const [loaded, setLoaded] = useState(isLoaded);
  const [error,  setError]  = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded) { setLoaded(true); return; }

    if (isLoading) {
      const poll = setInterval(() => {
        if (isLoaded) { setLoaded(true); clearInterval(poll); }
      }, 100);
      return () => clearInterval(poll);
    }

    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      if ((window as any).google?.maps) { isLoaded = true; setLoaded(true); }
      return;
    }

    isLoading = true;
    const script = document.createElement("script");
    script.src   = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => { isLoaded = true; isLoading = false; setLoaded(true); };
    script.onerror = () => {
      const msg = "Failed to load Google Maps";
      setError(msg);
      isLoading = false;
      console.error(msg);
    };
    document.head.appendChild(script);
  }, []);

  return { loaded, error, google: loaded ? (window as any).google : null };
}
