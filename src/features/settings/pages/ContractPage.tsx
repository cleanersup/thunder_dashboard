import { FileSignature } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";

export function ContractPage() {
  return (
    <div className="min-h-full bg-background p-2.5 flex items-center justify-center">
      <Card className="border border-border/50 shadow-none w-full max-w-md">
        <CardContent className="p-10 flex flex-col items-center gap-4 text-center">
          <div className="p-4 rounded-full bg-primary/10">
            <FileSignature className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Contract Module</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Coming soon
            </p>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Soon you'll be able to create, manage, and sign your contracts directly from Thunder Pro.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
