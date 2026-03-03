/**
 * @module CommScopeStep — Step 4 (Commercial)
 * Scope / special instructions textarea.
 */
import { Textarea } from "@/shared/components/ui/textarea";

export interface CommScopeStepProps {
  scope:    string;
  onChange: (v: string) => void;
}

export function CommScopeStep({ scope, onChange }: CommScopeStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Special Instruction</h2>
      <p className="text-sm text-muted-foreground">
        Describe the details of what will be performed at the client&apos;s property
      </p>
      <div className="space-y-2">
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
