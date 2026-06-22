/**
 * @module SubscriptionPlansPage
 * Standalone route wrapper for subscription plans.
 * Renders the shared SubscriptionPlansContent with a back button header.
 */
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Lock } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { SubscriptionPlansContent } from "../components/SubscriptionPlansContent";

export function SubscriptionPlansPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const message = (location.state as { message?: string } | null)?.message;

  return (
    <div className="min-h-full bg-background p-2.5 space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Subscription Plans</h1>
      </div>

      {/* Upgrade prompt when redirected from a locked feature */}
      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
          <Lock className="h-4 w-4 shrink-0 text-primary" />
          <span>{message}</span>
        </div>
      )}

      <SubscriptionPlansContent />
    </div>
  );
}
