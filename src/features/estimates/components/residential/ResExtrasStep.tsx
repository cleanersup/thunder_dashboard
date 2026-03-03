/**
 * @module ResExtrasStep — Step 4 (Residential)
 * Extra service toggle buttons (2-column grid).
 */
import {
  Square, TreePine, SquareStack, Layers, Archive,
  Package, UtensilsCrossed, MoveRight, ArrowDown, Info,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
import type { LucideIcon } from "lucide-react";

export interface ExtrasState {
  baseboard: boolean; patio: boolean; walls: boolean; stairs: boolean;
  cabinetInside: boolean; cabinetOutside: boolean; washDishes: boolean;
  hallways: boolean; basement: boolean;
}

export interface ResExtrasStepProps {
  extras:   ExtrasState;
  onChange: (key: keyof ExtrasState, value: boolean) => void;
}

const EXTRAS: { key: keyof ExtrasState; label: string; icon: LucideIcon }[] = [
  { key: "baseboard",     label: "Baseboard",       icon: Square         },
  { key: "patio",         label: "Patio",            icon: TreePine       },
  { key: "walls",         label: "Walls",            icon: SquareStack    },
  { key: "stairs",        label: "Stairs",           icon: Layers         },
  { key: "cabinetInside", label: "Cabinet Inside",   icon: Archive        },
  { key: "cabinetOutside",label: "Cabinets Outside", icon: Package        },
  { key: "washDishes",    label: "Wash Dishes",      icon: UtensilsCrossed},
  { key: "hallways",      label: "Hallways",         icon: MoveRight      },
  { key: "basement",      label: "Basement",         icon: ArrowDown      },
];

export function ResExtrasStep({ extras, onChange }: ResExtrasStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Extra</h2>
      <p className="text-sm text-muted-foreground">Add extra details to the cleaning estimate</p>

      <div className="grid grid-cols-2 gap-3">
        {EXTRAS.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            onClick={() => onChange(key, !extras[key])}
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-4 rounded-lg border cursor-pointer transition-all",
              extras[key]
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/50"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium text-center">{label}</span>
          </div>
        ))}
      </div>

      <Card className="border-info-subtle-border bg-info-subtle/50">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
          <p className="text-xs text-info-subtle-foreground">
            Suggesting extra services to clients can significantly increase your profit margins.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
