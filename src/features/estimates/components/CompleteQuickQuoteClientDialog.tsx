/**
 * @module CompleteQuickQuoteClientDialog
 * Completa los datos que un quick quote no pidió, para poder convertirlo.
 *
 * Un quick quote se envía con lo mínimo — nombre y un canal de contacto — porque
 * pedir más por adelantado hacía abandonar el formulario. Cuando la persona
 * acepta y el trabajo va en serio, esos datos sí hacen falta: la tabla
 * `quick_quotes` no tiene cliente ni dirección, y un job sí los necesita.
 *
 * Este panel los pide una sola vez y resuelve el cliente — reutiliza el que ya
 * exista si el email o el nombre+teléfono coinciden, igual que la conversión de
 * requests: dos quick quotes a la misma persona no deben dejar dos clientes.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormSheet, FormBand, FloatingInput } from "@/shared/components/forms";
import { PhoneInput } from "@/shared/components/ui/phone-input";
import { AddressAutocomplete, type AddressComponents } from "@/shared/components/AddressAutocomplete";
import { withRequiredMark } from "@/shared/utils/formLabel";
import { formatPhoneDisplay } from "@/shared/utils/phoneInput";
import { resolveQuickQuoteClient } from "../services/quickQuoteService";

/** Campos de `jobs` que salen de este panel y que el prefill del backend no trae. */
export interface QuickQuoteJobOverrides {
  client_id:       string;
  contact_type:    "client";
  client_name:     string;
  client_email:    string | null;
  client_phone:    string | null;
  property_street: string;
  property_apt:    string | null;
  property_city:   string;
  property_state:  string;
  property_zip:    string;
}

export interface CompleteQuickQuoteClientDialogProps {
  open: boolean;
  onClose: () => void;
  quote: {
    id:              string;
    recipient_name:  string | null;
    recipient_email: string | null;
    recipient_phone: string | null;
  } | null;
  /** El cliente ya está resuelto; el llamador sigue con la conversión que pidió. */
  onCompleted: (overrides: QuickQuoteJobOverrides) => void;
}

interface FormState {
  fullName: string;
  email:    string;
  phone:    string;
  street:   string;
  apt:      string;
  city:     string;
  state:    string;
  zip:      string;
}

const EMPTY: FormState = {
  fullName: "", email: "", phone: "",
  street: "", apt: "", city: "", state: "", zip: "",
};

export function CompleteQuickQuoteClientDialog({
  open, onClose, quote, onCompleted,
}: CompleteQuickQuoteClientDialogProps) {
  const [form,      setForm]      = useState<FormState>(EMPTY);
  const [errors,    setErrors]    = useState<Record<string, boolean>>({});
  const [isSaving,  setIsSaving]  = useState(false);

  // Lo que el quick quote sí recogió viene ya escrito: solo falta lo que no pidió.
  useEffect(() => {
    if (!open || !quote) return;
    setForm({
      ...EMPTY,
      fullName: quote.recipient_name  ?? "",
      email:    quote.recipient_email ?? "",
      phone:    formatPhoneDisplay(quote.recipient_phone),
    });
    setErrors({});
  }, [open, quote]);

  const patch = (field: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: false }));
  };

  function handleAddressSelect(c: AddressComponents) {
    setForm((f) => ({ ...f, street: c.street, city: c.city, state: c.state, zip: c.zip }));
    setErrors((e) => ({ ...e, street: false, city: false, state: false, zip: false }));
  }

  function validate(): boolean {
    const errs: Record<string, boolean> = {};
    if (!form.fullName.trim()) errs.fullName = true;
    // Un cliente necesita al menos una vía de contacto; el quick quote garantiza una.
    if (!form.email.trim() && !form.phone.trim()) { errs.email = true; errs.phone = true; }
    if (!form.street.trim()) errs.street = true;
    if (!form.city.trim())   errs.city   = true;
    if (!form.state.trim())  errs.state  = true;
    if (!form.zip.trim())    errs.zip    = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!quote) return;
    if (!validate()) {
      toast.error("Please complete the required fields");
      return;
    }
    setIsSaving(true);
    try {
      const fullName = form.fullName.trim();
      const email    = form.email.trim();
      const street   = form.street.trim();
      const apt      = form.apt.trim();
      const city     = form.city.trim();
      const state    = form.state.trim();
      const zip      = form.zip.trim();

      const { clientId, reusedExisting } = await resolveQuickQuoteClient({
        fullName, email, phone: form.phone, street, apt, city, state, zip,
      });
      toast.success(reusedExisting ? "Linked to existing client" : "Client created");

      onCompleted({
        client_id:       clientId,
        contact_type:    "client",
        client_name:     fullName,
        client_email:    email || null,
        client_phone:    form.phone || null,
        property_street: street,
        property_apt:    apt || null,
        property_city:   city,
        property_state:  state,
        property_zip:    zip,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      title="Complete Client Details"
      subtitle="A job needs the full service address. Saving also adds this person to your clients."
      submitLabel="Save and Convert to Job"
      submitPendingLabel="Saving..."
      onSubmit={handleSubmit}
      isPending={isSaving}
    >
      <FormBand title="Contact">
        <FloatingInput
          id="qq-client-name"
          label="Full name"
          value={form.fullName}
          onChange={(v) => patch("fullName", v)}
          required
          error={errors.fullName}
        />
        <FloatingInput
          id="qq-client-email"
          label="Email"
          type="email"
          value={form.email}
          onChange={(v) => patch("email", v)}
          error={errors.email}
        />
        <PhoneInput
          id="qq-client-phone"
          floatingLabel
          label="Phone"
          value={form.phone}
          onChange={(v) => patch("phone", v)}
          error={errors.phone ? "Add an email or a phone number" : undefined}
        />
      </FormBand>

      <FormBand title="Service Address">
        <AddressAutocomplete
          value={form.street}
          onChange={(v) => patch("street", v)}
          onAddressSelect={handleAddressSelect}
          placeholder={withRequiredMark("Street address", true)}
          error={errors.street}
        />
        <FloatingInput
          id="qq-client-apt"
          label="Apt / Suite"
          value={form.apt}
          onChange={(v) => patch("apt", v)}
        />
        <FloatingInput
          id="qq-client-city"
          label="City"
          value={form.city}
          onChange={(v) => patch("city", v)}
          required
          error={errors.city}
        />
        <div className="grid grid-cols-2 gap-3">
          <FloatingInput
            id="qq-client-state"
            label="State"
            value={form.state}
            onChange={(v) => patch("state", v)}
            required
            error={errors.state}
          />
          <FloatingInput
            id="qq-client-zip"
            label="ZIP"
            type="integer"
            value={form.zip}
            onChange={(v) => patch("zip", v)}
            required
            error={errors.zip}
          />
        </div>
      </FormBand>
    </FormSheet>
  );
}
