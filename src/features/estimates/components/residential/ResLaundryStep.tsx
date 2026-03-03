/**
 * @module ResLaundryStep — Step 6 (Residential)
 * Laundry service options + pounds counter.
 */
import { Plus, Minus, Droplets, Shirt, Info } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/utils/cn";

export interface ResLaundryStepProps {
  laundryService: "wash-dry" | "wash-dry-fold" | null;
  laundryPounds:  number;
  onServiceChange: (v: "wash-dry" | "wash-dry-fold" | null) => void;
  onPoundsChange:  (v: number) => void;
}

export function ResLaundryStep({ laundryService, laundryPounds, onServiceChange, onPoundsChange }: ResLaundryStepProps) {
  const handleSelect = (key: "wash-dry" | "wash-dry-fold") => {
    if (laundryService === key) {
      onServiceChange(null);
      onPoundsChange(0);
    } else {
      onServiceChange(key);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Laundry</h2>
      <p className="text-sm text-muted-foreground">Add laundry services if needed</p>

      {/* Wash and dry */}
      <div
        onClick={() => handleSelect("wash-dry")}
        className={cn(
          "border rounded-lg p-4 cursor-pointer transition-colors",
          laundryService === "wash-dry"
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/50"
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            <Label className="text-sm font-medium cursor-pointer">Wash and dry clothes</Label>
          </div>

          {laundryService === "wash-dry" && (
            <>
              <span className="text-sm text-primary">Pounds to wash</span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => { e.stopPropagation(); onPoundsChange(Math.max(0, laundryPounds - 1)); }}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-medium min-w-[3ch] text-center">{laundryPounds}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => { e.stopPropagation(); onPoundsChange(laundryPounds + 1); }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Wash, dry and fold */}
      <div
        onClick={() => handleSelect("wash-dry-fold")}
        className={cn(
          "border rounded-lg p-4 cursor-pointer transition-colors",
          laundryService === "wash-dry-fold"
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/50"
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Shirt className="h-4 w-4" />
            <Label className="text-sm font-medium cursor-pointer">Wash, dry and fold clothes</Label>
          </div>

          {laundryService === "wash-dry-fold" && (
            <>
              <span className="text-sm text-primary">Pounds to wash</span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => { e.stopPropagation(); onPoundsChange(Math.max(0, laundryPounds - 1)); }}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-medium min-w-[3ch] text-center">{laundryPounds}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => { e.stopPropagation(); onPoundsChange(laundryPounds + 1); }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <Card className="border-info-subtle-border bg-info-subtle/50">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-info shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-info-subtle-foreground">Laundry Services Details:</p>
            <p className="text-sm text-info-subtle-foreground">
              It&apos;s important to ask the customer approximately how many pounds of laundry they want washed.
              This information will allow you to calculate a fair price based on the actual volume of the service.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
