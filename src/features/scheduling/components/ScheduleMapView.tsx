/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module ScheduleMapView
 * El día sobre el mapa: una chincheta numerada por parada.
 *
 * El calendario responde "cuándo"; el mapa responde "dónde", que es lo que hace
 * falta para decidir si una ruta tiene sentido. El número de la chincheta es el
 * orden de la parada en la jornada, así que el recorrido se lee siguiendo 1, 2,
 * 3 sin tener que abrir nada.
 *
 * El color sale de `eventPalette`, el mismo que el bloque del calendario y la
 * píldora de la tabla: un job en rojo lo está en las tres pantallas.
 */
import { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/shared/hooks/useGoogleMaps";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { resolveCssColor } from "@/shared/utils/cssColor";
import { eventPalette, type ScheduleEvent } from "../types/scheduleEvent";
import type { LatLng } from "../hooks/useScheduleGeocode";

interface ScheduleMapViewProps {
  /** Paradas en el orden en que se numeran. */
  events: ScheduleEvent[];
  /** Coordenadas por `event.id`; un evento sin entrada no se dibuja. */
  coords: Map<string, LatLng>;
  /** Número de parada por `event.id` — el mismo que muestra la lista. */
  stopNumbers: Map<string, number>;
  /** Parada resaltada — el mapa se centra en ella. */
  selectedId: string | null;
  onSelect: (event: ScheduleEvent) => void;
  className?: string;
}

/** Chincheta en forma de gota con el número dentro. */
function pinIcon(google: any, color: string, label: string, selected: boolean) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">
      <path d="M17 1C8.7 1 2 7.7 2 16c0 10.5 13.2 26.6 13.8 27.3a1.6 1.6 0 0 0 2.4 0C18.8 42.6 32 26.5 32 16 32 7.7 25.3 1 17 1z"
            fill="${color}" stroke="#ffffff" stroke-width="${selected ? 3.5 : 2}"/>
      <circle cx="17" cy="16" r="9" fill="#ffffff" fill-opacity="0.92"/>
      <text x="17" y="20.5" text-anchor="middle"
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
            font-size="12" font-weight="700" fill="${color}">${label}</text>
    </svg>`;

  const size = selected ? 1.25 : 1;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(34 * size, 46 * size),
    anchor: new google.maps.Point(17 * size, 46 * size),
  };
}

export function ScheduleMapView({
  events, coords, stopNumbers, selectedId, onSelect, className = "h-full w-full",
}: ScheduleMapViewProps) {
  const { loaded, error, google } = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const markersRef   = useRef<Map<string, any>>(new Map());
  // El encuadre automático solo se hace la primera vez que hay paradas: después
  // manda el usuario, y recolocar el mapa bajo su mano sería pelearse con él.
  const fittedRef    = useRef(false);

  useEffect(() => {
    if (!loaded || !google || !containerRef.current || mapRef.current) return;
    mapRef.current = new google.maps.Map(containerRef.current, {
      center: { lat: 39.8283, lng: -98.5795 },
      zoom: 4,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      gestureHandling: "greedy",
      fullscreenControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      zoomControlOptions:       { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
    });
  }, [loaded, google]);

  // Chinchetas
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !google || !map) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = new Map();

    const bounds = new google.maps.LatLngBounds();
    let placed = 0;

    events.forEach((ev, i) => {
      const at = coords.get(ev.id);
      if (!at) return;

      const marker = new google.maps.Marker({
        position: at,
        map,
        title: ev.title,
        // El color del estado es un token del tema, y dentro del SVG serializado
        // `var(--…)` no existe: hay que resolverlo antes de dibujarlo.
        icon: pinIcon(
          google,
          resolveCssColor(eventPalette(ev).color),
          String(stopNumbers.get(ev.id) ?? i + 1),
          ev.id === selectedId,
        ),
        zIndex: ev.id === selectedId ? 999 : i,
      });
      marker.addListener("click", () => onSelect(ev));

      markersRef.current.set(ev.id, marker);
      bounds.extend(at);
      placed++;
    });

    if (placed > 0 && !fittedRef.current) {
      map.fitBounds(bounds, 80);
      const l = google.maps.event.addListener(map, "idle", () => {
        if (map.getZoom() > 15) map.setZoom(15);
        google.maps.event.removeListener(l);
      });
      fittedRef.current = true;
    }
    if (placed === 0) fittedRef.current = false;
  }, [events, coords, stopNumbers, selectedId, loaded, google, onSelect]);

  // Navegar a la parada elegida desde el panel lateral.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const at = coords.get(selectedId);
    if (!at) return;
    map.panTo(at);
    if (map.getZoom() < 13) map.setZoom(13);
  }, [selectedId, coords]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center rounded-lg bg-muted`}>
        <p className="text-sm text-muted-foreground">Map unavailable</p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className={`${className} flex items-center justify-center rounded-lg bg-muted`}>
        <LoadingSpinner />
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
