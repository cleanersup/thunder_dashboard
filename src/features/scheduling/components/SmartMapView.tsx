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
}

export function SmartMapView({ markers, className = "h-full w-full" }: SmartMapViewProps) {
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

      const content = [
        `<div style="font-size:13px;padding:4px 2px;min-width:140px">`,
        `<strong>${m.name}</strong>`,
        m.phone ? `<br/>📞 ${m.phone}` : "",
        m.email ? `<br/>✉ ${m.email}` : "",
        `<br/><span style="color:#6b7280;font-size:11px">${m.address}</span>`,
        `</div>`,
      ].join("");

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
      <div className={`${className} flex items-center justify-center bg-muted rounded-lg`}>
        <p className="text-sm text-muted-foreground">Map unavailable</p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted rounded-lg`}>
        <LoadingSpinner />
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
}
