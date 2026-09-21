/* eslint-disable react-refresh/only-export-components */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import { ClientSelect } from "./ClientSelect";
import { ServicePropertySelector } from "./ServicePropertySelector";
import { useClients } from "@/features/crm/clients/hooks/useClients";
import { useLeads } from "@/features/crm/leads/hooks/useLeads";
import { QK } from "@/shared/config/queryKeys";
import type { Client } from "@/features/crm/types/crm.types";
import type { Lead } from "@/features/crm/types/crm.types";
import type { ClientEntity } from "@/shared/types/entities";
import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";

// ── Public types ───────────────────────────────────────────────────────────────

export interface ContactPickerValue {
  contactType: "client" | "lead" | null;
  client: Client | null;
  lead: Lead | null;
  property: ClientProperty | null;
}

export const EMPTY_CONTACT: ContactPickerValue = {
  contactType: null,
  client: null,
  lead: null,
  property: null,
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface ContactPickerProps {
  value: ContactPickerValue;
  onChange: (next: ContactPickerValue) => void;
  showPropertySelector?: boolean;
  error?: boolean;
  preferredPropertyId?: string | null;
  clientIdFromUrl?: string | null;
  leadIdFromUrl?: string | null;
  onUrlParamConsumed?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ContactPicker({
  value,
  onChange,
  showPropertySelector = true,
  error = false,
  preferredPropertyId,
  clientIdFromUrl,
  leadIdFromUrl,
  onUrlParamConsumed,
}: ContactPickerProps) {
  const queryClient = useQueryClient();
  const { data: allClients = [] } = useClients();
  const { data: leads = [] } = useLeads();

  // Bust cache on mount when returning from add-client/add-lead
  useEffect(() => {
    if (clientIdFromUrl) queryClient.invalidateQueries({ queryKey: QK.clients });
    if (leadIdFromUrl)   queryClient.invalidateQueries({ queryKey: QK.leads });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select client from URL param
  useEffect(() => {
    if (!clientIdFromUrl || allClients.length === 0) return;
    if (value.client?.id === clientIdFromUrl) return;
    const found = allClients.find((c) => c.id === clientIdFromUrl);
    if (found) {
      onChange({ contactType: "client", client: found, lead: null, property: null });
      onUrlParamConsumed?.();
    }
  }, [allClients, clientIdFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select lead from URL param
  useEffect(() => {
    if (!leadIdFromUrl || leads.length === 0) return;
    if (value.lead?.id === leadIdFromUrl) return;
    const found = leads.find((l) => l.id === leadIdFromUrl);
    if (found) {
      onChange({ contactType: "lead", client: null, lead: found, property: null });
      onUrlParamConsumed?.();
    }
  }, [leads, leadIdFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lead flow retired from the UI (matches swift-slate): default new pickers to
  // "client". Skip when a lead is being restored from URL (edit) so it's preserved.
  useEffect(() => {
    if (value.contactType == null && !leadIdFromUrl) {
      onChange({ contactType: "client", client: null, lead: null, property: null });
    }
  }, [value.contactType, leadIdFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleLeadChange = (id: string) => {
    const found = leads.find((l) => l.id === id) ?? null;
    onChange({ contactType: "lead", lead: found, client: null, property: null });
  };

  const handlePropertyChange = (property: ClientProperty | null) => {
    onChange({ ...value, property });
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Client picker — canonical ClientSelect (search + Add New Client) */}
      {value.contactType === "client" && (
        <ClientSelect
          value={value.client?.id}
          selected={value.client as unknown as ClientEntity | null}
          onChange={(client) =>
            onChange({ contactType: "client", client: client as unknown as Client | null, lead: null, property: null })
          }
          error={error}
        />
      )}

      {/* Lead picker */}
      {value.contactType === "lead" && (
        <SearchableSelect
          value={value.lead?.id}
          onValueChange={handleLeadChange}
          options={leads.map((l) => ({
            value:    l.id,
            label:    l.full_name,
            subtitle: l.company_name || l.email || undefined,
          }))}
          placeholder="Select lead..."
          title="Select Lead"
          searchPlaceholder="Search leads..."
          emptyMessage="No leads found"
          error={error}
        />
      )}

      {/* Property selector — clients only */}
      {showPropertySelector && value.contactType === "client" && value.client && (
        <ServicePropertySelector
          clientId={value.client.id}
          value={value.property}
          onChange={handlePropertyChange}
          preferredPropertyId={preferredPropertyId}
        />
      )}
    </div>
  );
}
