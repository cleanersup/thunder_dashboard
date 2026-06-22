/**
 * @module DeliveryMethodSelector
 * Reusable delivery method picker used by estimate send steps and invoice preview.
 * Renders a list of option cards with a radio-style selection indicator.
 */
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeliveryOption {
  value:       string;
  title:       ReactNode;
  description: ReactNode;
  detail:      string;
}

interface DeliveryMethodSelectorProps {
  options:  DeliveryOption[];
  value:    string | null;
  onChange: (v: string) => void;
  error?:   boolean;
}

// ─── Option card ──────────────────────────────────────────────────────────────

function OptionCard({ option, selected, onSelect }: {
  option:   DeliveryOption;
  selected: boolean;
  onSelect: (v: string) => void;
}) {
  return (
    <div
      onClick={() => onSelect(option.value)}
      className={cn(
        "p-4 border rounded-lg cursor-pointer transition-all",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50",
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
          selected ? "border-primary bg-primary" : "border-border",
        )}>
          {selected && <Check className="w-3 h-3 text-primary-foreground" />}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm flex items-center gap-2">{option.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
          <p className="text-xs text-muted-foreground mt-1">{option.detail}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Selector ─────────────────────────────────────────────────────────────────

export function DeliveryMethodSelector({ options, value, onChange, error }: DeliveryMethodSelectorProps) {
  return (
    <Card>
      <CardHeader className="px-4 py-3 pb-0">
        <CardTitle className="text-sm font-medium">Choose Delivery Method</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-3 space-y-3">
        {options.map((opt) => (
          <OptionCard
            key={opt.value}
            option={opt}
            selected={value === opt.value}
            onSelect={onChange}
          />
        ))}
      </CardContent>
      {error && (
        <p className="px-4 pb-3 text-xs text-destructive">
          Please select a delivery method
        </p>
      )}
    </Card>
  );
}
