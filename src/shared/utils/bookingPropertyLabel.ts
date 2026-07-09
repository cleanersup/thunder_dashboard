import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";

export type BookingPropertyLabel = {
  title: string;
  isPrimary: boolean;
};

export function formatPropertyTitle(title: string | null | undefined, isPrimary: boolean): string {
  const trimmed = title?.trim();
  if (trimmed) return trimmed;
  return isPrimary ? "Primary property" : "Address";
}

export function matchClientProperty(
  properties: ClientProperty[],
  opts: {
    clientPropertyId?: string | null;
    street?: string | null;
    city?: string | null;
    zip?: string | null;
  },
): ClientProperty | undefined {
  if (opts.clientPropertyId) {
    return properties.find((p) => p.id === opts.clientPropertyId);
  }

  const street = (opts.street ?? "").trim().toLowerCase();
  const city = (opts.city ?? "").trim().toLowerCase();
  const zip = (opts.zip ?? "").trim();
  if (!street) return undefined;

  return properties.find(
    (p) =>
      p.street.trim().toLowerCase() === street &&
      p.city.trim().toLowerCase() === city &&
      p.zip_code.trim() === zip,
  );
}

export function labelFromClientProperty(
  property: ClientProperty | null | undefined,
): BookingPropertyLabel | null {
  if (!property) return null;
  return {
    title: formatPropertyTitle(property.title, property.is_primary),
    isPrimary: property.is_primary,
  };
}
