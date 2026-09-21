import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";

/** Etiqueta de una propiedad: el título si lo tiene, si no la calle. */
export function formatPropertyLabel(p: ClientProperty): string {
  return p.title ? `${p.title} — ${p.street}` : p.street;
}
