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
import { useEffect, useState } from "react";
import {
  User, Users, Plus,
  MapPin, Mail, Phone, Building2, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { cn } from "@/shared/utils/cn";
import { LeadForm }   from "@/features/crm/leads/components/LeadForm";
import { useLeads }   from "@/features/crm/leads/hooks/useLeads";
import { ClientSelect } from "@/shared/components/common/ClientSelect";
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
  const [showNewLead, setShowNewLead] = useState(false);

  // Lead flow retired from the UI (matches swift-slate): default new documents to
  // "client". Existing lead-linked documents keep their type so editing never wipes them.
  useEffect(() => {
    if (entityType == null) onEntityTypeChange("client");
  }, [entityType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data — leads only (client selection lives in the canonical ClientSelect) ──

  const { data: leadsRaw = [] } = useLeads();
  const leads = leadsRaw as unknown as LeadEntity[];

  // Inject the selected lead if not in the fetched list (edit of a legacy lead doc).
  const leadsWithSelected = (selectedLead && !leads.find((l) => l.id === selectedLead.id))
    ? [...leads, selectedLead]
    : leads;

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
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Select Client
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* ── Client — canonical ClientSelect (search + Add New Client) ──── */}
          {entityType === "client" && (
            <div className="space-y-1.5">
              <ClientSelect
                value={selectedClient?.id}
                selected={selectedClient}
                onChange={(client) => { if (client) onClientSelect(client); }}
                error={!!errors?.entity}
              />
              {errors?.entity && <p className="text-xs text-destructive">{errors.entity}</p>}
            </div>
          )}

          {/* ── Lead — legacy edit-only branch (no lead flow in the UI) ────── */}
          {entityType === "lead" && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Users className="w-4 h-4" />
                  <p className="font-semibold">Lead</p>
                </div>
                <p className="text-sm text-muted-foreground">Select a lead</p>
              </div>

              <Select
                value={selectedLead?.id ?? ""}
                onValueChange={(id) => {
                  const l = leads.find((l) => l.id === id);
                  if (l) onLeadSelect(l);
                }}
              >
                <SelectTrigger className={cn(errors?.entity && "border-destructive")}>
                  <SelectValue placeholder="Select lead..." />
                </SelectTrigger>
                <SelectContent>
                  {leadsWithSelected.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.full_name}
                    </SelectItem>
                  ))}
                  {leadsWithSelected.length === 0 && (
                    <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No leads found
                    </p>
                  )}
                </SelectContent>
              </Select>

              {errors?.entity && <p className="text-xs text-destructive">{errors.entity}</p>}

              <button
                type="button"
                onClick={() => setShowNewLead(true)}
                className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add New Lead
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

          {/* ── Info notice (inline — no nested card) ─────────────────────── */}
          <div className="flex items-start gap-2 rounded-md border border-info-subtle-border bg-info-subtle/50 dark:bg-info-subtle/20 p-3">
            <Info className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
            <p className="text-xs text-info-subtle-foreground">{infoText}</p>
          </div>

        </CardContent>
      </Card>

      {/* ── Quick-create lead dialog (edit-only legacy) ───────────────────── */}
      <LeadForm
        open={showNewLead}
        onClose={() => setShowNewLead(false)}
        onSuccess={(lead) => { onLeadSelect(lead); }}
      />
    </>
  );
}
