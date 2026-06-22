/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module useSmartMap
 * Fetches leads, clients, and employees from Supabase, geocodes their
 * addresses via the Google Maps Geocoder API, and supports multi-select
 * filter toggles (all / leads / clients / employees).
 * Geocoded coordinates are cached in a ref — not persisted to the DB.
 */
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleMaps } from "@/shared/hooks/useGoogleMaps";
import type { MapMarker } from "../types/scheduling.types";
import { QK } from "@/shared/config/queryKeys";

// ─── Raw data queries ─────────────────────────────────────────────────────────

function useLeads() {
  return useQuery({
    queryKey: QK.smartMapLeads,
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
    queryKey: QK.smartMapClients,
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

function useEmployeesForMap() {
  return useQuery({
    queryKey: QK.smartMapEmployees,
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
  const [markers,         setMarkers]         = useState<MapMarker[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(["all"]);
  const [isGeocoding,     setIsGeocoding]     = useState(false);

  const { data: leads     = [], isLoading: leadsLoading   } = useLeads();
  const { data: clients   = [], isLoading: clientsLoading } = useClients();
  const { data: employees = [], isLoading: empLoading     } = useEmployeesForMap();

  const geocodeCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  const isLoading = leadsLoading || clientsLoading || empLoading || isGeocoding;

  /** Toggle a filter; 'all' clears others; deselecting last non-all reverts to 'all'. */
  function toggleFilter(value: string) {
    setSelectedFilters((prev) => {
      if (value === "all") return ["all"];
      const without = prev.filter((f) => f !== "all");
      const next = without.includes(value)
        ? without.filter((f) => f !== value)
        : [...without, value];
      return next.length === 0 ? ["all"] : next;
    });
  }

  // Build and geocode markers whenever data or filter changes
  useEffect(() => {
    if (leadsLoading || clientsLoading || empLoading) return;

    const raw: MapMarker[] = [];
    const showAll   = selectedFilters.includes("all");
    const showLeads = showAll || selectedFilters.includes("leads");
    const showClients = showAll || selectedFilters.includes("clients");
    const showEmp   = showAll || selectedFilters.includes("employees");

    if (showLeads) {
      leads.forEach((l) => {
        const apt = l.apt_suite ? `, ${l.apt_suite}` : "";
        raw.push({
          id:      `lead-${l.id}`,
          name:    l.full_name,
          type:    "lead",
          address: `${l.address}${apt}, ${l.city}, ${l.state} ${l.zip_code}`,
          phone:   l.phone  ?? undefined,
          email:   l.email  ?? undefined,
        });
      });
    }

    if (showClients) {
      clients.forEach((c) => {
        const apt = c.service_apt ? ` ${c.service_apt}` : "";
        raw.push({
          id:      `client-${c.id}`,
          name:    c.full_name,
          type:    "client",
          address: `${c.service_street}${apt}, ${c.service_city}, ${c.service_state} ${c.service_zip}`,
          phone:   c.phone ?? undefined,
          email:   c.email ?? undefined,
        });
      });
    }

    if (showEmp) {
      employees.forEach((e) => {
        raw.push({
          id:      `employee-${e.id}`,
          name:    `${e.first_name} ${e.last_name}`,
          type:    "employee",
          address: `${e.street}, ${e.city}, ${e.state} ${e.zip}`,
          phone:   e.phone ?? undefined,
          email:   e.email ?? undefined,
        });
      });
    }

    if (!mapsLoaded || !google) {
      setMarkers(raw);
      return;
    }

    if (raw.length === 0) {
      setMarkers([]);
      setIsGeocoding(false);
      return;
    }

    const geocoder = new google.maps.Geocoder();
    setIsGeocoding(true);
    let pending = raw.length;
    const geocoded: MapMarker[] = [];

    raw.forEach((marker) => {
      const cached = geocodeCacheRef.current.get(marker.address);
      if (cached) {
        geocoded.push({ ...marker, lat: cached.lat, lng: cached.lng });
        if (--pending === 0) { setMarkers([...geocoded]); setIsGeocoding(false); }
        return;
      }
      geocoder.geocode({ address: marker.address }, (results: any, status: any) => {
        if (status === "OK" && results?.[0]) {
          const loc = results[0].geometry.location;
          const lat = loc.lat(), lng = loc.lng();
          geocodeCacheRef.current.set(marker.address, { lat, lng });
          geocoded.push({ ...marker, lat, lng });
        } else {
          geocoded.push(marker);
        }
        if (--pending === 0) { setMarkers([...geocoded]); setIsGeocoding(false); }
      });
    });
  }, [leads, clients, employees, selectedFilters, mapsLoaded, google, leadsLoading, clientsLoading, empLoading]);

  const counts = {
    leads:     leads.length,
    clients:   clients.length,
    employees: employees.length,
    total:     leads.length + clients.length + employees.length,
  };

  return { markers, isLoading, isGeocoding, selectedFilters, toggleFilter, counts };
}
