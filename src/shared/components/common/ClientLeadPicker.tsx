/**
 * @module ClientLeadPicker
 * Shared client/lead selector used across estimates, contracts, walkthroughs, and any
 * future feature that needs to assign a client or lead to a document or event.
 *
 * Uses the shared CRM cache (useClients / useLeads) so additions from other
 * parts of the app are immediately visible here.
 *
 * Usage:
 *   <ClientLeadPicker
 *     entityType={type}
 *     onEntityTypeChange={setType}
 *     selectedClient={client}
 *     selectedLead={lead}
 *     onClientSelect={handleClientSelect}
 *     onLeadSelect={handleLeadSelect}
 *     infoText="They will be used to send the invoice."
 *     companyAddress={profile.company_address}   // optional — enables route map
 *   />
 */
import { useState } from "react";
import {
  User, Users, Plus,
  MapPin, Mail, Phone, Building2, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { cn } from "@/shared/utils/cn";
import { ClientForm } from "@/features/crm/clients/components/ClientForm";
import { LeadForm }   from "@/features/crm/leads/components/LeadForm";
import { useClients } from "@/features/crm/clients/hooks/useClients";
import { useLeads }   from "@/features/crm/leads/hooks/useLeads";
import { AddressRouteMap } from "@/shared/components/common/AddressRouteMap";
import { ServicePropertySelector } from "@/shared/components/common/ServicePropertySelector";
import type { ClientEntity, LeadEntity } from "@/shared/types/entities";
import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";

export type EntityType = "client" | "lead";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ClientLeadPickerProps {
  entityType:           EntityType | null;
  onEntityTypeChange:   (type: EntityType) => void;
  selectedClient:       ClientEntity | null;
  selectedLead:         LeadEntity   | null;
  onClientSelect:       (client: ClientEntity) => void;
  onLeadSelect:         (lead: LeadEntity)     => void;
  /** Origin address used to draw a route to the selected entity. Optional. */
  companyAddress?: string;
  /** Text shown in the info notice at the bottom. Defaults to a generic message. */
  infoText?: string;
  errors?: {
    type?:   string;
    entity?: string;
  };
  /** Enables the client service-property selector (clients only). */
  showPropertySelector?: boolean;
  selectedProperty?: ClientProperty | null;
  onPropertyChange?: (property: ClientProperty | null) => void;
  /** Property id to pre-select once the client's properties load (edit/draft/conversion). */
  preferredPropertyId?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClientLeadPicker({
  entityType,
  onEntityTypeChange,
  selectedClient,
  selectedLead,
  onClientSelect,
  onLeadSelect,
  companyAddress,
  infoText = "Verify the email and phone number — they will be used to send the document.",
  errors,
  showPropertySelector = false,
  selectedProperty = null,
  onPropertyChange,
  preferredPropertyId,
}: ClientLeadPickerProps) {
  const [showNewClient, setShowNewClient] = useState(false);
  const [showNewLead,   setShowNewLead]   = useState(false);

  // ── Data — shared CRM cache ───────────────────────────────────────────────

  const { data: clientsRaw = [] } = useClients();
  const { data: leadsRaw   = [] } = useLeads();

  // Only active clients are selectable (matches ContactPicker behaviour).
  const activeClientsRaw = clientsRaw.filter((c) => (c as { status?: string }).status === "active");

  // Both hooks return CRM service types; cast to the shared EntityType shape.
  const clients = activeClientsRaw as unknown as ClientEntity[];
  const leads   = leadsRaw         as unknown as LeadEntity[];

  // If the selected entity is not in the fetched list (e.g. synthetic client from an estimate
  // edit where the contact was not saved to CRM), inject it so the Select can resolve its value.
  const clientsWithSelected = (selectedClient && !clients.find((c) => c.id === selectedClient.id))
    ? [...clients, selectedClient]
    : clients;
  const leadsWithSelected = (selectedLead && !leads.find((l) => l.id === selectedLead.id))
    ? [...leads, selectedLead]
    : leads;

  const currentList = entityType === "client" ? clientsWithSelected : leadsWithSelected;

  // ── Selected entity info ──────────────────────────────────────────────────

  const selected = entityType === "client" ? selectedClient
                 : entityType === "lead"   ? selectedLead
                 : null;

  // When a service property is selected, its address drives the route map.
  const selectedAddress = entityType === "client" && selectedClient
    ? (selectedProperty
        ? [selectedProperty.street, selectedProperty.city, selectedProperty.state, selectedProperty.zip_code].filter(Boolean).join(", ")
        : [selectedClient.service_street, selectedClient.service_city, selectedClient.service_state, selectedClient.service_zip].filter(Boolean).join(", "))
    : entityType === "lead" && selectedLead
    ? [selectedLead.address, selectedLead.city, selectedLead.state, selectedLead.zip_code].filter(Boolean).join(", ")
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Select Client or Lead
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {entityType === "client"
              ? "Choose who this is for"
              : entityType === "lead"
              ? "Choose who this is for"
              : "Select a client or lead to continue"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* ── Type toggle ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {(["client", "lead"] as EntityType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onEntityTypeChange(type)}
                className={cn(
                  "h-16 flex flex-col items-center justify-center gap-1 rounded-lg border-2 transition-all",
                  entityType === type
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/40 text-muted-foreground",
                  errors?.type && !entityType && "border-destructive",
                )}
              >
                {type === "client"
                  ? <User className="w-5 h-5" />
                  : <Users className="w-5 h-5" />}
                <span className="text-sm font-medium capitalize">{type}</span>
              </button>
            ))}
          </div>
          {errors?.type && <p className="text-xs text-destructive">{errors.type}</p>}

          {/* ── Dropdown ─────────────────────────────────────────────────── */}
          {entityType && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  {entityType === "client"
                    ? <User className="w-4 h-4" />
                    : <Users className="w-4 h-4" />}
                  <p className="font-semibold capitalize">{entityType}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Select {entityType === "client" ? "a client" : "a lead"}
                </p>
              </div>

              <Select
                value={entityType === "client" ? (selectedClient?.id ?? "") : (selectedLead?.id ?? "")}
                onValueChange={(id) => {
                  if (entityType === "client") {
                    const c = clients.find((c) => c.id === id);
                    if (c) onClientSelect(c);
                  } else {
                    const l = leads.find((l) => l.id === id);
                    if (l) onLeadSelect(l);
                  }
                }}
              >
                <SelectTrigger className={cn(errors?.entity && "border-destructive")}>
                  <SelectValue placeholder={`Select ${entityType}...`} />
                </SelectTrigger>
                <SelectContent>
                  {currentList.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.full_name}
                    </SelectItem>
                  ))}
                  {currentList.length === 0 && (
                    <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No {entityType}s found
                    </p>
                  )}
                </SelectContent>
              </Select>

              {errors?.entity && <p className="text-xs text-destructive">{errors.entity}</p>}

              <button
                type="button"
                onClick={() => entityType === "client" ? setShowNewClient(true) : setShowNewLead(true)}
                className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add New {entityType === "client" ? "Client" : "Lead"}
              </button>
            </div>
          )}

          {/* ── Selected entity card ──────────────────────────────────────── */}
          {selected && (
            <div className="p-4 border-y">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {entityType === "client"
                    ? <User className="w-4 h-4 text-primary" />
                    : <Users className="w-4 h-4 text-primary" />}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-semibold text-sm">{selected.full_name}</p>
                  {(entityType === "client"
                    ? (selected as ClientEntity).company
                    : (selected as LeadEntity).company_name
                  ) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3 h-3 flex-shrink-0" />
                      {entityType === "client"
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
            </div>
          )}

          {/* ── Service property (clients only) — shown before the map ─────── */}
          {showPropertySelector && entityType === "client" && selectedClient && (
            <ServicePropertySelector
              clientId={selectedClient.id}
              value={selectedProperty}
              onChange={(p) => onPropertyChange?.(p)}
              preferredPropertyId={preferredPropertyId}
            />
          )}

          {/* ── Route map (only when companyAddress is provided) ──────────── */}
          {selectedAddress && companyAddress && (
            <AddressRouteMap
              targetAddress={selectedAddress}
              companyAddress={companyAddress}
            />
          )}

        </CardContent>
      </Card>

      {/* ── Info notice ──────────────────────────────────────────────────── */}
      <Card className="border-info-subtle-border bg-info-subtle/50 dark:border-info-subtle-border dark:bg-info-subtle/20">
        <CardContent className="p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
          <p className="text-xs text-info-subtle-foreground">{infoText}</p>
        </CardContent>
      </Card>

      {/* ── Quick-create dialogs ──────────────────────────────────────────── */}
      <ClientForm
        open={showNewClient}
        onClose={() => setShowNewClient(false)}
        onSuccess={(client) => { onClientSelect(client); }}
      />
      <LeadForm
        open={showNewLead}
        onClose={() => setShowNewLead(false)}
        onSuccess={(lead) => { onLeadSelect(lead); }}
      />
    </div>
  );
}
