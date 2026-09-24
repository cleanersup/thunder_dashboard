/**
 * @module DraftStatusIndicator
 * Small badge shown in the form header indicating draft save status.
 * Shows "Saving…" while a write is in-flight, "Draft saved" once complete.
 */
import { Cloud, Loader2 } from "lucide-react";

interface DraftStatusIndicatorProps {
  isSaving:  boolean;
  lastSaved: Date | null;
}

export function DraftStatusIndicator({ isSaving, lastSaved }: DraftStatusIndicatorProps) {
  if (!isSaving && !lastSaved) return null;

  return (
    <div className="flex items-center gap-1 text-white/70 text-xs">
      {isSaving ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Saving…</span>
        </>
      ) : (
        <>
          <Cloud className="w-3 h-3" />
          <span>Draft saved</span>
        </>
      )}
    </div>
  );
}
