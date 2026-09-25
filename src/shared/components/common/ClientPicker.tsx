/**
 * @module ClientPicker
 * Shared client-only selector used in invoices, contracts, and any feature
 * that assigns a document to an existing client (no lead support).
 *
 * For client + lead selection, see ClientLeadPicker.
 */
import { useState } from "react";
import { User, Plus, Building2, Mail, Phone, MapPin } from "lucide-react";
import { FormSection, SelectField } from "@/shared/components/forms";
import { ClientForm } from "@/features/crm/clients/components/ClientForm";
import { useClients } from "@/features/crm/clients/hooks/useClients";
import type { ClientEntity } from "@/shared/types/entities";

export type { ClientEntity };

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ClientPickerProps {
  selectedClient: ClientEntity | null;
  onClientSelect: (client: ClientEntity) => void;
  error?:         boolean;
  errorMessage?:  string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClientPicker({
  selectedClient,
  onClientSelect,
  error,
  errorMessage = "Please select a client",
}: ClientPickerProps) {
  const [showNewClient, setShowNewClient] = useState(false);

  const { data: clientsRaw = [] } = useClients();

  // Only active clients are selectable (matches ClientLeadPicker / ContactPicker).
  const activeClients = clientsRaw.filter((c) => (c as { status?: string }).status === "active");
  const clients = activeClients as unknown as ClientEntity[];

  // If the selected client isn't in the active list (e.g. editing an invoice whose
  // client was deactivated, or a synthetic client), inject it so the Select resolves its value.
  // Guard against empty ids — a <SelectItem value=""> throws.
  const clientsWithSelected = ((selectedClient && !clients.find((c) => c.id === selectedClient.id))
    ? [...clients, selectedClient]
    : clients
  ).filter((c) => c.id);

  const selectedAddress = selectedClient
    ? [
        selectedClient.service_street,
        selectedClient.service_city,
        selectedClient.service_state,
        selectedClient.service_zip,
      ].filter(Boolean).join(", ")
    : null;

  return (
    <FormSection
      icon={User}
      title="Customer Information"
      subtitle="Who this document is for"
      invalid={error}
    >
      <SelectField
        placeholder="Select customer"
        value={selectedClient?.id ?? ""}
        onChange={(id) => {
          const c = clientsWithSelected.find((c) => c.id === id);
          if (c) onClientSelect(c);
        }}
        options={clientsWithSelected.map((c) => ({ value: c.id, label: c.full_name }))}
        required
        error={error && errorMessage}
      />

      {clientsWithSelected.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No clients yet — add one below.
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowNewClient(true)}
        className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add New Client
      </button>

      {/* Resumen del cliente elegido — confirma de un vistazo que es el correcto. */}
      {selectedClient && (
        <div className="rounded-md border border-border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="font-semibold text-sm">{selectedClient.full_name}</p>
              {selectedClient.company && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3 flex-shrink-0" />
                  {selectedClient.company}
                </p>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3 flex-shrink-0" /> {selectedClient.email}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3 flex-shrink-0" /> {selectedClient.phone}
              </p>
              {selectedAddress && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" /> {selectedAddress}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alta rápida: se crea, se cierra y queda seleccionado en el campo. */}
      <ClientForm
        open={showNewClient}
        onClose={() => setShowNewClient(false)}
        onSuccess={(client) => { onClientSelect(client); setShowNewClient(false); }}
      />
    </FormSection>
  );
}
