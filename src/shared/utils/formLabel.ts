/**
 * @module formLabel
 * Cómo se marca un campo obligatorio en TODA la app.
 *
 * Una sola forma: un asterisco al final del texto guía del **campo** (placeholder o
 * etiqueta flotante). Nunca en el título de la sección — una sección suele mezclar
 * campos obligatorios y opcionales, así que marcarla entera es ambiguo.
 *
 * Los formularios no concatenan `" *"` a mano: pasan `required` a la molécula y ella
 * llama a este helper, para que el día que cambie la convención cambie en un solo sitio.
 */
export function withRequiredMark(label: string, required?: boolean): string {
  return required ? `${label} *` : label;
}
