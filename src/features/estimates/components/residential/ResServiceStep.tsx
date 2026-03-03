/**
 * @module ResServiceStep — Step 1 (Residential)
 * Service type grid + optional square footage input.
 * Selecting "Post Construction" opens a sub-type picker dialog.
 */
import { useState } from "react";
import { HardHat } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import { toIntegerString } from "@/shared/utils/numericInput";
import { cn } from "@/shared/utils/cn";

const SERVICE_OPTIONS = [
  "Deep Cleaning",
  "Once a week",
  "Bi-weekly",
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
  const [showDialog, setShowDialog] = useState(false);

  function handleServiceClick(svc: string) {
    onServiceChange(svc);
    if (svc === "Post Construction") {
      setShowDialog(true);
    }
  }

  function handlePostConstructionSelect(type: string) {
    onPostConstructionTypeChange(type);
    setShowDialog(false);
  }

  return (
    <>
      <div className="space-y-5">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Select Service Type</h2>
          <div className="grid grid-cols-2 gap-3">
            {SERVICE_OPTIONS.map((svc) => (
              <div
                key={svc}
                onClick={() => handleServiceClick(svc)}
                className={cn(
                  "p-4 rounded-lg border cursor-pointer transition-all",
                  service === svc
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <p className="text-sm font-medium text-center">{svc}</p>
                {svc === "Post Construction" && service === "Post Construction" && postConstructionType && (
                  <p className="text-xs text-primary text-center mt-1">{postConstructionType}</p>
                )}
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-destructive">Please select a service type</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Square Footage</Label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="e.g. 1500"
            value={squareFootage}
            onChange={(e) => onSqftChange(toIntegerString(e.target.value))}
          />
        </div>
      </div>

      {/* Post Construction sub-type dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardHat className="h-5 w-5" />
              Post Construction Service Type
            </DialogTitle>
            <DialogDescription>
              Select the type of post-construction cleaning service
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {POST_CONSTRUCTION_TYPES.map(({ label, description }) => (
              <Button
                key={label}
                variant="outline"
                onClick={() => handlePostConstructionSelect(label)}
                className={cn(
                  "w-full h-auto flex flex-col items-start gap-1 p-4 text-left",
                  postConstructionType === label && "border-primary bg-primary/10"
                )}
              >
                <span className="font-semibold text-sm">{label}</span>
                <span className="text-xs text-muted-foreground font-normal">{description}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
