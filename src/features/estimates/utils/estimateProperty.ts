import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";

/**
 * Reads the persisted `propertyId` from an estimate's `additional_data` JSON.
 * Mirrors swift-slate's storage location (estimates have no dedicated column).
 */
export function getEstimatePropertyId(additionalData: unknown): string | null {
  const id = (additionalData as Record<string, unknown> | null | undefined)?.propertyId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/** Address fields derived from a selected client property — used to override the estimate address. */
export interface EstimatePropertyAddress {
  address: string;
  apt:     string;
  city:    string;
  state:   string;
  zip:     string;
}

export function propertyToEstimateAddress(property: ClientProperty): EstimatePropertyAddress {
  return {
    address: property.street,
    apt:     property.apt_suite ?? "",
    city:    property.city,
    state:   property.state,
    zip:     property.zip_code,
  };
}
