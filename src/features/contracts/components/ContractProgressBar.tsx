/**
 * @module ContractProgressBar
 * Step indicator for the contract creation wizard (Details → Policies → Preview).
 */
import { Check } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface ContractProgressBarProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  { label: "Details",  step: 1 as const },
  { label: "Policies", step: 2 as const },
  { label: "Preview",  step: 3 as const },
];

export function ContractProgressBar({ currentStep }: ContractProgressBarProps) {
  return (
    <div className="flex-shrink-0 py-4">
      <div className="max-w-2xl mx-auto px-4">
        <div className=" bg-card border rounded-lg px-4 py-4 flex items-center justify-center gap-0">
          {STEPS.map((s, i) => {
            const isCompleted = currentStep > s.step;
            const isActive    = currentStep === s.step;
            const isLast      = i === STEPS.length - 1;

            return (
              <div key={s.step} className="flex items-center">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center transition-colors text-[10px] font-bold",
                      isCompleted ? "bg-primary text-primary-foreground"
                      : isActive  ? "bg-primary text-primary-foreground"
                      : "bg-border text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : s.step}
                  </div>
                  <span
                    className={cn(
                      "text-xs",
                      isActive    ? "text-foreground font-medium"
                      : isCompleted ? "text-muted-foreground"
                      : "text-muted-foreground/60"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-10 h-px mx-3 transition-colors",
                      isCompleted ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
