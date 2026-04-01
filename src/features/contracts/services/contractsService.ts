/**
 * @module contractsService
 * CRUD operations for the contracts table via Supabase.
 *
 * NOTE: The `contracts` table is not yet in the generated Supabase types.
 * Until the DB migration runs and types are regenerated, we cast through
 * `unknown` to avoid TS2352 errors on the Supabase client calls.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Contract, ContractFilters, ContractFormData, ContractKPIs } from "../types/contract.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function generateContractNumber(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `CTR-${yy}${mm}-`;

  const { data, error } = await db
    .from("contracts")
    .select("contract_number")
    .like("contract_number", `${prefix}%`)
    .order("contract_number", { ascending: false })
    .limit(1);

  if (error) throw error;

  let nextNum = 1;
  if (data && data.length > 0) {
    const last = data[0].contract_number as string;
    const parts = last.split("-");
    nextNum = parseInt(parts[2] ?? "0", 10) + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function fetchContracts(filters?: ContractFilters): Promise<Contract[]> {
  let query = db
    .from("contracts")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.search) {
    query = query.or(
      `recipient_name.ilike.%${filters.search}%,contract_number.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Contract[];
}

export async function fetchContractById(id: string): Promise<Contract> {
  const { data, error } = await db
    .from("contracts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Contract;
}

export async function fetchContractByToken(token: string): Promise<Contract> {
  const { data, error } = await db
    .from("contracts")
    .select("*")
    .eq("public_share_token", token)
    .single();

  if (error) throw error;
  return data as Contract;
}

export async function fetchContractKPIs(): Promise<ContractKPIs> {
  const { data, error } = await db
    .from("contracts")
    .select("status");

  if (error) throw error;

  const rows = (data ?? []) as { status: string }[];
  return {
    active:   rows.filter((r) => r.status === "Active").length,
    pending:  rows.filter((r) => r.status === "Pending").length,
    expiring: rows.filter((r) => r.status === "Expiring").length,
    expired:  rows.filter((r) => r.status === "Expired").length,
  };
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createContract(
  userId: string,
  data: ContractFormData
): Promise<Contract> {
  const contractNumber = await generateContractNumber();

  const payload = {
    user_id: userId,
    contract_number: contractNumber,
    recipient_name: data.recipient_name,
    recipient_email: data.recipient_email || null,
    recipient_phone: data.recipient_phone || null,
    recipient_address: data.recipient_address || null,
    recipient_id: data.recipient_id || null,
    start_date: data.start_date,
    end_date: data.end_date,
    who_we_are: data.who_we_are || null,
    why_choose_us: data.why_choose_us || null,
    our_services: data.our_services || null,
    service_coverage: data.service_coverage || null,
    sections: data.sections,
    total: parseFloat(data.total) || 0,
    payment_frequency: data.payment_frequency,
    status: "Draft",
    delivery_method: data.delivery_method,
  };

  const { data: created, error } = await db
    .from("contracts")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return created as Contract;
}

export async function updateContract(
  id: string,
  data: Partial<ContractFormData>
): Promise<Contract> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if ("recipient_name" in data)    payload.recipient_name    = data.recipient_name;
  if ("recipient_email" in data)   payload.recipient_email   = data.recipient_email || null;
  if ("recipient_phone" in data)   payload.recipient_phone   = data.recipient_phone || null;
  if ("recipient_address" in data) payload.recipient_address = data.recipient_address || null;
  if ("recipient_id" in data)      payload.recipient_id      = data.recipient_id || null;
  if ("start_date" in data)        payload.start_date        = data.start_date;
  if ("end_date" in data)          payload.end_date          = data.end_date;
  if ("total" in data)             payload.total             = parseFloat(data.total!) || 0;
  if ("payment_frequency" in data) payload.payment_frequency = data.payment_frequency;
  if ("who_we_are" in data)        payload.who_we_are        = data.who_we_are || null;
  if ("why_choose_us" in data)     payload.why_choose_us     = data.why_choose_us || null;
  if ("our_services" in data)      payload.our_services      = data.our_services || null;
  if ("service_coverage" in data)  payload.service_coverage  = data.service_coverage || null;
  if ("sections" in data)          payload.sections          = data.sections;
  if ("delivery_method" in data)   payload.delivery_method   = data.delivery_method;

  const { data: updated, error } = await db
    .from("contracts")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return updated as Contract;
}

export async function deleteContract(id: string): Promise<void> {
  const { error } = await db.from("contracts").delete().eq("id", id);
  if (error) throw error;
}

export async function renewContract(
  originalId: string,
  newStartDate: string,
  newEndDate: string
): Promise<Contract> {
  const original = await fetchContractById(originalId);
  const contractNumber = await generateContractNumber();

  const payload = {
    user_id: original.user_id,
    contract_number: contractNumber,
    recipient_name: original.recipient_name,
    recipient_email: original.recipient_email,
    recipient_phone: original.recipient_phone,
    recipient_address: original.recipient_address,
    start_date: newStartDate,
    end_date: newEndDate,
    who_we_are: original.who_we_are,
    why_choose_us: original.why_choose_us,
    our_services: original.our_services,
    service_coverage: original.service_coverage,
    sections: original.sections,
    total: original.total,
    payment_frequency: original.payment_frequency,
    status: "Draft",
    delivery_method: original.delivery_method,
  };

  const { data: created, error: createError } = await db
    .from("contracts")
    .insert(payload)
    .select()
    .single();
  if (createError) throw createError;

  await db
    .from("contracts")
    .update({ renewed_at: new Date().toISOString() })
    .eq("id", originalId);

  return created as Contract;
}

export async function updateContractStatus(
  id: string,
  status: string
): Promise<void> {
  const { error } = await db
    .from("contracts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function acceptContract(token: string): Promise<void> {
  const { error } = await db
    .from("contracts")
    .update({ status: "Active" })
    .eq("public_share_token", token);
  if (error) throw error;
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export interface ContractOwnerProfile {
  company_name:    string | null;
  company_logo:    string | null;
  company_email:   string | null;
  company_phone:   string | null;
  company_address: string | null;
  company_city:    string | null;
  company_state:   string | null;
  company_zip:     string | null;
}

export async function fetchContractOwnerProfile(userId: string): Promise<ContractOwnerProfile | null> {
  const { data, error } = await db
    .from("profiles")
    .select("company_name, company_logo, company_email, company_phone, company_address, company_city, company_state, company_zip")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as ContractOwnerProfile | null;
}
