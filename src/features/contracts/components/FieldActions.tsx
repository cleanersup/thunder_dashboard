/**
 * @module FieldActions
 * Contextual action buttons for contract text fields (Details step + Clauses step).
 *
 * Implements a 6-state machine so each field always shows the correct action set:
 *
 *   EMPTY_NO_DEFAULT   → [Generate]
 *   EMPTY_WITH_DEFAULT → [Use saved]  [Generate]
 *   FILLED_USER        → [Save as default]  [Clear]
 *   FILLED_DEFAULT     →                    [Clear]
 *   MODIFIED_DEFAULT   → [Update default]   [Clear]
 *
 * The parent owns `value`, `defaultValue`, and `source`.
 * This component is pure-render: it fires callbacks, never mutates.
 */
import { Sparkles, RotateCcw, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { deriveFieldState, type FieldSource } from "./fieldActions.utils";
export type { FieldSource } from "./fieldActions.utils";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface FieldActionsProps {
  value:            string;
  defaultValue?:    string;
  source:           FieldSource;
  isGenerating?:    boolean;
  isSaving?:        boolean;
  /** Hides the Generate / Try again action (used for manual-only fields). */
  disableGenerate?: boolean;
  onGenerate:    () => void;
  onUseSaved:    () => void;
  onSaveDefault: () => void;
  onClear:       () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FieldActions({
  value,
  defaultValue    = "",
  source,
  isGenerating    = false,
  isSaving        = false,
  disableGenerate = false,
  onGenerate,
  onUseSaved,
  onSaveDefault,
  onClear,
}: FieldActionsProps) {
  const state = deriveFieldState(value, defaultValue, source);

  // ── Shared button atoms ────────────────────────────────────────────────────

  const generateBtn = (variant: "outline" | "ghost") => (
    <Button
      variant={variant} size="sm"
      className={`h-7 text-xs gap-1${variant === "ghost" ? " text-muted-foreground" : ""}`}
      disabled={isGenerating}
      onClick={onGenerate}
    >
      {isGenerating
        ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
        : <><Sparkles className="w-3 h-3" /> Generate</>}
    </Button>
  );

  const saveBtn = (label: string) => (
    <Button
      variant="outline" size="sm"
      className="h-7 text-xs gap-1 border-primary text-primary hover:bg-primary/10"
      disabled={isSaving}
      onClick={onSaveDefault}
    >
      {isSaving
        ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>
        : <><Save className="w-3 h-3" /> {label}</>}
    </Button>
  );

  const clearBtn = (
    <Button
      variant="ghost" size="sm"
      className="h-7 text-xs gap-1 text-muted-foreground"
      onClick={onClear}
    >
      <X className="w-3 h-3" /> Clear
    </Button>
  );

  // ── State → button mapping ─────────────────────────────────────────────────

  let primary:   React.ReactNode = null;
  let secondary: React.ReactNode = null;

  switch (state) {
    case "EMPTY_NO_DEFAULT":
      primary = disableGenerate ? null : generateBtn("outline");
      break;

    case "EMPTY_WITH_DEFAULT":
      primary = (
        <Button
          variant="outline" size="sm"
          className="h-7 text-xs gap-1"
          onClick={onUseSaved}
        >
          <RotateCcw className="w-3 h-3" /> Use saved
        </Button>
      );
      secondary = disableGenerate ? null : generateBtn("ghost");
      break;

    case "FILLED_USER":
      primary   = saveBtn("Save as default");
      secondary = clearBtn;
      break;

    case "FILLED_DEFAULT":
      secondary = clearBtn;
      break;

    case "MODIFIED_DEFAULT":
      primary   = saveBtn("Update default");
      secondary = clearBtn;
      break;
  }

  if (!primary && !secondary) return null;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">{primary}</div>
      <div className="flex items-center gap-1.5">{secondary}</div>
    </div>
  );
}
