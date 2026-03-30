/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * RouteMapView — Google Maps component showing ordered stops for a route.
 * Markers are labeled A→B→C… with DirectionsService polylines between them.
 */
import { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/shared/hooks/useGoogleMaps";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import type { AppointmentWithClient } from "../types/scheduling.types";

const PIN_COLORS = [
  "#ef4444", "#3b82f6", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

interface RouteMapViewProps {
  appointments: AppointmentWithClient[];
  companyAddress?: string;
  className?: string;
}

export function RouteMapView({ appointments, className = "h-64" }: RouteMapViewProps) {
  const { loaded, error, google } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const renderersRef = useRef<any[]>([]);

  // Init map
  useEffect(() => {
    if (!loaded || !google || !mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: 39.8283, lng: -98.5795 },
      zoom: 4,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      // greedy: wheel/trackpad zooms without ⌘/Ctrl (cooperative required modifier keys)
      gestureHandling: "greedy",
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM,
      },
    });
  }, [loaded, google]);

  // Build route when appointments change
  useEffect(() => {
    if (!loaded || !google || !mapInstanceRef.current) return;

    // Clear
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    renderersRef.current.forEach((r) => r.setMap(null));
    renderersRef.current = [];

    if (appointments.length === 0) return;

    const geocoder = new google.maps.Geocoder();
    const directionsService = new google.maps.DirectionsService();
    const bounds = new google.maps.LatLngBounds();

    const sorted = [...appointments].sort((a, b) =>
      (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? ""),
    );

    const geocoded: Array<{ position: any; label: string; color: string; client: AppointmentWithClient["clients"] }> = [];
    let pending = sorted.length;

    sorted.forEach((appt, idx) => {
      const client = appt.clients;
      if (!client) {
        pending--;
        return;
      }
      const apt = client.service_apt ? ` ${client.service_apt}` : "";
      const address = `${client.service_street}${apt}, ${client.service_city}, ${client.service_state} ${client.service_zip}`;
      const letter = String.fromCharCode(65 + idx);
      const color = PIN_COLORS[idx % PIN_COLORS.length];

      geocoder.geocode({ address }, (results: any, status: any) => {
        if (status === "OK" && results?.[0]) {
          const pos = results[0].geometry.location;
          geocoded.push({ position: pos, label: letter, color, client });
          bounds.extend(pos);
        }
        pending--;
        if (pending === 0) renderMap();
      });
    });

    function renderMap() {
      if (!mapInstanceRef.current || !google) return;

      geocoded.forEach(({ position, label, color, client }) => {
        const marker = new google.maps.Marker({
          position,
          map: mapInstanceRef.current,
          label: {
            text: label,
            color: "#ffffff",
            fontWeight: "bold",
            fontSize: "12px",
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            scale: 16,
          },
          title: client.full_name,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="font-size:13px;padding:4px 2px"><strong>${client.full_name}</strong><br/>${client.service_street}, ${client.service_city}</div>`,
        });
        marker.addListener("click", () => infoWindow.open(mapInstanceRef.current, marker));
        markersRef.current.push(marker);
      });

      if (geocoded.length >= 2) {
        for (let i = 0; i < geocoded.length - 1; i++) {
          const renderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: { strokeColor: "#6366f1", strokeWeight: 3, strokeOpacity: 0.7 },
          });
          renderer.setMap(mapInstanceRef.current);
          renderersRef.current.push(renderer);

          directionsService.route(
            {
              origin: geocoded[i].position,
              destination: geocoded[i + 1].position,
              travelMode: google.maps.TravelMode.DRIVING,
            },
            (result: any, status: any) => {
              if (status === "OK") renderer.setDirections(result);
            },
          );
        }
      }

      if (!bounds.isEmpty()) {
        mapInstanceRef.current.fitBounds(bounds, 40);
      }
    }
  }, [appointments, loaded, google]);

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

  return <div ref={mapRef} className={`${className} rounded-lg overflow-hidden`} />;
}
