/**
 * @module ResQuickSendStep — paso de envío del Quick Quote (Residential)
 *
 * El equivalente de `ResSendStep` cuando el estimate no tiene cliente: además de
 * elegir el canal, aquí se piden los datos de la persona. Son los únicos datos
 * personales de todo el formulario, y se piden al final — cuando ya hay un precio
 * en pantalla que justifica pedirlos.
 *
 * Los campos aparecen según el canal elegido: email pide correo, SMS pide
 * teléfono, y "Email + SMS" pide los dos.
 */
import { Mail, Phone, User } from "lucide-react";
import { FormSection } from "@/shared/components/forms";
import { FloatingInput } from "@/shared/components/forms";
import { PhoneInput } from "@/shared/components/ui/phone-input";
import { withRequiredMark } from "@/shared/utils/formLabel";
import { DeliveryMethodSelector } from "@/shared/components/DeliveryMethodSelector";
import {
  quickQuoteNeedsEmail, quickQuoteNeedsPhone, type QuickQuoteContact,
} from "../../utils/quickQuote";
import type { DeliveryMethod } from "./ResSendStep";

export interface ResQuickSendStepProps {
  contact:        QuickQuoteContact;
  deliveryMethod: DeliveryMethod | null;
  onContactChange: (contact: QuickQuoteContact) => void;
  onDeliveryMethodChange: (method: DeliveryMethod) => void;
  errors?: Record<string, boolean>;
}

export function ResQuickSendStep({
  contact, deliveryMethod, onContactChange, onDeliveryMethodChange, errors = {},
}: ResQuickSendStepProps) {
  const patch = (field: keyof QuickQuoteContact, value: string) =>
    onContactChange({ ...contact, [field]: value });

  const options = [
    {
      value: "email",
      title: <><Mail className="w-4 h-4" /> Email Delivery</>,
      description: "Send PDF estimate to an email address",
      detail: "PDF Attachment • Professional Format",
    },
    {
      value: "sms",
      title: <><Phone className="w-4 h-4" /> SMS Delivery</>,
      description: "Send estimate link to a phone number",
      detail: "Estimate Link • Quick Access",
    },
    {
      value: "both",
      title: <><Mail className="w-4 h-4" /><Phone className="w-4 h-4" /> Email + SMS Delivery</>,
      description: "Send via both email and SMS for maximum reach",
      detail: "Maximum Reach • Dual Delivery",
    },
  ];

  return (
    <div className="space-y-4">
      <DeliveryMethodSelector
        options={options}
        value={deliveryMethod}
        onChange={(v) => onDeliveryMethodChange(v as DeliveryMethod)}
        error={errors.deliveryMethod}
      />

      {deliveryMethod && (
        <FormSection
          icon={User}
          title="Recipient"
          subtitle="Who receives this quote"
        >
          <FloatingInput
            id="quick-quote-name"
            label="Full name"
            value={contact.fullName}
            onChange={(v) => patch("fullName", v)}
            required
            error={errors.fullName}
          />

          {quickQuoteNeedsEmail(deliveryMethod) && (
            <FloatingInput
              id="quick-quote-email"
              label="Email"
              type="email"
              value={contact.email}
              onChange={(v) => patch("email", v)}
              required
              error={errors.email}
            />
          )}

          {quickQuoteNeedsPhone(deliveryMethod) && (
            <PhoneInput
              id="quick-quote-phone"
              floatingLabel
              label={withRequiredMark("Phone", true)}
              value={contact.phone}
              onChange={(v) => patch("phone", v)}
              error={errors.phone ? "Phone is required" : undefined}
            />
          )}
        </FormSection>
      )}
    </div>
  );
}
