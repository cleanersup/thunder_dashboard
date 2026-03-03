/**
 * @module EstimateClientStep
 * Shared Step 0 component for both Residential and Commercial estimate forms.
 * Handles entity-type toggle, search list, quick-create dialogs, and selected-entity card.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User, Users, Plus,
  MapPin, Mail, Phone, Building2, Info,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/shared/utils/cn";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ClientEntity {
  id: string;
  full_name: string;
  company: string | null;
  phone: string;
  email: string;
  service_street: string;
  service_city: string;
  service_state: string;
  service_zip: string;
  service_apt: string | null;
}

export interface LeadEntity {
  id: string;
  full_name: string;
  company_name: string | null;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  apt_suite: string | null;
}

export type EstimateEntityType = "client" | "lead";

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

// ─── Quick-create empty forms ─────────────────────────────────────────────────

const EMPTY_CLIENT_FORM = {
  full_name: "", email: "", phone: "", company: "",
  service_street: "", service_city: "", service_state: "", service_zip: "",
};

const EMPTY_LEAD_FORM = {
  full_name: "", email: "", phone: "", company_name: "",
  address: "", city: "", state: "", zip_code: "",
};

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
  const [clientForm, setClientForm] = useState(EMPTY_CLIENT_FORM);
  const [leadForm,   setLeadForm]   = useState(EMPTY_LEAD_FORM);
  const [saving, setSaving] = useState(false);

  // ── Data queries ─────────────────────────────────────────────────────────

  const { data: clients = [] } = useQuery<ClientEntity[]>({
    queryKey: ["clients-for-estimate"],
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
    queryKey: ["leads-for-estimate"],
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

  // ── Quick-create client ───────────────────────────────────────────────────

  async function handleCreateClient() {
    if (!clientForm.full_name || !clientForm.email || !clientForm.phone) {
      toast.error("Name, email and phone are required");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("clients")
        .insert({
          user_id:            user.id,
          full_name:          clientForm.full_name,
          email:              clientForm.email,
          phone:              clientForm.phone,
          company:            clientForm.company || null,
          // Service address
          service_street:     clientForm.service_street,
          service_city:       clientForm.service_city,
          service_state:      clientForm.service_state,
          service_zip:        clientForm.service_zip,
          service_apt:        null,
          // Billing mirrors service address
          billing_street:     clientForm.service_street,
          billing_city:       clientForm.service_city,
          billing_state:      clientForm.service_state,
          billing_zip:        clientForm.service_zip,
          // Required defaults
          client_type:        "residential",
          contact_preference: "email",
          status:             "active",
        })
        .select()
        .single();

      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["clients-for-estimate"] });
      onClientSelect(data as ClientEntity);
      setShowNewClient(false);
      setClientForm(EMPTY_CLIENT_FORM);
      toast.success("Client created");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create client");
    } finally {
      setSaving(false);
    }
  }

  // ── Quick-create lead ─────────────────────────────────────────────────────

  async function handleCreateLead() {
    if (!leadForm.full_name || !leadForm.email || !leadForm.phone) {
      toast.error("Name, email and phone are required");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("leads")
        .insert({
          user_id:            user.id,
          full_name:          leadForm.full_name,
          email:              leadForm.email,
          phone:              leadForm.phone,
          company_name:       leadForm.company_name || null,
          address:            leadForm.address,
          city:               leadForm.city,
          state:              leadForm.state,
          zip_code:           leadForm.zip_code,
          apt_suite:          null,
          // Required defaults
          lead_source:        "direct",
          priority_level:     "medium",
          service_interested: "Cleaning",
          status:             "new",
        })
        .select()
        .single();

      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["leads-for-estimate"] });
      onLeadSelect(data as LeadEntity);
      setShowNewLead(false);
      setLeadForm(EMPTY_LEAD_FORM);
      toast.success("Lead created");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create lead");
    } finally {
      setSaving(false);
    }
  }

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

      {/* ── Quick-create Client dialog ────────────────────────────────── */}
      <Dialog open={showNewClient} onOpenChange={(open) => { setShowNewClient(open); if (!open) setClientForm(EMPTY_CLIENT_FORM); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Full Name *</Label>
                <Input
                  placeholder="John Doe"
                  value={clientForm.full_name}
                  onChange={(e) => setClientForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="john@email.com"
                  value={clientForm.email}
                  onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input
                  placeholder="(555) 000-0000"
                  value={clientForm.phone}
                  onChange={(e) => setClientForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Company</Label>
                <Input
                  placeholder="Optional"
                  value={clientForm.company}
                  onChange={(e) => setClientForm((f) => ({ ...f, company: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Service Address</p>
              <div className="space-y-2">
                <Input
                  placeholder="Street address"
                  value={clientForm.service_street}
                  onChange={(e) => setClientForm((f) => ({ ...f, service_street: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="City"
                    value={clientForm.service_city}
                    onChange={(e) => setClientForm((f) => ({ ...f, service_city: e.target.value }))}
                  />
                  <Input
                    placeholder="State"
                    value={clientForm.service_state}
                    onChange={(e) => setClientForm((f) => ({ ...f, service_state: e.target.value }))}
                  />
                </div>
                <Input
                  placeholder="Zip code"
                  value={clientForm.service_zip}
                  onChange={(e) => setClientForm((f) => ({ ...f, service_zip: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setShowNewClient(false); setClientForm(EMPTY_CLIENT_FORM); }}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleCreateClient} disabled={saving}>
              {saving ? "Saving…" : "Create Client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Quick-create Lead dialog ──────────────────────────────────── */}
      <Dialog open={showNewLead} onOpenChange={(open) => { setShowNewLead(open); if (!open) setLeadForm(EMPTY_LEAD_FORM); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Full Name *</Label>
                <Input
                  placeholder="Jane Doe"
                  value={leadForm.full_name}
                  onChange={(e) => setLeadForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="jane@email.com"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input
                  placeholder="(555) 000-0000"
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Company</Label>
                <Input
                  placeholder="Optional"
                  value={leadForm.company_name}
                  onChange={(e) => setLeadForm((f) => ({ ...f, company_name: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Address</p>
              <div className="space-y-2">
                <Input
                  placeholder="Street address"
                  value={leadForm.address}
                  onChange={(e) => setLeadForm((f) => ({ ...f, address: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="City"
                    value={leadForm.city}
                    onChange={(e) => setLeadForm((f) => ({ ...f, city: e.target.value }))}
                  />
                  <Input
                    placeholder="State"
                    value={leadForm.state}
                    onChange={(e) => setLeadForm((f) => ({ ...f, state: e.target.value }))}
                  />
                </div>
                <Input
                  placeholder="Zip code"
                  value={leadForm.zip_code}
                  onChange={(e) => setLeadForm((f) => ({ ...f, zip_code: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setShowNewLead(false); setLeadForm(EMPTY_LEAD_FORM); }}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleCreateLead} disabled={saving}>
              {saving ? "Saving…" : "Create Lead"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
