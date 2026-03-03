/**
 * @module ResSendStep — Step 10 (Residential)
 * Delivery method selection: Email / SMS / Both.
 */
import { Mail, Phone, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";

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

interface OptionProps {
  method:         DeliveryMethod;
  selected:       boolean;
  onSelect:       (v: DeliveryMethod) => void;
  title:          React.ReactNode;
  description:    React.ReactNode;
  detail:         string;
}

function DeliveryOption({ method, selected, onSelect, title, description, detail }: OptionProps) {
  return (
    <div
      onClick={() => onSelect(method)}
      className={cn(
        "p-4 border rounded-lg cursor-pointer transition-all",
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
          selected ? "border-primary bg-primary" : "border-border"
        )}>
          {selected && <Check className="w-3 h-3 text-primary-foreground" />}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm flex items-center gap-2">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          <p className="text-xs text-muted-foreground mt-1">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export function ResSendStep({ client, deliveryMethod, onChange, error }: ResSendStepProps) {
  return (
    <div className="space-y-4">

      {/* Delivery method */}
      <Card>
        <CardHeader className="px-4 py-3 pb-0">
          <CardTitle className="text-sm font-medium">Choose Delivery Method</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-3 space-y-3">
          <DeliveryOption
            method="email"
            selected={deliveryMethod === "email"}
            onSelect={onChange}
            title={<><Mail className="w-4 h-4" /> Email Delivery</>}
            description={
              <>Send PDF estimate to{" "}
                <span className="font-medium text-foreground">{client?.email}</span>
              </>
            }
            detail="PDF Attachment • Professional Format"
          />

          <DeliveryOption
            method="sms"
            selected={deliveryMethod === "sms"}
            onSelect={onChange}
            title={<><Phone className="w-4 h-4" /> SMS Delivery</>}
            description={
              <>Send estimate link to{" "}
                <span className="font-medium text-foreground">{client?.phone}</span>
              </>
            }
            detail="Estimate Link • Quick Access"
          />

          <DeliveryOption
            method="both"
            selected={deliveryMethod === "both"}
            onSelect={onChange}
            title={<><Mail className="w-4 h-4" /><Phone className="w-4 h-4" /> Email + SMS Delivery</>}
            description="Send via both email and SMS for maximum reach"
            detail="Maximum Reach • Dual Delivery"
          />
        </CardContent>
      </Card>

      {error && (
        <p className="text-xs text-destructive">Please select a delivery method</p>
      )}
    </div>
  );
}
