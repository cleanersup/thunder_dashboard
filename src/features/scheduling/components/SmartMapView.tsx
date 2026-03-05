/**
 * SmartMapView — Google Maps with colored markers for leads/clients/employees.
 * Blue = leads, Green = clients, Purple = employees.
 */
import { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/shared/hooks/useGoogleMaps";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import type { MapMarker } from "../types/scheduling.types";

const MARKER_COLORS: Record<string, string> = {
  lead: "#3b82f6",     // blue
  client: "#10b981",   // green
  employee: "#8b5cf6", // purple
};

interface SmartMapViewProps {
  markers: MapMarker[];
  className?: string;
  style?: React.CSSProperties; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function SmartMapView({ markers, className = "h-full w-full", style }: SmartMapViewProps) {
  const { loaded, error, google } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Init map
  useEffect(() => {
    if (!loaded || !google || !mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: 39.8283, lng: -98.5795 },
      zoom: 4,
      streetViewControl: false,
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM,
      },
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM,
      },
      gestureHandling: "greedy",
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM,
      },
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
    });
  }, [loaded, google]);

  // Place markers when data changes
  useEffect(() => {
    if (!loaded || !google || !mapInstanceRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const geocodedMarkers = markers.filter((m) => m.lat != null && m.lng != null);
    if (geocodedMarkers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    geocodedMarkers.forEach((m) => {
      const position = { lat: m.lat!, lng: m.lng! };
      const color = MARKER_COLORS[m.type] ?? "#6b7280";

      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: 10,
        },
        title: m.name,
      });

      const badgeColor = m.type === "client" ? "#10b981" : m.type === "employee" ? "#8b5cf6" : "#3b82f6";
      const badgeLabel = m.type === "client" ? "Client" : m.type === "employee" ? "Employee" : "Lead";
      const content = `
        <div style="padding:12px;min-width:200px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="display:flex;align-items:start;justify-content:space-between;margin-bottom:8px;">
            <strong style="font-size:15px;color:#1f2937;margin:0;">${m.name}</strong>
            <span style="background:${badgeColor};color:#fff;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;text-transform:uppercase;margin-left:8px;white-space:nowrap;">${badgeLabel}</span>
          </div>
          ${m.email ? `<div style="display:flex;align-items:center;margin-top:8px;font-size:13px;color:#4b5563;">
            <svg style="width:14px;height:14px;margin-right:6px;flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            <a href="mailto:${m.email}" style="color:#3B82F6;text-decoration:none;">${m.email}</a>
          </div>` : ""}
          ${m.phone ? `<div style="display:flex;align-items:center;margin-top:6px;font-size:13px;color:#4b5563;">
            <svg style="width:14px;height:14px;margin-right:6px;flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            <a href="tel:${m.phone}" style="color:#3B82F6;text-decoration:none;">${m.phone}</a>
          </div>` : ""}
          <div style="display:flex;align-items:start;margin-top:8px;font-size:12px;color:#6b7280;padding-top:8px;border-top:1px solid #e5e7eb;">
            <svg style="width:14px;height:14px;margin-right:6px;margin-top:1px;flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span style="line-height:1.4;">${m.address}</span>
          </div>
        </div>`;

      const infoWindow = new google.maps.InfoWindow({ content });
      marker.addListener("click", () => infoWindow.open(mapInstanceRef.current, marker));

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (!bounds.isEmpty()) {
      mapInstanceRef.current.fitBounds(bounds, 60);
      // Prevent over-zooming on few markers
      const listener = google.maps.event.addListener(mapInstanceRef.current, "idle", () => {
        if (mapInstanceRef.current.getZoom() > 14) mapInstanceRef.current.setZoom(14);
        google.maps.event.removeListener(listener);
      });
    }
  }, [markers, loaded, google]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted rounded-lg`} style={style}>
        <p className="text-sm text-muted-foreground">Map unavailable</p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted rounded-lg`} style={style}>
        <LoadingSpinner />
      </div>
    );
  }

  return <div ref={mapRef} className={className} style={style} />;
}
