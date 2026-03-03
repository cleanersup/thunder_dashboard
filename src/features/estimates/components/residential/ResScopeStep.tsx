/**
 * @module ResScopeStep — Step 7 (Residential)
 * Special instructions textarea.
 */
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

export interface ResScopeStepProps {
  scope:    string;
  onChange: (v: string) => void;
}

export function ResScopeStep({ scope, onChange }: ResScopeStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Special Instruction</h2>
      <p className="text-sm text-muted-foreground">
        Describe the details of what will be performed at the client&apos;s property
      </p>
      <div className="space-y-2">
        <Label htmlFor="scopeDetails">Service Details</Label>
        <Textarea
          id="scopeDetails"
          placeholder="Enter a detailed description of the services to be performed..."
          value={scope}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[150px] resize-none"
        />
      </div>
    </div>
  );
}
