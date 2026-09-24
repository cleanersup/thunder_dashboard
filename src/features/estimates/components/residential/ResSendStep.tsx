/**
 * @module ResSendStep — Step 10 (Residential)
 * Delivery method selection: Email / SMS / Both.
 */
import { Mail, Phone } from "lucide-react";
import { DeliveryMethodSelector } from "@/shared/components/DeliveryMethodSelector";

export type DeliveryMethod = "email" | "sms" | "both";

interface ClientInfo {
  name:  string;
  email: string;
  phone: string;
}

export interface ResSendStepProps {
  client:         ClientInfo | null;
  total:          number;
  deliveryMethod: DeliveryMethod | null;
  onChange:       (v: DeliveryMethod) => void;
  error?:         boolean;
}

export function ResSendStep({ client, deliveryMethod, onChange, error }: ResSendStepProps) {
  const options = [
    {
      value: "email",
      title: <><Mail className="w-4 h-4" /> Email Delivery</>,
      description: <>Send PDF estimate to{" "}<span className="font-medium text-foreground">{client?.email}</span></>,
      detail: "PDF Attachment • Professional Format",
    },
    {
      value: "sms",
      title: <><Phone className="w-4 h-4" /> SMS Delivery</>,
      description: <>Send estimate link to{" "}<span className="font-medium text-foreground">{client?.phone}</span></>,
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
        onChange={(v) => onChange(v as DeliveryMethod)}
        error={error}
      />
    </div>
  );
}
