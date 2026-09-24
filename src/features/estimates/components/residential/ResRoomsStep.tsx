/**
 * @module ResRoomsStep — Step 2 (Residential)
 * Room counters card.
 */
import { Plus, Minus, Bed, ChefHat, Sofa, Utensils, Monitor, Bath, Home } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import type { LucideIcon } from "lucide-react";

export interface ResRoomsStepProps {
  bedrooms:    number;
  kitchens:    number;
  livingRooms: number;
  diningRooms: number;
  offices:     number;
  fullBaths:   number;
  halfBaths:   number;
  onChange:    (field: string, value: number) => void;
  error?:      boolean;
}

function Counter({ value, onChange, min = 0 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full"
        onClick={() => onChange(Math.max(min, value - 1))}>
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

export function ResRoomsStep({ bedrooms, kitchens, livingRooms, diningRooms, offices, fullBaths, halfBaths, onChange, error }: ResRoomsStepProps) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Home className="h-5 w-5 text-muted-foreground" />
            Main Data
          </h2>
          <p className="text-sm text-muted-foreground">Specify the rooms and areas to be cleaned</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 divide-y">
            <Row label="Bedrooms"     icon={Bed}      value={bedrooms}    field="bedrooms"    onChange={onChange} />
            <Row label="Kitchen"      icon={ChefHat}  value={kitchens}    field="kitchens"    onChange={onChange} />
            <Row label="Living Room"  icon={Sofa}     value={livingRooms} field="livingRooms" onChange={onChange} />
            <Row label="Dining Room"  icon={Utensils} value={diningRooms} field="diningRooms" onChange={onChange} />
            <Row label="Office"       icon={Monitor}  value={offices}     field="offices"     onChange={onChange} />
            <Row label="Full Bath"    icon={Bath}     value={fullBaths}   field="fullBaths"   onChange={onChange} />
            <Row label="Half Bath"    icon={Bath}     value={halfBaths}   field="halfBaths"   onChange={onChange} />
          </div>
          {error && <p className="text-xs text-destructive">Please add at least one room</p>}
        </CardContent>
      </Card>
    </div>
  );
}
