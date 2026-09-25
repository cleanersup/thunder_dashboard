/**
 * @module ResServiceStep — Step 1 (Residential)
 * Service type grid + optional square footage input.
 * Selecting "Post Construction" opens a sub-type picker dialog.
 */
import { HardHat, Briefcase, Maximize2 } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { toIntegerString } from "@/shared/utils/numericInput";
import { cn } from "@/shared/utils/cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { FormSection } from "@/shared/components/forms";

const SERVICE_OPTIONS = [
  "Deep Cleaning",
  "Once a week",
  "Bi-weekly",
  "Once a month",
  "Move In",
  "Move Out",
  "Post Construction",
];

const POST_CONSTRUCTION_TYPES: { label: string; description: string }[] = [
  {
    label: "Rough Cleaning or Initial Cleaning",
    description: "Initial cleaning after major construction work",
  },
  {
    label: "Light Cleaning or Second Cleaning",
    description: "Light cleaning for minor construction renovation",
  },
  {
    label: "Touch-Up or Final Cleaning",
    description: "Final detailed cleaning before project completion",
  },
];

export interface ResServiceStepProps {
  service:                     string;
  squareFootage:               string;
  postConstructionType:        string | null;
  onServiceChange:             (v: string) => void;
  onSqftChange:                (v: string) => void;
  onPostConstructionTypeChange:(v: string) => void;
  error?:                      boolean;
}

export function ResServiceStep({
  service, squareFootage, postConstructionType,
  onServiceChange, onSqftChange, onPostConstructionTypeChange, error,
}: ResServiceStepProps) {
  return (
    <div className="space-y-5">
      <FormSection
        icon={Briefcase}
        title="Select Service Type"
      >
          <div className="grid grid-cols-2 gap-3">
            {SERVICE_OPTIONS.map((svc) => (
              <div
                key={svc}
                onClick={() => onServiceChange(svc)}
                className={cn(
                  "p-4 rounded-lg border cursor-pointer transition-all",
                  service === svc
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <p className="text-sm font-medium text-center">{svc}</p>
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-destructive">Please select a service type</p>}

          {/* El subtipo aparece aquí mismo al elegir Post Construction: son tres
              opciones y precisan la elección de arriba, así que no merecen un
              diálogo encima del panel — eso apilaba un modal sobre otro y
              escondía el servicio que se acababa de elegir. */}
          {service === "Post Construction" && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2">
                <HardHat className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Which post-construction cleaning?</p>
              </div>
              <div className="space-y-2">
                {POST_CONSTRUCTION_TYPES.map(({ label, description }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onPostConstructionTypeChange(label)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      postConstructionType === label
                        ? "border-primary bg-primary/10"
                        : "border-input bg-background hover:border-primary/60"
                    )}
                  >
                    <span className="block font-medium text-sm">{label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
</FormSection>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
            Square Footage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="e.g. 1500"
            value={squareFootage}
            onChange={(e) => onSqftChange(toIntegerString(e.target.value))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
