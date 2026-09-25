/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module quickQuoteService
 * Acceso a `public.quick_quotes` y a sus edge functions.
 *
 * El RLS es solo-dueño para las cuatro operaciones, así que el CRUD son llamadas
 * normales de PostgREST — no hay RPC propio. Los anónimos sí necesitan RPC
 * (`get_public_quick_quote`), pero esa página vive en swift-slate, que es la app
 * a la que apunta el link del correo.
 *
 * La tabla no está en los tipos generados: se accede con `(supabase as any)`,
 * igual que `jobs` y `client_properties`.
 */
import { supabase } from "@/integrations/supabase/client";
import { generateInvoiceNumber } from "@/features/invoices/services/invoicesService";
import type { QuickQuoteInsert, QuickQuoteRow } from "../types/quickQuote.types";

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Lista los quick quotes del usuario autenticado, del más nuevo al más viejo.
 * @throws Si la consulta falla o no hay sesión
 */
export async function fetchQuickQuotes(): Promise<QuickQuoteRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await (supabase as any)
    .from("quick_quotes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as QuickQuoteRow[];
}

/**
 * Lee un quick quote por id.
 * @param id - UUID del quote
 */
export async function fetchQuickQuote(id: string): Promise<QuickQuoteRow | null> {
  const { data, error } = await (supabase as any)
    .from("quick_quotes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as QuickQuoteRow | null;
}

/**
 * Crea un quick quote. `user_id` se inyecta aquí.
 * @param payload - Campos del quote; todos opcionales salvo por los defaults de la tabla
 */
export async function createQuickQuote(payload: QuickQuoteInsert): Promise<QuickQuoteRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await (supabase as any)
    .from("quick_quotes")
    .insert({ ...payload, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data as QuickQuoteRow;
}

/**
 * Actualiza un quick quote. `updated_at` lo mantiene un trigger de la tabla.
 * @param id     - UUID del quote
 * @param update - Campos a modificar
 */
export async function updateQuickQuote(id: string, update: QuickQuoteInsert): Promise<QuickQuoteRow> {
  const { data, error } = await (supabase as any)
    .from("quick_quotes")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as QuickQuoteRow;
}

/**
 * Cambia solo el status.
 * @param id     - UUID del quote
 * @param status - Nuevo status
 */
export async function updateQuickQuoteStatus(id: string, status: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("quick_quotes")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Borra un quick quote. A diferencia de `estimates`, aquí el borrado es real:
 * la tabla no tiene status "Deleted" y un job vinculado sobrevive con
 * `quick_quote_id` en NULL.
 * @param id - UUID del quote
 */
export async function deleteQuickQuote(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("quick_quotes")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ─── Envío ────────────────────────────────────────────────────────────────────

export interface SendQuickQuoteEmailParams {
  quickQuoteId:   string;
  recipientEmail: string;
  recipientName?: string;
  isUpdate?:      boolean;
}

/**
 * Envía el quick quote por email.
 *
 * La función recarga el quote del lado del servidor, así que el correo siempre
 * refleja lo guardado: hay que persistir ANTES de llamar. Ella misma escribe
 * `sent_at`, `last_sent_channel`, `recipient_email` y pasa el status a `Sent`.
 */
export async function sendQuickQuoteEmail(params: SendQuickQuoteEmailParams) {
  const { data, error } = await supabase.functions.invoke("send-quick-quote-email", {
    body: {
      quickQuoteId:   params.quickQuoteId,
      recipientEmail: params.recipientEmail.trim().toLowerCase(),
      recipientName:  params.recipientName,
      isUpdate:       params.isUpdate ?? false,
    },
  });
  if (error) throw error;
  return data as { success: boolean; recipient: string; ownerCopied: boolean; quoteUrl?: string };
}

export interface SendQuickQuoteSMSParams {
  quickQuoteId:   string;
  phoneNumber:    string;
  recipientName?: string;
  quoteTotal?:    number;
  isUpdate?:      boolean;
}

/**
 * Envía el quick quote por SMS. Los números se normalizan a `+1…` en el backend.
 */
export async function sendQuickQuoteSMS(params: SendQuickQuoteSMSParams) {
  const { data, error } = await supabase.functions.invoke("send-quick-quote-sms", {
    body: {
      quickQuoteId:  params.quickQuoteId,
      phoneNumber:   params.phoneNumber,
      recipientName: params.recipientName,
      quoteTotal:    params.quoteTotal,
      isUpdate:      params.isUpdate ?? false,
    },
  });
  if (error) throw error;
  return data as { success: boolean; messageSid?: string; quoteUrl?: string };
}

// ─── Conversión a job ─────────────────────────────────────────────────────────

/** Llaves que devuelve el prefill pero NO son columnas de `jobs`. */
const PREFILL_NON_JOB_KEYS = [
  "quick_quote_id", "main_data", "additional_data", "additional_items",
  "extra_services", "pets", "laundry",
] as const;

/**
 * Pide al backend el payload del job ya mapeado desde el quote.
 * @param quickQuoteId - UUID del quote
 */
export async function fetchQuickQuoteJobPrefill(quickQuoteId: string): Promise<Record<string, unknown>> {
  const { data, error } = await (supabase as any).rpc("get_quick_quote_job_prefill", {
    p_quick_quote_id: quickQuoteId,
  });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

// ─── Cliente del destinatario ─────────────────────────────────────────────────

export interface QuickQuoteClientInput {
  fullName: string;
  email:    string;
  phone:    string;
  street:   string;
  apt:      string;
  city:     string;
  state:    string;
  zip:      string;
}

/** Coincidencia por email (case-insensitive), la más fiable. */
async function findClientByEmail(email: string, userId: string): Promise<string | null> {
  if (!email.trim()) return null;
  const { data } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .ilike("email", email.trim())
    .order("updated_at", { ascending: false })
    .limit(1);
  return data?.[0]?.id ?? null;
}

/** Respaldo cuando el quote se envió por SMS y no hay email. */
async function findClientByNamePhone(name: string, phone: string, userId: string): Promise<string | null> {
  const digits = phone.replace(/\D/g, "");
  if (!name.trim() || !digits) return null;
  const { data } = await supabase
    .from("clients")
    .select("id, phone")
    .eq("user_id", userId)
    .ilike("full_name", name.trim())
    .order("updated_at", { ascending: false });
  // El teléfono se guarda con formatos históricos distintos: se compara por dígitos.
  return (data ?? []).find((c) => (c.phone ?? "").replace(/\D/g, "") === digits)?.id ?? null;
}

/**
 * Resuelve el cliente del destinatario de un quick quote: reutiliza el que ya
 * exista o crea uno nuevo.
 *
 * Mismo orden que `resolveOrCreateContact` en la conversión de requests — email,
 * luego nombre+teléfono, luego crear — porque es la misma pregunta y debe
 * responderse igual en las dos conversiones.
 *
 * @returns El id del cliente y si se reutilizó uno existente
 */
export async function resolveQuickQuoteClient(
  input: QuickQuoteClientInput,
): Promise<{ clientId: string; reusedExisting: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  let clientId = await findClientByEmail(input.email, user.id);
  if (!clientId) clientId = await findClientByNamePhone(input.fullName, input.phone, user.id);
  if (clientId) return { clientId, reusedExisting: true };

  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id:            user.id,
      full_name:          input.fullName,
      email:              input.email,
      phone:              input.phone,
      service_street:     input.street,
      service_apt:        input.apt || null,
      service_city:       input.city,
      service_state:      input.state,
      service_zip:        input.zip,
      // Sin dirección de facturación propia: se copia la de servicio, igual que
      // `createClientFromRequest` y `convertLeadToClient`.
      billing_street:     input.street,
      billing_apt:        input.apt || null,
      billing_city:       input.city,
      billing_state:      input.state,
      billing_zip:        input.zip,
      client_type:        "residential",
      contact_preference: input.email ? "email" : "phone",
      status:             "active",
    })
    .select("id")
    .single();
  if (error) throw error;
  return { clientId: data.id, reusedExisting: false };
}

export interface ConvertQuickQuoteToJobInput {
  quickQuoteId: string;
  /** Cliente y propiedad que el quote no tenía — los resuelve el formulario de conversión. */
  jobOverrides: Record<string, unknown>;
}

/**
 * Convierte un quick quote en job: prefill → insert → RPC de finalización.
 *
 * Mismo orden y mismo rollback que estimate→job: si la finalización falla, el job
 * recién creado se borra, porque quedaría huérfano y sin vínculo con su origen.
 * @returns El id del job creado
 */
export async function convertQuickQuoteToJob({
  quickQuoteId, jobOverrides,
}: ConvertQuickQuoteToJobInput): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const prefill = await fetchQuickQuoteJobPrefill(quickQuoteId);

  // El prefill trae datos del desglose que `jobs` no tiene como columnas; el
  // insert falla si se mandan tal cual.
  const jobPayload: Record<string, unknown> = { ...prefill };
  for (const key of PREFILL_NON_JOB_KEYS) delete jobPayload[key];

  const { data: job, error: jobError } = await (supabase as any)
    .from("jobs")
    .insert({
      ...jobPayload,
      ...jobOverrides,
      user_id:        user.id,
      quick_quote_id: quickQuoteId,
    })
    .select("id")
    .single();
  if (jobError) throw jobError;

  const { error: rpcError } = await (supabase as any).rpc("finalize_quick_quote_to_job_conversion", {
    p_quick_quote_id: quickQuoteId,
    p_job_id:         job.id,
  });
  if (rpcError) {
    await (supabase as any).from("jobs").delete().eq("id", job.id);
    throw rpcError;
  }

  return job.id as string;
}

export interface ConvertQuickQuoteToInvoiceInput {
  quickQuoteId: string;
  client: {
    name:    string;
    email:   string;
    phone:   string;
    street:  string;
    apt:     string;
    city:    string;
    state:   string;
    zip:     string;
  };
}

/**
 * Convierte un quick quote en invoice: prefill → insert → RPC de finalización.
 * El quote no tiene cliente ni dirección; esos campos los pone el formulario.
 * @returns El id de la invoice creada, o el de la que ya estaba vinculada
 */
export async function convertQuickQuoteToInvoice({
  quickQuoteId, client,
}: ConvertQuickQuoteToInvoiceInput): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const existing = await fetchQuickQuote(quickQuoteId);
  if (existing?.invoice_id) return existing.invoice_id;

  const { data: prefill, error: prefillError } = await (supabase as any).rpc(
    "get_quick_quote_invoice_prefill",
    { p_quick_quote_id: quickQuoteId },
  );
  if (prefillError) throw prefillError;

  const invoiceNumber = await generateInvoiceNumber();
  const { data: invoice, error: insertError } = await (supabase as any)
    .from("invoices")
    .insert({
      user_id:        user.id,
      invoice_number: invoiceNumber,
      invoice_name:   prefill?.invoice_name ?? null,
      invoice_date:   prefill?.invoice_date,
      due_date:       prefill?.due_date,
      service_type:   prefill?.service_type || "Single Payment",
      status:         "Draft",
      client_name:    client.name,
      email:          client.email,
      phone:          client.phone,
      address:        client.street,
      apt:            client.apt || null,
      city:           client.city,
      state:          client.state,
      zip:            client.zip,
      line_items:     prefill?.line_items ?? [],
      discount_type:  prefill?.discount_type ?? null,
      discount_value: prefill?.discount_value ?? null,
      tax_rate:       prefill?.tax_rate ?? null,
      total:          prefill?.total ?? 0,
      notes:          prefill?.notes ?? null,
      quick_quote_id: quickQuoteId,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  const { error: rpcError } = await (supabase as any).rpc(
    "finalize_quick_quote_to_invoice_conversion",
    { p_quick_quote_id: quickQuoteId, p_invoice_id: invoice.id },
  );
  if (rpcError) {
    await (supabase as any).from("invoices").delete().eq("id", invoice.id);
    throw rpcError;
  }

  return invoice.id as string;
}
