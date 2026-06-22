/**
 * @module ClientForm
 * Modal dialog form for creating or editing a client.
 * Used by: CRM, estimates, and invoices (shared single source of truth).
 * Texts and validations match swift-slate AddClient / EditClient pages.
 */
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button }   from "@/shared/components/ui/button";
import { Input }    from "@/shared/components/ui/input";
import { Label }    from "@/shared/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { clientSchema, type ClientFormData } from "../schemas/clientSchema";
import { AddressAutocomplete } from "@/shared/components/AddressAutocomplete";
import { PhoneInput } from "@/shared/components/ui/phone-input";
import { formatPhoneDisplay } from "@/shared/utils/phoneInput";
import { useCreateClient, useUpdateClient } from "../hooks/useClients";
import type { Client } from "../../types/crm.types";
import type { ClientEntity } from "@/shared/types/entities";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClientFormProps {
  open:        boolean;
  onClose:     () => void;
  client?:     Client;
  /** Called with the newly created client after a successful create. Not fired on edit. */
  onSuccess?:  (client: ClientEntity) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClientForm({ open, onClose, client, onSuccess }: ClientFormProps) {
  const isEdit = !!client;
  const { mutate: create, isPending: creating } = useCreateClient();
  const { mutate: update, isPending: updating } = useUpdateClient();
  const isPending = creating || updating;

  const [sameAsBilling, setSameAsBilling] = useState(true);

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: { client_type: "residential", contact_preference: "phone", status: "active" },
  });

  // Controlled values for Select components (react-hook-form reset won't update
  // uncontrolled Selects via defaultValue, so we use watch + value prop)
  const clientType  = watch("client_type")          ?? "residential";
  const contactPref = watch("contact_preference")   ?? "phone";

  // ── Populate form when editing ─────────────────────────────────────────────
  useEffect(() => {
    if (client) {
      setSameAsBilling(false);
      reset({
        full_name:          client.full_name,
        company:            client.company ?? undefined,
        phone:              formatPhoneDisplay(client.phone),
        email:              client.email,
        service_street:     client.service_street,
        service_apt:        client.service_apt ?? undefined,
        service_city:       client.service_city,
        service_state:      client.service_state,
        service_zip:        client.service_zip,
        billing_street:     client.billing_street,
        billing_apt:        client.billing_apt ?? undefined,
        billing_city:       client.billing_city,
        billing_state:      client.billing_state,
        billing_zip:        client.billing_zip,
        client_type:        client.client_type as ClientFormData["client_type"],
        contact_preference: client.contact_preference as ClientFormData["contact_preference"],
        instructions:       client.instructions ?? undefined,
        status:             client.status as ClientFormData["status"],
      });
    } else {
      setSameAsBilling(true);
      reset({ client_type: "residential", contact_preference: "phone", status: "active" });
    }
  }, [client, reset]);

  // ── "Same as billing" helpers ──────────────────────────────────────────────
  const billingWatched = watch([
    "billing_street", "billing_apt", "billing_city", "billing_state", "billing_zip",
  ]);

  const handleSameAsBillingToggle = (checked: boolean) => {
    setSameAsBilling(checked);
    if (checked) {
      const [street, apt, city, state, zip] = billingWatched;
      setValue("service_street", street ?? "");
      setValue("service_apt",    apt    ?? "");
      setValue("service_city",   city   ?? "");
      setValue("service_state",  state  ?? "");
      setValue("service_zip",    zip    ?? "");
    }
  };

  // Sync service fields live while "Same as billing" is checked
  const syncOnBillingChange = (
    field: "billing_street" | "billing_apt" | "billing_city" | "billing_state" | "billing_zip",
    value: string,
  ) => {
    if (!sameAsBilling) return;
    const map = {
      billing_street: "service_street",
      billing_apt:    "service_apt",
      billing_city:   "service_city",
      billing_state:  "service_state",
      billing_zip:    "service_zip",
    } as const;
    setValue(map[field], value);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = (data: ClientFormData) => {
    if (isEdit && client) {
      update({ id: client.id, payload: data }, { onSuccess: onClose });
    } else {
      create(data, {
        onSuccess: (createdClient) => {
          onSuccess?.(createdClient as unknown as ClientEntity);
          onClose();
        },
      });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          if ((e.target as HTMLElement).closest?.(".pac-container")) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Client" : "Add Client"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          className="space-y-4 mt-4"
        >

          {/* ── Personal Information ──────────────────────────────────── */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Personal Information
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Full Name *</Label>
              <Input {...register("full_name")} placeholder="John Doe" />
              {errors.full_name && (
                <p className="text-xs text-destructive">{errors.full_name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Company Name</Label>
              <Input {...register("company")} placeholder="Optional" />
            </div>
            <div className="space-y-1">
              <Label>Phone Number *</Label>
              <PhoneInput
                value={watch("phone") ?? ""}
                onChange={(v) => setValue("phone", v, { shouldValidate: true })}
                placeholder="(555) 000-0000"
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Email Address *</Label>
              <Input
                {...register("email")}
                type="email"
                placeholder="john@email.com"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* ── Billing Address ───────────────────────────────────────── */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Billing Address
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Street *</Label>
              <AddressAutocomplete
                value={billingWatched[0] ?? ""}
                onChange={(v) => {
                  setValue("billing_street", v);
                  syncOnBillingChange("billing_street", v);
                }}
                onAddressSelect={(c) => {
                  setValue("billing_street", c.street);
                  setValue("billing_city",   c.city);
                  setValue("billing_state",  c.state);
                  setValue("billing_zip",    c.zip);
                  syncOnBillingChange("billing_street", c.street);
                  syncOnBillingChange("billing_city",   c.city);
                  syncOnBillingChange("billing_state",  c.state);
                  syncOnBillingChange("billing_zip",    c.zip);
                }}
                error={!!errors.billing_street}
              />
              {errors.billing_street && (
                <p className="text-xs text-destructive">{errors.billing_street.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Apt/Suite</Label>
              <Input
                {...register("billing_apt", {
                  onChange: (e) => syncOnBillingChange("billing_apt", e.target.value),
                })}
                placeholder="Apt 4B"
              />
            </div>
            <div className="space-y-1">
              <Label>City *</Label>
              <Input
                {...register("billing_city", {
                  onChange: (e) => syncOnBillingChange("billing_city", e.target.value),
                })}
              />
              {errors.billing_city && (
                <p className="text-xs text-destructive">{errors.billing_city.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>State *</Label>
              <Input
                {...register("billing_state", {
                  onChange: (e) => syncOnBillingChange("billing_state", e.target.value),
                })}
              />
              {errors.billing_state && (
                <p className="text-xs text-destructive">{errors.billing_state.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Zip Code *</Label>
              <Input
                {...register("billing_zip", {
                  onChange: (e) => syncOnBillingChange("billing_zip", e.target.value),
                })}
              />
              {errors.billing_zip && (
                <p className="text-xs text-destructive">{errors.billing_zip.message}</p>
              )}
            </div>
          </div>

          {/* ── Service Address ───────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Service Address
            </p>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sameAsBilling}
                onChange={(e) => handleSameAsBillingToggle(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <span className="text-sm font-medium">Same as billing</span>
            </label>
          </div>
          <div className={`grid grid-cols-2 gap-3 ${sameAsBilling ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="col-span-2 space-y-1">
              <Label>Street *</Label>
              <Input
                {...register("service_street")}
                placeholder="123 Main St"
                disabled={sameAsBilling}
              />
              {errors.service_street && (
                <p className="text-xs text-destructive">{errors.service_street.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Apt/Suite</Label>
              <Input
                {...register("service_apt")}
                placeholder="Apt 4B"
                disabled={sameAsBilling}
              />
            </div>
            <div className="space-y-1">
              <Label>City *</Label>
              <Input {...register("service_city")} disabled={sameAsBilling} />
              {errors.service_city && (
                <p className="text-xs text-destructive">{errors.service_city.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>State *</Label>
              <Input {...register("service_state")} disabled={sameAsBilling} />
              {errors.service_state && (
                <p className="text-xs text-destructive">{errors.service_state.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Zip Code *</Label>
              <Input {...register("service_zip")} disabled={sameAsBilling} />
              {errors.service_zip && (
                <p className="text-xs text-destructive">{errors.service_zip.message}</p>
              )}
            </div>
          </div>

          {/* ── Business Details ──────────────────────────────────────── */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Business Details
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Client Type</Label>
              <Select
                value={clientType}
                onValueChange={(v) => setValue("client_type", v as ClientFormData["client_type"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Preferred Contact Method</Label>
              <Select
                value={contactPref}
                onValueChange={(v) => setValue("contact_preference", v as ClientFormData["contact_preference"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Instructions</Label>
              <Textarea
                {...register("instructions")}
                placeholder="Special instructions..."
                rows={3}
              />
            </div>
          </div>

          {/* ── Actions ───────────────────────────────────────────────── */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending
                ? (isEdit ? "Saving..." : "Adding...")
                : (isEdit ? "Save Changes" : "Add Client")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
