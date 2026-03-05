/**
 * @module WalkthroughClientPicker
 * Reusable client/lead picker for the walkthrough scheduling form.
 * Follows the same pattern as EstimateClientStep.
 */
import { useState } from "react";
import {
  User, Users, Plus,
  MapPin, Mail, Phone, Building2, Info,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { cn } from "@/shared/utils/cn";
import { ClientForm } from "@/features/crm/clients/components/ClientForm";
import { LeadForm }   from "@/features/crm/leads/components/LeadForm";
import { useClients } from "@/features/crm/clients/hooks/useClients";
import { useLeads }   from "@/features/crm/leads/hooks/useLeads";
import type { ClientEntity, LeadEntity } from "@/shared/types/entities";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WalkthroughEntityType = "client" | "lead";

export type { ClientEntity, LeadEntity };

// ─── Props ────────────────────────────────────────────────────────────────────

interface WalkthroughClientPickerProps {
  walkthroughType: WalkthroughEntityType | null;
  onTypeChange:    (type: WalkthroughEntityType) => void;
  selectedClient:  ClientEntity | null;
  selectedLead:    LeadEntity | null;
  onClientSelect:  (client: ClientEntity) => void;
  onLeadSelect:    (lead: LeadEntity) => void;
  errors?: {
    type?:   string;
    entity?: string;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WalkthroughClientPicker({
  walkthroughType,
  onTypeChange,
  selectedClient,
  selectedLead,
  onClientSelect,
  onLeadSelect,
  errors,
}: WalkthroughClientPickerProps) {
  const [showNewClient, setShowNewClient] = useState(false);
  const [showNewLead,   setShowNewLead]   = useState(false);

  // ── Data — reuse shared CRM cache ─────────────────────────────────────────

  const { data: clientsRaw = [] } = useClients();
  const { data: leadsRaw   = [] } = useLeads();

  // Cast to local entity types (CRM service returns Supabase row type)
  const clients = clientsRaw as unknown as ClientEntity[];
  const leads   = leadsRaw   as unknown as LeadEntity[];

  const currentList = walkthroughType === "client" ? clients : leads;

  // ── Selected entity info ────────────────────────────────────────────────

  const selected = walkthroughType === "client" ? selectedClient
                 : walkthroughType === "lead"   ? selectedLead
                 : null;

  const selectedAddress = walkthroughType === "client" && selectedClient
    ? `${selectedClient.service_street}, ${selectedClient.service_city}, ${selectedClient.service_state} ${selectedClient.service_zip}`
    : walkthroughType === "lead" && selectedLead
    ? `${selectedLead.address}, ${selectedLead.city}, ${selectedLead.state} ${selectedLead.zip_code}`
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Client / Lead</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Select who this walkthrough is for</p>
      </div>

      {/* ── Entity type toggle ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {(["client", "lead"] as WalkthroughEntityType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onTypeChange(type)}
            className={cn(
              "h-16 flex flex-col items-center justify-center gap-1 rounded-lg border-2 transition-all",
              walkthroughType === type
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/40 text-muted-foreground",
              errors?.type && !walkthroughType && "border-destructive",
            )}
          >
            {type === "client" ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            <span className="text-sm font-medium capitalize">{type}</span>
          </button>
        ))}
      </div>
      {errors?.type && <p className="text-xs text-destructive">{errors.type}</p>}

      {/* ── Dropdown ────────────────────────────────────────────────────── */}
      {walkthroughType && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              {walkthroughType === "client" ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              <p className="font-semibold capitalize">{walkthroughType}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Select {walkthroughType === "client" ? "a client" : "a lead"} for this walkthrough
            </p>
          </div>

          <Select
            value={walkthroughType === "client" ? (selectedClient?.id ?? "") : (selectedLead?.id ?? "")}
            onValueChange={(id) => {
              if (walkthroughType === "client") {
                const c = clients.find((c) => c.id === id);
                if (c) onClientSelect(c);
              } else {
                const l = leads.find((l) => l.id === id);
                if (l) onLeadSelect(l);
              }
            }}
          >
            <SelectTrigger className={cn(errors?.entity && "border-destructive")}>
              <SelectValue placeholder={`Select ${walkthroughType}...`} />
            </SelectTrigger>
            <SelectContent>
              {currentList.map((entity) => (
                <SelectItem key={entity.id} value={entity.id}>
                  {entity.full_name}
                </SelectItem>
              ))}
              {currentList.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No {walkthroughType}s found
                </p>
              )}
            </SelectContent>
          </Select>

          {errors?.entity && <p className="text-xs text-destructive">{errors.entity}</p>}

          <button
            type="button"
            onClick={() => walkthroughType === "client" ? setShowNewClient(true) : setShowNewLead(true)}
            className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New {walkthroughType === "client" ? "Client" : "Lead"}
          </button>
        </div>
      )}

      {/* ── Selected entity details card ──────────────────────────────── */}
      {selected && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                {walkthroughType === "client"
                  ? <User className="w-4 h-4 text-primary" />
                  : <Users className="w-4 h-4 text-primary" />}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-semibold text-sm">{selected.full_name}</p>
                {(walkthroughType === "client"
                  ? (selected as ClientEntity).company
                  : (selected as LeadEntity).company_name
                ) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3 flex-shrink-0" />
                    {walkthroughType === "client"
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
            Verify the email and phone number — they will be used to send the walkthrough confirmation.
          </p>
        </CardContent>
      </Card>

      {/* ── Quick-create Client dialog ────────────────────────────────── */}
      <ClientForm
        open={showNewClient}
        onClose={() => setShowNewClient(false)}
        onSuccess={(client) => onClientSelect(client)}
      />

      {/* ── Quick-create Lead dialog ──────────────────────────────────── */}
      <LeadForm
        open={showNewLead}
        onClose={() => setShowNewLead(false)}
        onSuccess={(lead) => onLeadSelect(lead)}
      />
    </div>
  );
}
