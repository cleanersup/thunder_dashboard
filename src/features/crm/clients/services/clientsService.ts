import { supabase } from "@/integrations/supabase/client";
import type { Client, ClientInsert, ClientUpdate } from "../../types/crm.types";

export interface ClientWalletLink {
  url: string;
  token: string;
  expiresAt: string;
}

/**
 * Fetches all clients for the authenticated user, ordered by creation date descending.
 * @returns Array of client records
 * @throws Error if the Supabase query fails
 */
export async function fetchClients() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Client[];
}

/**
 * Fetches a single client by ID.
 * @param id - The client UUID
 * @returns The client record
 * @throws Error if not found or query fails
 */
export async function fetchClient(id: string) {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Client;
}

/**
 * Creates a new client record.
 * @param payload - Client insert payload (without id, user_id, created_at)
 * @returns The created client record
 * @throws Error if the insert fails
 */
export async function createClient(payload: Omit<ClientInsert, "user_id">) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...payload, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Updates an existing client record.
 * @param id - The client UUID
 * @param payload - Fields to update
 * @returns The updated client record
 * @throws Error if the update fails
 */
export async function updateClient(id: string, payload: ClientUpdate) {
  const { data, error } = await supabase
    .from("clients")
    .update({ ...(payload as Record<string, unknown>), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Client;
}

/**
 * Deletes a client record by ID.
 * @param id - The client UUID
 * @throws Error if the delete fails
 */
export async function deleteClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Finds a client by email address scoped to the given user.
 * @param userId - Owner user ID
 * @param email  - Email to search
 * @returns The client record, or null if not found
 */
export async function findClientByEmail(userId: string, email: string) {
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", userId)
    .eq("email", email)
    .limit(1)
    .maybeSingle();
  return (data as Client | null) ?? null;
}

/**
 * Issues a secure public wallet setup link for a CRM client.
 * Card details are collected by Stripe Checkout, never by the dashboard.
 */
export async function issueClientWalletLink(clientId: string): Promise<ClientWalletLink> {
  const { data, error } = await supabase.functions.invoke("client-wallet-issue-token", {
    body: { clientId },
  });

  if (error) throw error;
  if (!data?.url) throw new Error("Could not create payment setup link");

  return data as ClientWalletLink;
}

/**
 * Clears the default saved card snapshot for a client.
 */
export async function clearClientSavedCard(clientId: string): Promise<Client> {
  return updateClient(clientId, {
    stripe_default_payment_method_id: null,
    card_brand: null,
    card_last4: null,
    card_exp_month: null,
    card_exp_year: null,
  });
}
