/**
 * Unauthenticated public reads go through SECURITY DEFINER RPCs so table SELECT
 * is not open to anon. Falls back to table queries only if the RPC is not deployed yet.
 */
import { supabase } from "@/integrations/supabase/client";

type RpcError = { code?: string; message?: string } | null;

function isMissingRpc(error: RpcError): boolean {
  if (!error) return false;
  return error.code === "PGRST202" || /could not find the function/i.test(error.message ?? "");
}

async function callRpc<T>(name: string, args: Record<string, unknown>): Promise<{ data: T | null; missing: boolean; error: RpcError }> {
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error && isMissingRpc(error)) return { data: null, missing: true, error };
  if (error) return { data: null, missing: false, error };
  return { data: (data as T) ?? null, missing: false, error: null };
}

export interface PublicCompanyProfile {
  first_name?: string | null;
  last_name?: string | null;
  company_name: string | null;
  company_logo: string | null;
  company_email: string | null;
  company_phone?: string | null;
  company_address?: string | null;
  company_apt_suite?: string | null;
  company_city?: string | null;
  company_state?: string | null;
  company_zip?: string | null;
}

export interface InvoiceMerchantProfile {
  company_name: string | null;
  company_logo: string | null;
  company_phone: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_completed: boolean | null;
}

export interface PublicBookingFormRow {
  form_type: string;
  custom_questions: unknown;
}

export async function getPublicCompanyProfile(userId: string): Promise<PublicCompanyProfile | null> {
  const { data, missing, error } = await callRpc<PublicCompanyProfile>("get_public_company_profile", {
    p_user_id: userId,
  });
  if (!missing) {
    if (error) throw error;
    return data;
  }

  const { data: row, error: fallbackError } = await supabase
    .from("profiles")
    .select(
      "first_name, last_name, company_name, company_logo, company_email, company_phone, company_address, company_apt_suite, company_city, company_state, company_zip",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (fallbackError) throw fallbackError;
  return row as PublicCompanyProfile | null;
}

export async function getPublicBookingForms(userId: string): Promise<PublicBookingFormRow[]> {
  const { data, missing, error } = await callRpc<PublicBookingFormRow[]>("get_public_booking_forms", {
    p_user_id: userId,
  });
  if (!missing) {
    if (error) throw error;
    return data ?? [];
  }

  const { data: rows, error: fallbackError } = await supabase
    .from("booking_forms")
    .select("form_type, custom_questions")
    .eq("user_id", userId);
  if (fallbackError) throw fallbackError;
  return (rows ?? []) as PublicBookingFormRow[];
}

export async function getPublicInvoice(token: string): Promise<Record<string, unknown> | null> {
  const { data, missing, error } = await callRpc<Record<string, unknown>>("get_public_invoice", {
    p_token: token,
  });
  if (!missing) {
    if (error) throw error;
    return data;
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
  let query = supabase.from("invoices").select("*").neq("status", "Draft");
  query = isUuid ? query.or(`payment_token.eq.${token},id.eq.${token}`) : query.eq("payment_token", token);
  const { data: row, error: fallbackError } = await query.maybeSingle();
  if (fallbackError) throw fallbackError;
  return row as Record<string, unknown> | null;
}

export async function getInvoiceMerchantProfile(token: string): Promise<InvoiceMerchantProfile | null> {
  const { data, missing, error } = await callRpc<InvoiceMerchantProfile>("get_invoice_merchant_profile", {
    p_token: token,
  });
  if (!missing) {
    if (error) throw error;
    return data;
  }

  const invoice = await getPublicInvoice(token);
  const userId = invoice?.user_id as string | undefined;
  if (!userId) return null;
  const { data: row, error: fallbackError } = await supabase
    .from("profiles")
    .select("company_name, company_logo, company_phone, stripe_account_id, stripe_onboarding_completed")
    .eq("user_id", userId)
    .maybeSingle();
  if (fallbackError) throw fallbackError;
  return row as InvoiceMerchantProfile | null;
}

export async function getPublicEstimate(token: string): Promise<Record<string, unknown> | null> {
  const { data, missing, error } = await callRpc<Record<string, unknown>>("get_public_estimate", {
    p_token: token,
  });
  if (!missing) {
    if (error) throw error;
    return data;
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
  let query = supabase.from("estimates").select("*");
  query = isUuid ? query.or(`public_share_token.eq.${token},id.eq.${token}`) : query.eq("public_share_token", token);
  const { data: row, error: fallbackError } = await query.maybeSingle();
  if (fallbackError) throw fallbackError;
  return row as Record<string, unknown> | null;
}

export async function getPublicContract(token: string): Promise<Record<string, unknown> | null> {
  const { data, missing, error } = await callRpc<Record<string, unknown>>("get_public_contract", {
    p_token: token,
  });
  if (!missing) {
    if (error) throw error;
    return data;
  }

  const { data: row, error: fallbackError } = await (supabase as any)
    .from("contracts")
    .select("*")
    .eq("public_share_token", token)
    .maybeSingle();
  if (fallbackError) throw fallbackError;
  return row as Record<string, unknown> | null;
}
