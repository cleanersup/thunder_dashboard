/**
 * @module ClientForm
 * Modal dialog form for creating or editing a client.
 * Used by: CRM, estimates, and invoices (shared single source of truth).
 * Texts and validations match swift-slate AddClient / EditClient pages.
 */
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormSheet, FormBand, FloatingInput, SelectField, TextareaField,
} from "@/shared/components/forms";
import { withRequiredMark } from "@/shared/utils/formLabel";
import { clientSchema, type ClientFormData } from "../schemas/clientSchema";

const CLIENT_TYPE_OPTIONS = [
  { value: "residential", label: "Residential" },
  { value: "commercial",  label: "Commercial" },
] as const;

const CONTACT_PREFERENCE_OPTIONS = [
  { value: "phone",    label: "Phone" },
  { value: "email",    label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
] as const;
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
    handleSubmit, reset, setValue, watch,
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
    <FormSheet
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Client" : "Add Client"}
      submitLabel={isEdit ? "Save Changes" : "Add Client"}
      submitPendingLabel={isEdit ? "Saving..." : "Adding..."}
      onSubmit={handleSubmit(onSubmit)}
      isPending={isPending}
    >
      <div className="contents" onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}>

          <FormBand title="Personal Information">
            <FloatingInput
              id="client-full-name"
              label="Full Name"
              value={watch("full_name") ?? ""}
              onChange={(v) => setValue("full_name", v, { shouldValidate: true })}
              required
              error={errors.full_name?.message}
            />
            <div className="grid grid-cols-2 gap-3">
              <FloatingInput
                id="client-company"
                label="Company Name"
                value={watch("company") ?? ""}
                onChange={(v) => setValue("company", v)}
              />
              <PhoneInput
                id="client-phone"
                floatingLabel
                label={withRequiredMark("Phone Number", true)}
                value={watch("phone") ?? ""}
                onChange={(v) => setValue("phone", v, { shouldValidate: true })}
                error={errors.phone?.message}
              />
            </div>
            <FloatingInput
              id="client-email"
              label="Email Address"
              type="email"
              value={watch("email") ?? ""}
              onChange={(v) => setValue("email", v, { shouldValidate: true })}
              required
              error={errors.email?.message}
            />
          </FormBand>

          <FormBand title="Billing Address">
            <div className="space-y-1.5">
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
                placeholder={withRequiredMark("Street", true)}
                error={!!errors.billing_street}
              />
              {errors.billing_street && (
                <p className="text-xs text-destructive">{errors.billing_street.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FloatingInput
                id="client-billing-apt"
                label="Apt / Suite"
                value={watch("billing_apt") ?? ""}
                onChange={(v) => { setValue("billing_apt", v); syncOnBillingChange("billing_apt", v); }}
              />
              <FloatingInput
                id="client-billing-city"
                label="City"
                value={watch("billing_city") ?? ""}
                onChange={(v) => { setValue("billing_city", v, { shouldValidate: true }); syncOnBillingChange("billing_city", v); }}
                required
                error={errors.billing_city?.message}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FloatingInput
                id="client-billing-state"
                label="State"
                value={watch("billing_state") ?? ""}
                onChange={(v) => { setValue("billing_state", v, { shouldValidate: true }); syncOnBillingChange("billing_state", v); }}
                required
                error={errors.billing_state?.message}
              />
              <FloatingInput
                id="client-billing-zip"
                label="Zip Code"
                type="integer"
                value={watch("billing_zip") ?? ""}
                onChange={(v) => { setValue("billing_zip", v, { shouldValidate: true }); syncOnBillingChange("billing_zip", v); }}
                required
                error={errors.billing_zip?.message}
              />
            </div>
          </FormBand>

          <FormBand
            title="Service Address"
            action={
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) => handleSameAsBillingToggle(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
                <span className="text-sm font-medium">Same as billing</span>
              </label>
            }
          >
            <div className={sameAsBilling ? "space-y-3 opacity-50 pointer-events-none" : "space-y-3"}>
              <FloatingInput
                id="client-service-street"
                label="Street"
                value={watch("service_street") ?? ""}
                onChange={(v) => setValue("service_street", v, { shouldValidate: true })}
                required
                disabled={sameAsBilling}
                error={errors.service_street?.message}
              />
              <div className="grid grid-cols-2 gap-3">
                <FloatingInput
                  id="client-service-apt"
                  label="Apt / Suite"
                  value={watch("service_apt") ?? ""}
                  onChange={(v) => setValue("service_apt", v)}
                  disabled={sameAsBilling}
                />
                <FloatingInput
                  id="client-service-city"
                  label="City"
                  value={watch("service_city") ?? ""}
                  onChange={(v) => setValue("service_city", v, { shouldValidate: true })}
                  required
                  disabled={sameAsBilling}
                  error={errors.service_city?.message}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FloatingInput
                  id="client-service-state"
                  label="State"
                  value={watch("service_state") ?? ""}
                  onChange={(v) => setValue("service_state", v, { shouldValidate: true })}
                  required
                  disabled={sameAsBilling}
                  error={errors.service_state?.message}
                />
                <FloatingInput
                  id="client-service-zip"
                  label="Zip Code"
                  type="integer"
                  value={watch("service_zip") ?? ""}
                  onChange={(v) => setValue("service_zip", v, { shouldValidate: true })}
                  required
                  disabled={sameAsBilling}
                  error={errors.service_zip?.message}
                />
              </div>
            </div>
          </FormBand>

          <FormBand title="Business Details">
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                placeholder="Client type"
                value={clientType}
                onChange={(v) => setValue("client_type", v as ClientFormData["client_type"])}
                options={CLIENT_TYPE_OPTIONS}
              />
              <SelectField
                placeholder="Preferred contact method"
                value={contactPref}
                onChange={(v) => setValue("contact_preference", v as ClientFormData["contact_preference"])}
                options={CONTACT_PREFERENCE_OPTIONS}
              />
            </div>
            <TextareaField
              id="client-instructions"
              label="Instructions"
              placeholder="Special instructions..."
              value={watch("instructions") ?? ""}
              onChange={(v) => setValue("instructions", v)}
            />
          </FormBand>

      </div>
    </FormSheet>
  );
}
