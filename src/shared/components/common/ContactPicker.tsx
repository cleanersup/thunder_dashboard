/* eslint-disable react-refresh/only-export-components */
import { useEffect } from "react";
import { User, Briefcase } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import { ServicePropertySelector } from "./ServicePropertySelector";
import { useClients } from "@/features/crm/clients/hooks/useClients";
import { useLeads } from "@/features/crm/leads/hooks/useLeads";
import { QK } from "@/shared/config/queryKeys";
import type { Client } from "@/features/crm/types/crm.types";
import type { Lead } from "@/features/crm/types/crm.types";
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

  const activeClients = allClients.filter((c) => c.status === "active");

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

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleTypeChange = (type: "client" | "lead") => {
    onChange({ contactType: type, client: null, lead: null, property: null });
  };

  const handleClientChange = (id: string) => {
    const found = activeClients.find((c) => c.id === id) ?? null;
    onChange({ contactType: "client", client: found, lead: null, property: null });
  };

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
      {/* Contact type toggle */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={value.contactType === "client" ? "default" : "outline"}
          onClick={() => handleTypeChange("client")}
        >
          <User className="w-4 h-4 mr-2" />
          Client
        </Button>
        <Button
          type="button"
          variant={value.contactType === "lead" ? "default" : "outline"}
          onClick={() => handleTypeChange("lead")}
        >
          <Briefcase className="w-4 h-4 mr-2" />
          Lead
        </Button>
      </div>

      {/* Client picker */}
      {value.contactType === "client" && (
        <SearchableSelect
          value={value.client?.id}
          onValueChange={handleClientChange}
          options={activeClients.map((c) => ({
            value:    c.id,
            label:    c.full_name,
            subtitle: c.company || c.email || undefined,
          }))}
          placeholder="Select client..."
          title="Select Client"
          searchPlaceholder="Search clients..."
          emptyMessage="No active clients found"
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
