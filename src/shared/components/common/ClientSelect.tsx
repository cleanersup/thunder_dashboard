/**
 * @module ClientSelect
 * Canonical client selector — the single place a client is picked across the app.
 *
 * Reused by estimates, jobs, walkthroughs, requests and any future feature so the
 * search box (name / email / company), the "Add New Client" action and the shared
 * CRM cache behave identically everywhere. Do not build ad-hoc client dropdowns —
 * use this component.
 *
 * Usage:
 *   <ClientSelect
 *     value={selectedClient?.id}
 *     selected={selectedClient}          // optional — keeps label visible for inactive/edit clients
 *     onChange={(client) => setSelectedClient(client)}
 *     error={hasError}
 *   />
 */
import { useState } from "react";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import { ClientForm } from "@/features/crm/clients/components/ClientForm";
import { useClients } from "@/features/crm/clients/hooks/useClients";
import type { ClientEntity } from "@/shared/types/entities";

export interface ClientSelectProps {
  /** Selected client id. */
  value?: string;
  /** Fires with the full client on select or after a successful create; null when cleared. */
  onChange: (client: ClientEntity | null) => void;
  /** Currently selected client — injected into the list so its label shows even if inactive. */
  selected?: ClientEntity | null;
  error?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ClientSelect({
  value,
  onChange,
  selected = null,
  error = false,
  disabled = false,
  placeholder = "Select client...",
}: ClientSelectProps) {
  const [showNew, setShowNew] = useState(false);
  const { data: clientsRaw = [] } = useClients();

  // Only active clients are selectable (matches previous picker behaviour).
  const clients = clientsRaw.filter(
    (c) => (c as { status?: string }).status === "active",
  ) as unknown as ClientEntity[];

  // Inject the selected client if it isn't in the active list (edit / draft / inactive).
  const list = selected && !clients.find((c) => c.id === selected.id)
    ? [...clients, selected]
    : clients;

  const options = list.map((c) => ({
    value:      c.id,
    label:      c.full_name,
    subtitle:   c.company || c.email || undefined,
    searchText: `${c.full_name} ${c.email ?? ""} ${c.company ?? ""}`,
  }));

  return (
    <>
      <SearchableSelect
        value={value}
        onValueChange={(id) => onChange(list.find((c) => c.id === id) ?? null)}
        options={options}
        placeholder={placeholder}
        title="Select Client"
        searchPlaceholder="Search by name, email or company..."
        emptyMessage="No clients found"
        error={error}
        disabled={disabled}
        onAddNew={() => setShowNew(true)}
        addNewLabel="Add New Client"
      />
      <ClientForm
        open={showNew}
        onClose={() => setShowNew(false)}
        onSuccess={(client) => onChange(client)}
      />
    </>
  );
}
