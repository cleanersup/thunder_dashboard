/**
 * @module EmployeeLocationMap
 * Google Maps component showing clock-in (green "IN") and clock-out (red "OUT")
 * markers for a single time entry, connected by a blue Polyline.
 * Renders "No location data available" when no coordinates are stored.
 */
import { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/shared/hooks/useGoogleMaps";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import type { TimeEntry } from "../types/timeClock.types";

interface EmployeeLocationMapProps {
  entry: TimeEntry;
  className?: string;
}

export function EmployeeLocationMap({ entry, className = "w-full h-[200px]" }: EmployeeLocationMapProps) {
  const { loaded, error, google } = useGoogleMaps();
  const mapRef         = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef     = useRef<any[]>([]);
  const polylineRef    = useRef<any>(null);

  const hasClockIn  = entry.clock_in_latitude  != null && entry.clock_in_longitude  != null;
  const hasClockOut = entry.clock_out_latitude != null && entry.clock_out_longitude != null;
  const hasAny      = hasClockIn || hasClockOut;

  useEffect(() => {
    if (!loaded || !google || !mapRef.current || !hasAny) return;

    // Init map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        zoom: 14,
        center: {
          lat: entry.clock_in_latitude  ?? entry.clock_out_latitude!,
          lng: entry.clock_in_longitude ?? entry.clock_out_longitude!,
        },
        mapTypeControl:    false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      });
    }

    // Clear previous overlays
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polylineRef.current?.setMap(null);
    polylineRef.current = null;

    const points: { lat: number; lng: number }[] = [];
    const bounds = new google.maps.LatLngBounds();

    // Clock-in marker (green)
    if (hasClockIn) {
      const pos = { lat: entry.clock_in_latitude!, lng: entry.clock_in_longitude! };
      const marker = new google.maps.Marker({
        position: pos,
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#10b981",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: 10,
        },
        label: { text: "IN", color: "#ffffff", fontSize: "9px", fontWeight: "700" },
        title: "Clock In",
      });
      markersRef.current.push(marker);
      points.push(pos);
      bounds.extend(pos);
    }

    // Clock-out marker (red)
    if (hasClockOut) {
      const pos = { lat: entry.clock_out_latitude!, lng: entry.clock_out_longitude! };
      const marker = new google.maps.Marker({
        position: pos,
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: 10,
        },
        label: { text: "OUT", color: "#ffffff", fontSize: "8px", fontWeight: "700" },
        title: "Clock Out",
      });
      markersRef.current.push(marker);
      points.push(pos);
      bounds.extend(pos);
    }

    // Blue polyline connecting the two points
    if (points.length === 2) {
      polylineRef.current = new google.maps.Polyline({
        path: points,
        geodesic: true,
        strokeColor: "#3b82f6",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: mapInstanceRef.current,
      });
    }

    if (!bounds.isEmpty()) {
      if (points.length === 1) {
        mapInstanceRef.current.setCenter(points[0]);
        mapInstanceRef.current.setZoom(15);
      } else {
        mapInstanceRef.current.fitBounds(bounds, 40);
        const listener = google.maps.event.addListener(mapInstanceRef.current, "idle", () => {
          if (mapInstanceRef.current.getZoom() > 16) mapInstanceRef.current.setZoom(16);
          google.maps.event.removeListener(listener);
        });
      }
    }
  }, [loaded, google, entry, hasAny, hasClockIn, hasClockOut]);

  if (!hasAny) {
    return (
      <div className={`${className} rounded-lg bg-muted flex items-center justify-center`}>
        <p className="text-xs text-muted-foreground">No location data available</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} rounded-lg bg-muted flex items-center justify-center`}>
        <p className="text-xs text-muted-foreground">Map unavailable</p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className={`${className} rounded-lg bg-muted flex items-center justify-center`}>
        <LoadingSpinner />
      </div>
    );
  }

  return <div ref={mapRef} className={`${className} rounded-lg overflow-hidden border border-border`} />;
}
