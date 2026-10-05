/**
 * @module additionalData
 * Filtro de `additional_data` compartido por los paneles de detalle.
 *
 * `additional_data` mezcla dos cosas: los conteos de servicios adicionales que el
 * cliente pidió y metadatos del formulario (depósito, precio manual, propiedad).
 * Los metadatos tienen su propia sección o no se muestran, así que el volcado
 * genérico de "Additional Items" los excluye.
 */

const ADDITIONAL_ITEMS_EXCLUDED = new Set([
  "deposit_required",
  "deposit_type",
  "deposit_value",
  "use_custom_price",
  "custom_price",
  "propertyId",
]);

/**
 * Entradas de `additional_data` que son servicios adicionales con cantidad > 0.
 * @param data - El objeto `additional_data` tal como viene de la fila
 */
export function additionalItemEntries(
  data: Record<string, unknown> | null | undefined,
): Array<[string, number]> {
  if (!data) return [];
  return Object.entries(data)
    .filter(([key, value]) => !ADDITIONAL_ITEMS_EXCLUDED.has(key) && Number(value) > 0)
    .map(([key, value]) => [key, Number(value)] as [string, number]);
}
