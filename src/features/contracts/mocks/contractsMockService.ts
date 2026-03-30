/**
 * @module contractsMockService
 * Mock service for contracts — used when VITE_USE_CONTRACT_MOCKS=true.
 * Mirrors the API of contractsService.ts.
 */
import type { Contract, ContractFilters, ContractFormData, ContractKPIs } from "../types/contract.types";
import { CONTRACT_MOCKS } from "./contractMocks";

// In-memory store (clone to allow mutations in dev session)
let store: Contract[] = JSON.parse(JSON.stringify(CONTRACT_MOCKS));

function delay(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function fetchContractsMock(filters?: ContractFilters): Promise<Contract[]> {
  await delay();
  let result = [...store];

  if (filters?.status && filters.status !== "all") {
    result = result.filter((c) => c.status === filters.status);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (c) =>
        c.recipient_name.toLowerCase().includes(q) ||
        c.contract_number.toLowerCase().includes(q)
    );
  }
  return result.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function fetchContractByIdMock(id: string): Promise<Contract> {
  await delay(200);
  const contract = store.find((c) => c.id === id);
  if (!contract) throw new Error(`Contract ${id} not found`);
  return { ...contract };
}

export async function fetchContractByTokenMock(token: string): Promise<Contract> {
  await delay(200);
  const contract = store.find((c) => c.accept_token === token);
  if (!contract) throw new Error("Contract not found or already accepted");
  return { ...contract };
}

export async function fetchContractKPIsMock(): Promise<ContractKPIs> {
  await delay(200);
  return {
    active:   store.filter((c) => c.status === "Active").length,
    pending:  store.filter((c) => c.status === "Pending").length,
    expiring: store.filter((c) => c.status === "Expiring").length,
    expired:  store.filter((c) => c.status === "Expired").length,
  };
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createContractMock(data: ContractFormData): Promise<Contract> {
  await delay();
  const now = new Date().toISOString();
  const num = `CTR-${now.slice(2, 4)}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(store.length + 1).padStart(3, "0")}`;

  const newContract: Contract = {
    id: `mock-contract-${Date.now()}`,
    user_id: "mock-user",
    contract_number: num,
    recipient_name: data.recipient_name,
    recipient_email: data.recipient_email || null,
    recipient_phone: data.recipient_phone || null,
    recipient_address: data.recipient_address || null,
    recipient_type: data.recipient_type,
    recipient_id: data.recipient_id ?? null,
    start_date: data.start_date,
    end_date: data.end_date,
    created_at: now,
    updated_at: now,
    sent_at: null,
    accepted_at: null,
    renewed_at: null,
    who_we_are: data.who_we_are || null,
    why_choose_us: data.why_choose_us || null,
    our_services: data.our_services || null,
    service_coverage: data.service_coverage || null,
    sections: data.sections,
    custom_clause_titles: null,
    total: parseFloat(data.total) || 0,
    payment_frequency: data.payment_frequency,
    status: "Draft",
    delivery_method: data.delivery_method ?? "email",
    accept_token: null,
    accepted_ip: null,
  };

  store = [newContract, ...store];
  return { ...newContract };
}

export async function updateContractMock(id: string, data: Partial<ContractFormData>): Promise<Contract> {
  await delay();
  const idx = store.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error(`Contract ${id} not found`);

  const updated: Contract = {
    ...store[idx],
    ...("recipient_name" in data && { recipient_name: data.recipient_name! }),
    ...("recipient_email" in data && { recipient_email: data.recipient_email || null }),
    ...("recipient_phone" in data && { recipient_phone: data.recipient_phone || null }),
    ...("recipient_address" in data && { recipient_address: data.recipient_address || null }),
    ...("recipient_type" in data && { recipient_type: data.recipient_type! }),
    ...("recipient_id" in data && { recipient_id: data.recipient_id ?? null }),
    ...("start_date" in data && { start_date: data.start_date! }),
    ...("end_date" in data && { end_date: data.end_date! }),
    ...("total" in data && { total: parseFloat(data.total!) || 0 }),
    ...("payment_frequency" in data && { payment_frequency: data.payment_frequency! }),
    ...("who_we_are" in data && { who_we_are: data.who_we_are || null }),
    ...("why_choose_us" in data && { why_choose_us: data.why_choose_us || null }),
    ...("our_services" in data && { our_services: data.our_services || null }),
    ...("service_coverage" in data && { service_coverage: data.service_coverage || null }),
    ...("sections" in data && { sections: data.sections! }),
    ...("delivery_method" in data && { delivery_method: data.delivery_method! }),
    updated_at: new Date().toISOString(),
  };

  store[idx] = updated;
  return { ...updated };
}

export async function deleteContractMock(id: string): Promise<void> {
  await delay();
  store = store.filter((c) => c.id !== id);
}

export async function acceptContractMock(token: string): Promise<void> {
  await delay();
  const idx = store.findIndex((c) => c.accept_token === token);
  if (idx === -1) throw new Error("Contract not found or already accepted");
  store[idx] = {
    ...store[idx],
    status: "Active",
    accepted_at: new Date().toISOString(),
    accepted_ip: "127.0.0.1",
  };
}

export async function renewContractMock(
  originalId: string,
  newStartDate: string,
  newEndDate: string
): Promise<Contract> {
  await delay();
  const original = store.find((c) => c.id === originalId);
  if (!original) throw new Error(`Contract ${originalId} not found`);

  const now = new Date().toISOString();
  const contractNumber = await generateContractNumberMock();

  const newContract: Contract = {
    ...original,
    id: `mock-contract-${Date.now()}`,
    contract_number: contractNumber,
    start_date: newStartDate,
    end_date: newEndDate,
    status: "Draft",
    created_at: now,
    updated_at: now,
    sent_at: null,
    accepted_at: null,
    renewed_at: null,
    accept_token: null,
    accepted_ip: null,
  };

  store = [
    newContract,
    ...store.map((c) =>
      c.id === originalId ? { ...c, renewed_at: now } : c
    ),
  ];
  return { ...newContract };
}

export async function generateContractNumberMock(): Promise<string> {
  await delay(100);
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const seq = String(store.length + 1).padStart(3, "0");
  return `CTR-${yy}${mm}-${seq}`;
}
