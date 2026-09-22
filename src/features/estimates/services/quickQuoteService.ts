/**
 * @module quickQuoteService
 * Resolución del cliente de un quick quote.
 *
 * Un quick quote se envía sin cliente. Cuando la persona acepta y hay que
 * convertirlo en job o contrato, aquí se resuelve el cliente: se reutiliza el que
 * ya exista o se crea uno nuevo, y el estimate queda enlazado con la dirección
 * real en lugar de la que nunca se pidió.
 *
 * El orden de resolución replica `resolveOrCreateContact` (requests): email →
 * nombre + teléfono → crear. Es la misma pregunta ("¿ya tengo a esta persona?")
 * y debe responderse igual en las dos conversiones.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ResolveQuickQuoteClientInput {
  estimateId: string;
  fullName:   string;
  email:      string;
  phone:      string;
  street:     string;
  apt:        string;
  city:       string;
  state:      string;
  zip:        string;
}

export interface ResolveQuickQuoteClientResult {
  clientId:       string;
  /** true cuando se enlazó a un cliente que ya existía en la cartera. */
  reusedExisting: boolean;
  /** Los campos que quedaron en la fila del estimate, para seguir la conversión sin recargar. */
  estimateFields: {
    client_id:   string;
    client_name: string;
    email:       string;
    phone:       string;
    address:     string;
    apt:         string | null;
    city:        string;
    state:       string;
    zip:         string;
  };
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

/** Respaldo cuando el quick quote se envió por SMS y no hay email. */
async function findClientByNamePhone(name: string, phone: string, userId: string): Promise<string | null> {
  const digits = phone.replace(/\D/g, "");
  if (!name.trim() || !digits) return null;
  const { data } = await supabase
    .from("clients")
    .select("id, phone")
    .eq("user_id", userId)
    .ilike("full_name", name.trim())
    .order("updated_at", { ascending: false });
  // El teléfono se guarda formateado y con formatos históricos distintos, así que
  // la comparación es por dígitos, no por texto.
  const match = (data ?? []).find((c) => (c.phone ?? "").replace(/\D/g, "") === digits);
  return match?.id ?? null;
}

async function createClient(input: ResolveQuickQuoteClientInput, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id:            userId,
      full_name:          input.fullName,
      email:              input.email,
      phone:              input.phone,
      service_street:     input.street,
      service_apt:        input.apt || null,
      service_city:       input.city,
      service_state:      input.state,
      service_zip:        input.zip,
      // Sin dirección de facturación propia: se copia la de servicio, igual que
      // hace `createClientFromRequest` y `convertLeadToClient`.
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
  return data.id;
}

/**
 * Resuelve (o crea) el cliente de un quick quote y enlaza el estimate.
 * @param input - Datos confirmados por el usuario en el panel de conversión
 */
export async function resolveQuickQuoteClient(
  input: ResolveQuickQuoteClientInput,
): Promise<ResolveQuickQuoteClientResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  let clientId = await findClientByEmail(input.email, user.id);
  if (!clientId) clientId = await findClientByNamePhone(input.fullName, input.phone, user.id);
  const reusedExisting = !!clientId;
  if (!clientId) clientId = await createClient(input, user.id);

  const estimateFields = {
    client_id:   clientId,
    client_name: input.fullName,
    email:       input.email,
    phone:       input.phone.replace(/\D/g, ""),
    address:     input.street,
    apt:         input.apt || null,
    city:        input.city,
    state:       input.state,
    zip:         input.zip,
  };

  const { error } = await supabase
    .from("estimates")
    .update({ ...estimateFields, updated_at: new Date().toISOString() })
    .eq("id", input.estimateId);
  if (error) throw error;

  return { clientId, reusedExisting, estimateFields };
}
