/**
 * @module EstimateFormLayout
 * Shared sticky-header/tabs/footer shell used by both Residential and Commercial estimate pages.
 * Eliminates duplicated layout code between the two wizard pages.
 */
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import type { StepConfig } from "../config/steps.config";

interface EstimateFormLayoutProps {
  title:        string;
  steps:        StepConfig[];
  currentStep:  number;
  /** Navigate to previous step — disabled on step 0 */
  onBack:       () => void;
  onNext:       () => void;
  /** Always exits the form, showing the Save/Discard dialog */
  onExit:       () => void;
  isLastStep:   boolean;
  isLoading:    boolean;
  isEditing?:   boolean;
  children:     ReactNode;
  /** Optional draft status badge rendered inside the header */
  draftIndicator?: ReactNode;
  /** Label for the submit button (overrides default) */
  submitLabel?: string;
}

export function EstimateFormLayout({
  title,
  steps,
  currentStep,
  onBack,
  onNext,
  onExit,
  isLastStep,
  isLoading,
  isEditing,
  children,
  draftIndicator,
  submitLabel,
}: EstimateFormLayoutProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  const continueLabel = isLastStep
    ? (isLoading
        ? "Saving..."
        : submitLabel ?? (isEditing ? "Update Estimate" : "Create Estimate"))
    : "Continue";

  return (
    <div className="bg-muted min-h-screen">
      <div className="w-full p-2.5">

        {/* ── Sticky header ───────────────────────────────────────────── */}
        <div className="sticky top-0 z-10">
          <div className="px-4 py-4 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-white/10"
              onClick={onExit}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold">{title}</h1>
              <p className="text-xs">
                Step {currentStep + 1} of {steps.length} — {steps[currentStep]?.label}
              </p>
            </div>
            {draftIndicator && (
              <div className="flex-shrink-0">{draftIndicator}</div>
            )}
          </div>
          <Progress
            value={progress}
            className="h-1 rounded-none"
            style={{ "--progress-bar": "hsl(var(--green-vibrant))" } as React.CSSProperties}
          />
        </div>

        {/* ── Step tabs ────────────────────────────────────────────────── */}
        <div className="bg-card border-b overflow-x-auto">
          <div className="px-4 flex gap-1 py-2">
            {steps.map(({ icon: Icon, label }, i) => (
              <div
                key={i}
                className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1 rounded text-xs transition-colors ${
                  i === currentStep
                    ? "text-primary font-semibold"
                    : i < currentStep
                    ? "text-muted-foreground"
                    : "text-muted-foreground/40"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:block">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Step content ─────────────────────────────────────────────── */}
        <div className="px-4 py-6 pb-24">
          {children}
        </div>

        {/* ── Sticky footer ────────────────────────────────────────────── */}
        <div className="sticky bottom-0 bg-background border-t px-4 py-3 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={onBack}
            disabled={currentStep === 0 || isLoading}
          >
            Back
          </Button>
          <Button
            className="flex-1 h-12"
            onClick={onNext}
            disabled={isLoading}
          >
            {continueLabel}
          </Button>
        </div>

      </div>
    </div>
  );
}
