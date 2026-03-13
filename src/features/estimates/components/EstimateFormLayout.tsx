/**
 * @module EstimateFormLayout
 * Shared sticky-header/tabs/footer shell used by both Residential and Commercial estimate pages.
 * Eliminates duplicated layout code between the two wizard pages.
 */
import type { ReactNode } from "react";
import { ChevronLeft, X } from "lucide-react";
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
  /** When true, uses flex-based full-height layout instead of min-h-screen */
  isModal?:     boolean;
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
  isModal,
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

  const stepTabs = (
    <div className="flex-shrink-0 bg-card border-b overflow-x-auto">
      <div className="px-4 flex justify-between gap-1 py-2">
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
            <span className="hidden sm:block text-center break-words line-clamp-3 max-w-[4rem] leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const footerButtons = (
    <div className={`${isModal ? "flex-shrink-0" : "sticky bottom-0"} bg-white rounded-lg border p-4 flex items-center justify-between gap-3`}>
      <Button
        variant="outline"
        size="sm"
        onClick={onBack}
        disabled={currentStep === 0 || isLoading}
      >
        Back
      </Button>
      <div className="flex items-center gap-2">
        {draftIndicator}
        <Button size="sm" onClick={onNext} disabled={isLoading}>
          {continueLabel}
        </Button>
      </div>
    </div>
  );

  // ── Modal layout ────────────────────────────────────────────────────────────
  if (isModal) {
    return (
      <div className="bg-muted h-full flex flex-col">
        {/* Header — full-width bar, content constrained like Invoice */}
        <div className="flex-shrink-0 bg-white border-b">
          <div className="max-w-2xl mx-auto">
            <div className="px-4 py-3 flex items-center justify-between gap-4">
              {/* Left: X + title + step info */}
              <div className="w-1/6"></div>
              <div className="w-2/3 text-center">
                <h1 className="font-semibold text-base leading-tight">{title}</h1>
                <p className="text-xs text-muted-foreground leading-tight">
                  Step {currentStep + 1} of {steps.length} — {steps[currentStep]?.label}
                </p>
              </div>

              {/* Right: draft badge + Back + Continue */}
              <div className="flex items-center w-1/6 justify-end">
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onExit}>
                  <X className="h-4 w-4" />
                </Button>

              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Tabs — inside max-w-2xl mx-auto px-4 to match form content width */}
          <div className="flex-shrink-0 bg-muted py-4">
            <div className="max-w-2xl mx-auto px-4">
              <div className="bg-white border rounded-lg px-4 py-4 space-y-2">
                <Progress
                  value={progress}
                  className="h-1 rounded-none"
                  style={{ "--progress-bar": "hsl(var(--green-vibrant))" } as React.CSSProperties}
                />
                <div className="flex justify-between gap-1 py-2">
                  {steps.map(({ icon: Icon, label }, i) => (
                    <div
                      key={i}
                      className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1 rounded text-[10px] transition-colors ${
                        i === currentStep
                          ? "text-primary font-semibold"
                          : i < currentStep
                          ? "text-muted-foreground"
                          : "text-muted-foreground/40"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:block text-center break-words line-clamp-3 max-w-[3.5rem] leading-tight">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable content — constrained to same width */}
          <div className="flex-1 min-h-0">
            <div className="max-w-2xl mx-auto px-4 space-y-4 py-6 pb-4">
              {children}
              {footerButtons}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Page layout ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-muted min-h-screen">
      <div className="w-full p-2.5">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white">
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

        {stepTabs}

        {/* Step content */}
        <div className="px-4 py-6 pb-24">
          {children}
        </div>

        {footerButtons}

      </div>
    </div>
  );
}
