/**
 * @module cssColor
 * Convierte un color del tema en uno que se pueda escribir fuera del documento.
 *
 * Los tokens del proyecto son `hsl(var(--destructive))`: el navegador los
 * resuelve porque la variable vive en `:root`. Pero un SVG serializado a
 * `data:` URI (la chincheta del mapa) o un lienzo no ven esas variables, así que
 * `var(--destructive)` se queda sin valor y el color acaba en negro.
 *
 * Esto pregunta al propio navegador a qué equivale el token ahora mismo.
 */

/**
 * @param value - Color CSS, con o sin `var()`.
 * @returns El mismo valor si no depende de variables; si depende, su `rgb(...)`.
 */
export function resolveCssColor(value: string): string {
  if (!value.includes("var(")) return value;
  if (typeof document === "undefined") return value;

  // No se cachea a propósito: el valor de un token cambia si cambia el tema, y
  // son un puñado de llamadas por render.
  const probe = document.createElement("span");
  probe.style.display = "none";
  probe.style.color = value;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();

  return resolved || value;
}
