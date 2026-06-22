/**
 * ISO 3166-1 alpha-2 country codes for address autocomplete.
 * Used by Google Places API componentRestrictions and country dropdowns.
 * Mirrors swift-slate/src/lib/countries.ts (COUNTRY_OPTIONS).
 */
export const COUNTRY_OPTIONS = [
  { value: "us", label: "United States" },
  { value: "ca", label: "Canada" },
  { value: "mx", label: "Mexico" },
  { value: "gb", label: "United Kingdom" },
  { value: "au", label: "Australia" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "es", label: "Spain" },
  { value: "it", label: "Italy" },
  { value: "nl", label: "Netherlands" },
  { value: "br", label: "Brazil" },
  { value: "ar", label: "Argentina" },
  { value: "co", label: "Colombia" },
  { value: "cl", label: "Chile" },
  { value: "pe", label: "Peru" },
  { value: "ec", label: "Ecuador" },
  { value: "ie", label: "Ireland" },
  { value: "nz", label: "New Zealand" },
  { value: "jp", label: "Japan" },
  { value: "in", label: "India" },
  { value: "all", label: "All countries" },
] as const;
