/**
 * @module EstimateClientStep
 * Shared Step 0 component for both Residential and Commercial estimate forms.
 * Handles entity-type toggle, search list, quick-create dialogs, and selected-entity card.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QK } from "@/shared/config/queryKeys";
import {
  User, Users, Plus,
  MapPin, Mail, Phone, Building2, Info,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/shared/utils/cn";
import { ClientForm } from "@/features/crm/clients/components/ClientForm";
import { LeadForm }   from "@/features/crm/leads/components/LeadForm";

// ─── Public types (defined in shared, re-exported here for backwards compat) ──

export type { ClientEntity, LeadEntity, EstimateEntityType } from "@/shared/types/entities";
import type { ClientEntity, LeadEntity, EstimateEntityType } from "@/shared/types/entities";

// ─── Props ────────────────────────────────────────────────────────────────────

interface EstimateClientStepProps {
  estimateType: EstimateEntityType | null;
  onEstimateTypeChange: (type: EstimateEntityType) => void;
  selectedClient: ClientEntity | null;
  selectedLead: LeadEntity | null;
  onClientSelect: (client: ClientEntity) => void;
  onLeadSelect: (lead: LeadEntity) => void;
  errors?: {
    type?: string;
    entity?: string;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EstimateClientStep({
  estimateType,
  onEstimateTypeChange,
  selectedClient,
  selectedLead,
  onClientSelect,
  onLeadSelect,
  errors,
}: EstimateClientStepProps) {
  const qc = useQueryClient();

  const [showNewClient, setShowNewClient] = useState(false);
  const [showNewLead,   setShowNewLead]   = useState(false);

  // ── Data queries ─────────────────────────────────────────────────────────

  const { data: clients = [] } = useQuery<ClientEntity[]>({
    queryKey: QK.clientsForEstimate,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("clients")
        .select("id, full_name, company, phone, email, service_street, service_city, service_state, service_zip, service_apt")
        .eq("user_id", user.id)
        .order("full_name");
      return (data ?? []) as ClientEntity[];
    },
  });

  const { data: leads = [] } = useQuery<LeadEntity[]>({
    queryKey: QK.leadsForEstimate,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("leads")
        .select("id, full_name, company_name, phone, email, address, city, state, zip_code, apt_suite")
        .eq("user_id", user.id)
        .order("full_name");
      return (data ?? []) as LeadEntity[];
    },
  });

  const currentList = estimateType === "client" ? clients : leads;

  // ── Selected entity info ──────────────────────────────────────────────────

  const selected = estimateType === "client" ? selectedClient
                 : estimateType === "lead"   ? selectedLead
                 : null;

  const selectedAddress = estimateType === "client" && selectedClient
    ? `${selectedClient.service_street}, ${selectedClient.service_city}, ${selectedClient.service_state} ${selectedClient.service_zip}`
    : estimateType === "lead" && selectedLead
    ? `${selectedLead.address}, ${selectedLead.city}, ${selectedLead.state} ${selectedLead.zip_code}`
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Select Client or Lead</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Choose who this estimate is for</p>
      </div>

      {/* ── Entity type toggle ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {(["client", "lead"] as EstimateEntityType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onEstimateTypeChange(type)}
            className={cn(
              "h-16 flex flex-col items-center justify-center gap-1 rounded-lg border-2 transition-all",
              estimateType === type
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/40 text-muted-foreground",
              errors?.type && !estimateType && "border-destructive",
            )}
          >
            {type === "client" ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            <span className="text-sm font-medium capitalize">{type}</span>
          </button>
        ))}
      </div>
      {errors?.type && <p className="text-xs text-destructive">{errors.type}</p>}

      {/* ── Dropdown ──────────────────────────────────────────────────── */}
      {estimateType && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              {estimateType === "client" ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              <p className="font-semibold capitalize">{estimateType}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Select a {estimateType} to generate the cleaning estimate
            </p>
          </div>

          <Select
            value={estimateType === "client" ? (selectedClient?.id ?? "") : (selectedLead?.id ?? "")}
            onValueChange={(id) => {
              if (estimateType === "client") {
                const c = clients.find((c) => c.id === id);
                if (c) onClientSelect(c);
              } else {
                const l = leads.find((l) => l.id === id);
                if (l) onLeadSelect(l);
              }
            }}
          >
            <SelectTrigger className={cn(errors?.entity && "border-destructive")}>
              <SelectValue placeholder={`Select ${estimateType}...`} />
            </SelectTrigger>
            <SelectContent>
              {currentList.map((entity) => (
                <SelectItem key={entity.id} value={entity.id}>
                  {entity.full_name}
                </SelectItem>
              ))}
              {currentList.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No {estimateType}s found
                </p>
              )}
            </SelectContent>
          </Select>

          {errors?.entity && <p className="text-xs text-destructive">{errors.entity}</p>}

          <button
            type="button"
            onClick={() => estimateType === "client" ? setShowNewClient(true) : setShowNewLead(true)}
            className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New {estimateType === "client" ? "Client" : "Lead"}
          </button>
        </div>
      )}

      {/* ── Selected entity details card ──────────────────────────────── */}
      {selected && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                {estimateType === "client"
                  ? <User className="w-4 h-4 text-primary" />
                  : <Users className="w-4 h-4 text-primary" />}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-semibold text-sm">{selected.full_name}</p>
                {(estimateType === "client"
                  ? (selected as ClientEntity).company
                  : (selected as LeadEntity).company_name
                ) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3 flex-shrink-0" />
                    {estimateType === "client"
                      ? (selected as ClientEntity).company
                      : (selected as LeadEntity).company_name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3 flex-shrink-0" /> {selected.email}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3 flex-shrink-0" /> {selected.phone}
                </p>
                {selectedAddress && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" /> {selectedAddress}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Info notice ────────────────────────────────────────────────── */}
      <Card className="border-info-subtle-border bg-info-subtle/50 dark:border-info-subtle-border dark:bg-info-subtle/20">
        <CardContent className="p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
          <p className="text-xs text-info-subtle-foreground">
            Verify the email and phone number — they will be used to send the estimate.
          </p>
        </CardContent>
      </Card>

      {/* ── Quick-create Client dialog (reuses CRM ClientForm) ──────────── */}
      <ClientForm
        open={showNewClient}
        onClose={() => setShowNewClient(false)}
        onSuccess={(client) => {
          onClientSelect(client);
          qc.invalidateQueries({ queryKey: QK.clientsForEstimate });
        }}
      />

      {/* ── Quick-create Lead dialog (reuses CRM LeadForm) ──────────────── */}
      <LeadForm
        open={showNewLead}
        onClose={() => setShowNewLead(false)}
        onSuccess={(lead) => {
          onLeadSelect(lead);
          qc.invalidateQueries({ queryKey: QK.leadsForEstimate });
        }}
      />
    </div>
  );
}
