import { supabase } from "@/integrations/supabase/client";

export interface ClientWalletCard {
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
}

export interface ClientWalletPayload {
  companyName: string | null;
  companyLogo: string | null;
  client: { fullName: string; company: string | null; email: string };
  cards: ClientWalletCard[];
  stripeReady: boolean;
}

/**
 * Public: load wallet data for a link token (no auth).
 */
export async function fetchClientWalletPublic(token: string): Promise<ClientWalletPayload> {
  const { data, error } = await supabase.functions.invoke("client-wallet-get", {
    body: { token },
  });
  if (error) throw new Error(error.message);
  const body = data as { error?: string } & Partial<ClientWalletPayload> | null;
  if (body && typeof body === "object" && body.error) {
    throw new Error(body.error);
  }
  return data as ClientWalletPayload;
}

/**
 * Public: start Stripe Setup Checkout to add or replace the card on file.
 */
export async function createClientWalletSetupCheckout(token: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("client-wallet-setup-checkout", {
    body: { token },
  });
  if (error) throw new Error(error.message);
  const body = data as { error?: string; url?: string } | null;
  if (body?.error) throw new Error(body.error);
  if (!body?.url) throw new Error("No Checkout URL returned");
  return body.url;
}

/**
 * Merchant: issue a new wallet link for a CRM client (copied to clipboard by caller).
 */
export async function issueClientWalletLink(clientId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("client-wallet-issue-token", {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: { clientId },
  });
  if (error) throw new Error(error.message);
  const body = data as { error?: string; url?: string } | null;
  if (body?.error) throw new Error(body.error);
  if (!body?.url) throw new Error("No URL returned");
  return body.url;
}
