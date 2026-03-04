/**
 * @module useSmartMap
 * Fetches leads, clients, and employees from Supabase, then geocodes
 * their addresses using the Google Maps Geocoder API.
 * Results are cached in component state — not persisted to the DB.
 */
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleMaps } from "@/shared/hooks/useGoogleMaps";
import type { MapMarker, SmartMapFilter } from "../types/scheduling.types";

// ─── Raw data queries ─────────────────────────────────────────────────────────

function useLeads() {
  return useQuery({
    queryKey: ["smart-map-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, full_name, phone, email, address, apt_suite, city, state, zip_code");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

function useClients() {
  return useQuery({
    queryKey: ["smart-map-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select(
          "id, full_name, phone, email, service_street, service_apt, service_city, service_state, service_zip",
        );
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

function useEmployees() {
  return useQuery({
    queryKey: ["smart-map-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, phone, email, street, city, state, zip");
      if (error) throw error;
      return (data ?? []).filter((e) => e.street && e.city && e.state && e.zip);
    },
    staleTime: 60_000,
  });
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useSmartMap() {
  const { loaded: mapsLoaded, google } = useGoogleMaps();
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [filter, setFilter] = useState<SmartMapFilter>("all");
  const [isGeocoding, setIsGeocoding] = useState(false);

  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: employees = [], isLoading: empLoading } = useEmployees();

  const geocodeCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  const isLoading = leadsLoading || clientsLoading || empLoading || isGeocoding;

  // Build raw markers list whenever data or filter changes
  useEffect(() => {
    if (leadsLoading || clientsLoading || empLoading) return;

    const rawMarkers: MapMarker[] = [];

    if (filter === "all" || filter === "lead") {
      leads.forEach((l) => {
        const apt = l.apt_suite ? `, ${l.apt_suite}` : "";
        rawMarkers.push({
          id: `lead-${l.id}`,
          name: l.full_name,
          type: "lead",
          address: `${l.address}${apt}, ${l.city}, ${l.state} ${l.zip_code}`,
          phone: l.phone ?? undefined,
          email: l.email ?? undefined,
        });
      });
    }

    if (filter === "all" || filter === "client") {
      clients.forEach((c) => {
        const apt = c.service_apt ? ` ${c.service_apt}` : "";
        rawMarkers.push({
          id: `client-${c.id}`,
          name: c.full_name,
          type: "client",
          address: `${c.service_street}${apt}, ${c.service_city}, ${c.service_state} ${c.service_zip}`,
          phone: c.phone ?? undefined,
          email: c.email ?? undefined,
        });
      });
    }

    if (filter === "all" || filter === "employee") {
      employees.forEach((e) => {
        rawMarkers.push({
          id: `employee-${e.id}`,
          name: `${e.first_name} ${e.last_name}`,
          type: "employee",
          address: `${e.street}, ${e.city}, ${e.state} ${e.zip}`,
          phone: e.phone ?? undefined,
          email: e.email ?? undefined,
        });
      });
    }

    if (!mapsLoaded || !google) {
      setMarkers(rawMarkers);
      return;
    }

    // Geocode addresses
    const geocoder = new google.maps.Geocoder();
    setIsGeocoding(true);
    let pending = rawMarkers.length;

    if (pending === 0) {
      setMarkers([]);
      setIsGeocoding(false);
      return;
    }

    const geocoded: MapMarker[] = [];

    rawMarkers.forEach((marker) => {
      const cached = geocodeCacheRef.current.get(marker.address);
      if (cached) {
        geocoded.push({ ...marker, lat: cached.lat, lng: cached.lng });
        pending--;
        if (pending === 0) {
          setMarkers([...geocoded]);
          setIsGeocoding(false);
        }
        return;
      }

      geocoder.geocode({ address: marker.address }, (results: any, status: any) => {
        if (status === "OK" && results?.[0]) {
          const loc = results[0].geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          geocodeCacheRef.current.set(marker.address, { lat, lng });
          geocoded.push({ ...marker, lat, lng });
        } else {
          geocoded.push(marker);
        }
        pending--;
        if (pending === 0) {
          setMarkers([...geocoded]);
          setIsGeocoding(false);
        }
      });
    });
  }, [leads, clients, employees, filter, mapsLoaded, google, leadsLoading, clientsLoading, empLoading]);

  const counts = {
    leads: leads.length,
    clients: clients.length,
    employees: employees.length,
  };

  return { markers, isLoading, filter, setFilter, counts };
}
