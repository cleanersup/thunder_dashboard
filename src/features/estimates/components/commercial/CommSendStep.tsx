/**
 * @module CommSendStep — Step 6 (Commercial)
 * Delivery method selection: Email / SMS / Both.
 */
import { Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { DeliveryMethodSelector } from "@/shared/components/DeliveryMethodSelector";

export type DeliveryMethod = "email" | "sms" | "both";

interface ClientInfo {
  name:  string;
  email: string;
  phone: string;
}

export interface CommSendStepProps {
  client:         ClientInfo | null;
  total:          number;
  deliveryMethod: DeliveryMethod | null;
  onChange:       (v: DeliveryMethod) => void;
  error?:         boolean;
}

const fmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function CommSendStep({ client, total, deliveryMethod, onChange, error }: CommSendStepProps) {
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
      {/* Summary banner */}
      <Card>
        <CardContent className="p-4 space-y-1">
          <p className="text-sm text-muted-foreground">
            Estimate ready for{" "}
            <span className="font-semibold text-foreground">{client?.name}</span>
          </p>
          <p className="text-2xl font-bold text-primary">{fmt(total)}</p>
        </CardContent>
      </Card>

      <DeliveryMethodSelector
        options={options}
        value={deliveryMethod}
        onChange={(v) => onChange(v as DeliveryMethod)}
        error={error}
      />
    </div>
  );
}
