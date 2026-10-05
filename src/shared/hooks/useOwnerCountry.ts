/**
 * @module useOwnerCountry
 * Punto de acceso de los formularios al país de operación del dueño.
 *
 * Todo control que antes dejaba elegir país (propiedades, empleados, Company
 * Info) y todo autocomplete de direcciones consume este hook. La resolución y
 * sus respaldos viven en `ownerCountry.service`.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { QK } from "@/shared/config/queryKeys";
import { countryLabel } from "@/shared/constants/countries";
import {
  DEFAULT_OWNER_COUNTRY,
  fetchOwnerCountry,
  ownerCountryFromSession,
} from "@/shared/services/ownerCountry.service";
import { useAuth } from "./useAuth";

export interface OwnerCountryState {
  /** ISO alpha-2 en minúsculas, listo para Google Places y las reglas por país. */
  country:     string;
  /** Nombre del país para mostrar. */
  countryName: string;
  /** `true` mientras no se sabe el país — los formularios siguen usables igual. */
  isLoading:   boolean;
}

/**
 * Devuelve el país del dueño.
 *
 * @example
 * const { country } = useOwnerCountry();
 * <AddressAutocomplete country={country} … />
 */
export function useOwnerCountry(): OwnerCountryState {
  const { session, isLoading: authLoading } = useAuth();

  const fromSession = useMemo(() => ownerCountryFromSession(session), [session]);

  // Solo se consulta al backend si el claim no venía en la sesión.
  const needsFetch = !authLoading && !!session && !fromSession;
  const { data: fetched, isLoading: fetching } = useQuery({
    queryKey:             QK.ownerCountry,
    queryFn:              fetchOwnerCountry,
    enabled:              needsFetch,
    staleTime:            Infinity,
    gcTime:               Infinity,
    retry:                false,
    refetchOnWindowFocus: false,
  });

  const resolved = fromSession ?? fetched ?? null;

  return {
    country:     resolved?.code ?? DEFAULT_OWNER_COUNTRY,
    countryName: countryLabel(resolved?.code ?? DEFAULT_OWNER_COUNTRY, resolved?.name),
    isLoading:   authLoading || (needsFetch && fetching),
  };
}
