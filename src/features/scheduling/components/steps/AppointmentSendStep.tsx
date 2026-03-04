import { Mail, Phone } from "lucide-react";
import { DeliveryMethodSelector } from "@/shared/components/DeliveryMethodSelector";
import type { AppointmentFormData } from "../../types/scheduling.types";

type DeliveryMethod = NonNullable<AppointmentFormData["delivery_method"]>;

interface Props {
  deliveryMethod: DeliveryMethod | null;
  clientEmail: string;
  clientPhone: string;
  onChange: (v: DeliveryMethod) => void;
  error?: boolean;
}

export function AppointmentSendStep({
  deliveryMethod,
  clientEmail,
  clientPhone,
  onChange,
  error,
}: Props) {
  const options = [
    {
      value: "email",
      title: <><Mail className="w-4 h-4" /> Email Delivery</>,
      description: (
        <>
          Send PDF to{" "}
          <span className="font-medium text-foreground">{clientEmail || "—"}</span>
        </>
      ),
      detail: "PDF Attachment • Professional Format",
    },
    {
      value: "sms",
      title: <><Phone className="w-4 h-4" /> SMS Delivery</>,
      description: (
        <>
          Send appointment link to{" "}
          <span className="font-medium text-foreground">{clientPhone || "—"}</span>
        </>
      ),
      detail: "Appointment Link • Quick Access",
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
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Choose Delivery Method</h2>
      </div>

      <DeliveryMethodSelector
        options={options}
        value={deliveryMethod}
        onChange={(v) => onChange(v as DeliveryMethod)}
        error={error}
      />
    </div>
  );
}
