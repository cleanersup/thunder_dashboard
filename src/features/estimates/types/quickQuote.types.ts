/**
 * @module quickQuote.types
 * Fila de `public.quick_quotes`.
 *
 * La tabla no está en los tipos generados de Supabase, así que se declara aquí y
 * el servicio accede con `(supabase as any)` — misma convención que `jobs` y
 * `client_properties`.
 *
 * Un quick quote es un estimate residencial **sin cliente ni dirección**: en vez
 * de `client_id`/`client_name`/`address`… solo guarda a quién se le envió
 * (`recipient_*`). Todo lo demás — desglose, precios, costos internos, borrador,
 * share token, vistas, conversión a job — se comporta igual.
 */

/** Estados posibles. Texto libre en la tabla, igual que `estimates.status`. */
export type QuickQuoteStatus =
  | "Draft" | "Pending" | "Sent" | "Viewed"
  | "Accepted" | "Declined" | "Converted" | "Canceled";

/** Quién escribe cada estado: el backend algunos, el frontend el resto. */
export const QUICK_QUOTE_BACKEND_STATUSES: QuickQuoteStatus[] = ["Sent", "Viewed", "Converted"];

export interface QuickQuoteRow {
  id:         string;
  user_id:    string;

  recipient_name:  string | null;
  recipient_email: string | null;
  recipient_phone: string | null;

  service_type:     string;
  service_sub_type: string | null;
  service_scope:    string | null;

  main_data:        Record<string, unknown>;
  additional_data:  Record<string, unknown>;
  additional_items: unknown[];
  extra_services:   Record<string, boolean>;
  pets:             string | null;
  laundry:          string | null;

  discount_type:  string | null;
  discount_value: number | null;
  subtotal:       number;
  total:          number;

  // Solo internos — nunca viajan al destinatario.
  labor_cost:           number | null;
  supplies_cost:        number | null;
  overhead_cost:        number | null;
  total_operation_cost: number | null;

  status:     string;
  quote_date: string;
  is_draft:   boolean;

  current_step: number | null;
  draft_data:   Record<string, unknown> | null;

  public_share_token: string | null;
  viewed_at:          string | null;
  sent_at:            string | null;
  last_sent_channel:  "email" | "sms" | null;
  job_id:             string | null;

  created_at: string;
  updated_at: string;
}

/** Lo que el formulario manda al crear o actualizar. `user_id` lo pone el servicio. */
export type QuickQuoteInsert = Partial<Omit<QuickQuoteRow, "id" | "user_id" | "created_at" | "updated_at">>;
