/**
 * @module SubscriptionPlansPage
 * Standalone route wrapper for subscription plans.
 * Renders the shared SubscriptionPlansContent with a back button header.
 */
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { SubscriptionPlansContent } from "../components/SubscriptionPlansContent";

export function SubscriptionPlansPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-background p-2.5 space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Subscription Plans</h1>
      </div>

      <SubscriptionPlansContent />
    </div>
  );
}
