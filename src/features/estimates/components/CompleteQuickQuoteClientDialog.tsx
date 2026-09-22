/**
 * @module CompleteQuickQuoteClientDialog
 * Completa los datos que un quick quote no pidió, para poder convertirlo.
 *
 * Un quick quote se envía con lo mínimo — nombre y un canal de contacto — porque
 * pedir más por adelantado hacía abandonar el formulario. Cuando la persona
 * acepta y el trabajo va en serio (job o contrato), esos datos sí hacen falta:
 * este panel los pide una sola vez, crea el cliente y deja el estimate enlazado.
 *
 * Reutiliza un cliente existente si el email o el nombre+teléfono ya están en la
 * cartera, igual que `resolveOrCreateContact` hace al convertir un request: dos
 * quick quotes a la misma persona no deben dejar dos clientes.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormSheet, FormBand, FloatingInput } from "@/shared/components/forms";
import { PhoneInput } from "@/shared/components/ui/phone-input";
import { AddressAutocomplete, type AddressComponents } from "@/shared/components/AddressAutocomplete";
import { withRequiredMark } from "@/shared/utils/formLabel";
import { formatPhoneDisplay } from "@/shared/utils/phoneInput";
import { resolveQuickQuoteClient } from "../services/quickQuoteService";

export interface CompleteQuickQuoteClientDialogProps {
  open: boolean;
  onClose: () => void;
  estimate: {
    id:          string;
    client_name: string;
    email:       string | null;
    phone:       string | null;
  } | null;
  /**
   * El estimate ya está enlazado al cliente resuelto. Recibe la fila actualizada
   * para que el llamador siga con la conversión que había pedido.
   */
  onCompleted: (updated: { client_id: string; address: string; apt: string | null; city: string; state: string; zip: string; client_name: string; email: string; phone: string }) => void;
  /** Qué se va a hacer después — solo para el texto del botón. */
  action: "job" | "contract";
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
  open, onClose, estimate, onCompleted, action,
}: CompleteQuickQuoteClientDialogProps) {
  const [form,      setForm]      = useState<FormState>(EMPTY);
  const [errors,    setErrors]    = useState<Record<string, boolean>>({});
  const [isSaving,  setIsSaving]  = useState(false);

  // Lo que el quick quote sí recogió viene ya escrito: solo falta lo que no pidió.
  useEffect(() => {
    if (!open || !estimate) return;
    setForm({
      ...EMPTY,
      fullName: estimate.client_name ?? "",
      email:    estimate.email ?? "",
      phone:    formatPhoneDisplay(estimate.phone),
    });
    setErrors({});
  }, [open, estimate]);

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
    if (!estimate) return;
    if (!validate()) {
      toast.error("Please complete the required fields");
      return;
    }
    setIsSaving(true);
    try {
      const result = await resolveQuickQuoteClient({
        estimateId: estimate.id,
        fullName:   form.fullName.trim(),
        email:      form.email.trim(),
        phone:      form.phone,
        street:     form.street.trim(),
        apt:        form.apt.trim(),
        city:       form.city.trim(),
        state:      form.state.trim(),
        zip:        form.zip.trim(),
      });
      toast.success(result.reusedExisting ? "Linked to existing client" : "Client created");
      onCompleted(result.estimateFields);
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
      subtitle={action === "job"
        ? "A job needs the full service address. Saving also adds this person to your clients."
        : "A contract needs the full service address. Saving also adds this person to your clients."}
      submitLabel={action === "job" ? "Save and Convert to Job" : "Save and Continue"}
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
