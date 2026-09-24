/**
 * @module ResPetsStep — Step 5 (Residential)
 * Yes/No pet selection.
 */
import { PawPrint, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";

export interface ResPetsStepProps {
  pets:     "yes" | "no" | null;
  onChange: (v: "yes" | "no") => void;
  error?:   boolean;
}

export function ResPetsStep({ pets, onChange, error }: ResPetsStepProps) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <PawPrint className="h-5 w-5 text-muted-foreground" />
            Pets
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Let us know if there are pets in the home</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => onChange("yes")}
              className={cn(
                "flex flex-col items-center justify-center gap-3 p-8 rounded-lg border cursor-pointer transition-all",
                pets === "yes"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              <PawPrint className="h-8 w-8" />
              <p className="text-sm font-semibold text-center">Yes, I have pets</p>
            </div>
            <div
              onClick={() => onChange("no")}
              className={cn(
                "flex flex-col items-center justify-center gap-3 p-8 rounded-lg border cursor-pointer transition-all",
                pets === "no"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              <X className="h-8 w-8" />
              <p className="text-sm font-semibold text-center">No pets</p>
            </div>
          </div>
          {error && <p className="text-xs text-destructive">Please select an option</p>}
        </CardContent>
      </Card>
    </div>
  );
}
