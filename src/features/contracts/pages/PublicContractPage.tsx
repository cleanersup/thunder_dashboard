/**
 * @module PublicContractPage
 * CON-9: Public contract acceptance page — no auth required (skeleton).
 */
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";

export function PublicContractPage() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-2">
        <LoadingSpinner />
        <p className="text-muted-foreground text-sm">Public Contract — coming in CON-9</p>
      </div>
    </div>
  );
}
