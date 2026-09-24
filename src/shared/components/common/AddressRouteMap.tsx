/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module AddressRouteMap
 * Reusable Google Maps component that shows the route from an origin address
 * (company) to a destination address (client / lead).
 *
 * Behavior:
 * - Both addresses provided  → DirectionsService route with distance + duration badge
 * - Only targetAddress       → Geocodes destination and places a single marker
 * - companyAddress missing   → Shows a "Company address missing" overlay
 * - targetAddress empty      → Renders nothing
 *
 * Used in: EstimateClientStep (client / lead selection), and any future feature
 * that needs to display an address on a map.
 */
import { useEffect, useRef, useState } from "react";
import { Navigation } from "lucide-react";
import { useGoogleMaps } from "@/shared/hooks/useGoogleMaps";
import { LoadingSpinner } from "./LoadingSpinner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RouteInfo {
  distance: string;
  duration: string;
}

export interface AddressRouteMapProps {
  /** Destination address (client / lead). Map renders only when this is non-empty. */
  targetAddress: string;
  /** Origin address (company). When omitted, shows a single marker at targetAddress. */
  companyAddress?: string;
  /** Tailwind class for the map container dimensions. @default "w-full h-[220px]" */
  className?: string;
  /** Whether to display the distance + duration badge. @default true */
  showRouteInfo?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddressRouteMap({
  targetAddress,
  companyAddress,
  className = "w-full h-[220px]",
  showRouteInfo = true,
}: AddressRouteMapProps) {
  const { loaded, error, google } = useGoogleMaps();
  const mapRef         = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const dirRendererRef = useRef<any>(null);
  const markerRef      = useRef<any>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  // Re-initialize when any key address changes
  useEffect(() => {
    if (!loaded || !google || !mapRef.current || !targetAddress) return;

    // Init map once per mount
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: 39.8283, lng: -98.5795 },
        zoom: 12,
        mapTypeControl:    false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      });
    }

    // Clear previous overlays
    dirRendererRef.current?.setMap(null);
    dirRendererRef.current = null;
    markerRef.current?.setMap(null);
    markerRef.current = null;
    setRouteInfo(null);

    const map = mapInstanceRef.current;

    if (companyAddress) {
      // ── Route mode: company → client ─────────────────────────────────────
      const renderer = new google.maps.DirectionsRenderer({ map, suppressMarkers: false });
      dirRendererRef.current = renderer;

      new google.maps.DirectionsService().route(
        { origin: companyAddress, destination: targetAddress, travelMode: google.maps.TravelMode.DRIVING },
        (result: any, status: any) => {
          if (status === "OK" && result) {
            renderer.setDirections(result);
            const leg = result.routes?.[0]?.legs?.[0];
            if (leg) setRouteInfo({ distance: leg.distance.text, duration: leg.duration.text });
          } else {
            // Directions failed — fall back to single marker
            geocodeAndPin(google, map, targetAddress);
          }
        },
      );
    } else {
      // ── Single-marker mode ────────────────────────────────────────────────
      geocodeAndPin(google, map, targetAddress);
    }
  }, [loaded, google, targetAddress, companyAddress]);

  // Cleanup on unmount
  useEffect(() => () => {
    dirRendererRef.current?.setMap(null);
    markerRef.current?.setMap(null);
  }, []);

  function geocodeAndPin(g: any, map: any, address: string) {
    new g.maps.Geocoder().geocode({ address }, (results: any, status: any) => {
      if (status === "OK" && results?.[0]) {
        const loc = results[0].geometry.location;
        map.setCenter(loc);
        map.setZoom(15);
        markerRef.current = new g.maps.Marker({ position: loc, map, title: address });
      }
    });
  }

  // Don't render anything when there's no address
  if (!targetAddress) return null;

  return (
    <div className="relative rounded-lg overflow-hidden border border-border">
      {/* Map container */}
      {loaded && !error ? (
        <div ref={mapRef} className={className} />
      ) : error ? (
        <div className={`${className} bg-muted flex items-center justify-center`}>
          <p className="text-xs text-muted-foreground">Map unavailable</p>
        </div>
      ) : (
        <div className={`${className} bg-muted flex items-center justify-center`}>
          <LoadingSpinner />
        </div>
      )}

      {/* Missing company address overlay */}
      {loaded && !error && !companyAddress && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-foreground">Company Address Missing</p>
            <p className="text-xs text-muted-foreground">
              Add your company address in Profile → Company Information to see the route.
            </p>
          </div>
        </div>
      )}

      {/* Distance + duration badge */}
      {showRouteInfo && routeInfo && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm border border-border rounded-md px-2.5 py-1.5 shadow-sm">
          <Navigation className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">{routeInfo.distance}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{routeInfo.duration}</span>
        </div>
      )}
    </div>
  );
}
