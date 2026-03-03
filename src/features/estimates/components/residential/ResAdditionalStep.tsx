/**
 * @module ResAdditionalStep — Step 3 (Residential)
 * Additional services counter card.
 */
import { Plus, Minus, Fan, UtensilsCrossed, Refrigerator, Blinds, Frame } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import type { LucideIcon } from "lucide-react";

export interface ResAdditionalStepProps {
  fans:           number;
  oven:           number;
  refrigerator:   number;
  blinds:         number;
  windowsInside:  number;
  windowsOutside: number;
  onChange:       (field: string, value: number) => void;
}

function Counter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full"
        onClick={() => onChange(Math.max(0, value - 1))}>
        <Minus className="h-3 w-3" />
      </Button>
      <span className="w-6 text-center font-semibold">{value}</span>
      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full"
        onClick={() => onChange(value + 1)}>
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}

function Row({ label, icon: Icon, value, field, onChange }: {
  label: string; icon: LucideIcon; value: number; field: string;
  onChange: (field: string, value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">{label}</p>
      </div>
      <Counter value={value} onChange={(v) => onChange(field, v)} />
    </div>
  );
}

export function ResAdditionalStep({ fans, oven, refrigerator, blinds, windowsInside, windowsOutside, onChange }: ResAdditionalStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Additional</h2>
      <p className="text-sm text-muted-foreground">Add additional details to the estimate</p>
      <Card>
        <CardContent className="p-4 divide-y">
          <Row label="Fans"             icon={Fan}             value={fans}           field="fans"           onChange={onChange} />
          <Row label="Oven"             icon={UtensilsCrossed} value={oven}           field="oven"           onChange={onChange} />
          <Row label="Refrigerator"     icon={Refrigerator}    value={refrigerator}   field="refrigerator"   onChange={onChange} />
          <Row label="Blinds"           icon={Blinds}          value={blinds}         field="blinds"         onChange={onChange} />
          <Row label="Windows Inside"   icon={Frame}           value={windowsInside}  field="windowsInside"  onChange={onChange} />
          <Row label="Windows Outside"  icon={Frame}           value={windowsOutside} field="windowsOutside" onChange={onChange} />
        </CardContent>
      </Card>
    </div>
  );
}
