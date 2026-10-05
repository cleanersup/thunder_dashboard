import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";

export interface AddressMatchInput {
  street?: string | null;
  city?:   string | null;
  zip?:    string | null;
}

/**
 * Encuentra la propiedad del cliente que corresponde a una dirección guardada.
 *
 * Jobs, requests y estimates guardan la dirección **copiada** (calle, ciudad,
 * código postal), no el id de la propiedad — y donde sí hay FK no es de fiar: un
 * trigger del backend la normaliza a la propiedad primaria. La dirección, en
 * cambio, se copia tal cual de la propiedad que el usuario eligió, así que es lo
 * que permite volver a señalarla al reabrir el formulario.
 *
 * @param properties - Propiedades del cliente
 * @param address    - Dirección tal como quedó guardada en el registro
 * @returns La propiedad que coincide, o `undefined`
 */
export function matchPropertyByAddress(
  properties: ClientProperty[],
  address: AddressMatchInput,
): ClientProperty | undefined {
  const norm = (v: string | null | undefined) => (v ?? "").toLowerCase().trim();

  const street = norm(address.street);
  const city   = norm(address.city);
  const zip    = norm(address.zip);
  if (!street && !city && !zip) return undefined;

  return properties.find(
    (p) => norm(p.street) === street && norm(p.city) === city && norm(p.zip_code) === zip,
  );
}
