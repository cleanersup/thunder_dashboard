/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module useScheduleGeocode
 * Convierte las direcciones de los eventos del día en coordenadas.
 *
 * Los jobs guardan la dirección como texto, no como latitud/longitud, así que
 * para pintarlos en un mapa hay que preguntarle a Google dónde cae cada una.
 * Es el mismo procedimiento que usa Smart Map, repetido aquí a propósito: Smart
 * Map resuelve leads, clientes y empleados (entidades con dirección propia) y
 * esto resuelve paradas de agenda; unificarlos ataría dos pantallas que cambian
 * por motivos distintos.
 *
 * La caché es de módulo, no del componente: al ir y volver entre calendario y
 * mapa las direcciones ya resueltas no se vuelven a pedir.
 */
import { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "@/shared/hooks/useGoogleMaps";
import { useOwnerCountry } from "@/shared/hooks/useOwnerCountry";
import { geocodeRequest } from "@/shared/services/googleMaps.service";
import type { ScheduleEvent } from "../types/scheduleEvent";

export interface LatLng { lat: number; lng: number }

/** Dirección normalizada → coordenadas. Vive mientras viva la pestaña. */
const cache = new Map<string, LatLng | null>();

const key = (address: string) => address.trim().toLowerCase();

/**
 * @param events - Eventos a situar; los que no tienen dirección se ignoran.
 * @returns `coords` indexado por `event.id`, y si queda alguna dirección en curso.
 */
export function useScheduleGeocode(events: ScheduleEvent[]) {
  const { loaded, google } = useGoogleMaps();
  const { country } = useOwnerCountry();
  const [coords, setCoords] = useState<Map<string, LatLng>>(new Map());
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Las direcciones que ya se pidieron en esta sesión de componente, para que un
  // re-render no dispare la misma petición dos veces.
  const requestedRef = useRef<Set<string>>(new Set());

  const addresses = events.map((e) => e.address).filter(Boolean).join("|");

  useEffect(() => {
    if (!loaded || !google) return;

    const withAddress = events.filter((e) => e.address);

    // Lo que ya está en caché se puede pintar de inmediato.
    const next = new Map<string, LatLng>();
    const pending: string[] = [];

    withAddress.forEach((e) => {
      const k = key(e.address!);
      const hit = cache.get(k);
      if (hit) next.set(e.id, hit);
      else if (!cache.has(k) && !requestedRef.current.has(k)) pending.push(e.address!);
    });
    setCoords(next);

    if (pending.length === 0) { setIsGeocoding(false); return; }

    const geocoder = new google.maps.Geocoder();
    let left = pending.length;
    setIsGeocoding(true);
    let cancelled = false;

    pending.forEach((address) => {
      const k = key(address);
      requestedRef.current.add(k);

      geocoder.geocode(geocodeRequest(address, country), (results: any, status: any) => {
        if (status === "OK" && results?.[0]) {
          const loc = results[0].geometry.location;
          cache.set(k, { lat: loc.lat(), lng: loc.lng() });
        } else {
          // Se recuerda el fallo para no reintentar una dirección que Google no
          // reconoce cada vez que se abre el mapa.
          cache.set(k, null);
        }

        if (--left > 0 || cancelled) return;

        const resolved = new Map<string, LatLng>();
        withAddress.forEach((e) => {
          const hit = cache.get(key(e.address!));
          if (hit) resolved.set(e.id, hit);
        });
        setCoords(resolved);
        setIsGeocoding(false);
      });
    });

    return () => { cancelled = true; };
    // `addresses` resume las direcciones: basta con volver a geocodificar cuando
    // cambian, no en cada render de la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses, loaded, google, country]);

  return { coords, isGeocoding };
}
