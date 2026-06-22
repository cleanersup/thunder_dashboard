/**
 * @module CommScopeStep — Step 4 (Commercial)
 * Scope / special instructions textarea.
 */
import { ClipboardList } from "lucide-react";
import { Textarea } from "@/shared/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

export interface CommScopeStepProps {
  scope:    string;
  onChange: (v: string) => void;
}

export function CommScopeStep({ scope, onChange }: CommScopeStepProps) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            Special Instruction
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Describe the details of what will be performed at the client&apos;s property
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            id="scopeDetails"
            placeholder="Enter a detailed description of the services to be performed..."
            value={scope}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[150px] resize-none"
          />
        </CardContent>
      </Card>
    </div>
  );
}
