/**
 * @module useDraftEstimate
 * Manages draft estimate persistence.
 *
 * - On mount: checks DB for an existing is_draft=true row for the given service type.
 * - Exposes saveDraft() for explicit user-initiated saves (no auto-save).
 * - Exposes deleteDraft() to purge after successful submit or discard.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { DraftData } from "../types/estimate.types";
import {
  loadDraftEstimate,
  saveDraftEstimate,
  deleteDraftEstimate,
} from "../services/estimatesService";

interface UseDraftEstimateOptions {
  serviceType: "Residential" | "Commercial";
  /** When false, the hook never loads or adopts an existing draft (e.g. editing a specific estimate). Default true. */
  enabled?: boolean;
}

interface UseDraftEstimateReturn {
  /** ID of the persisted draft row (null while no draft exists yet) */
  draftId:      string | null;
  /** Raw draft loaded on mount — consume once to restore form state */
  loadedDraft:  { draftData: DraftData; id: string } | null;
  /** Mark draft as consumed so DraftRecoveryDialog doesn't re-appear */
  clearLoadedDraft: () => void;
  /** Immediately persist the draft — call only on explicit user action */
  saveDraft:    (data: DraftData) => Promise<void>;
  /** Immediately delete the draft (after submit or discard) */
  deleteDraft:  () => Promise<void>;
  isSaving:     boolean;
  lastSaved:    Date | null;
}

export function useDraftEstimate({ serviceType, enabled = true }: UseDraftEstimateOptions): UseDraftEstimateReturn {
  const [draftId,     setDraftId]     = useState<string | null>(null);
  const [loadedDraft, setLoadedDraft] = useState<{ draftData: DraftData; id: string } | null>(null);
  const [isSaving,    setIsSaving]    = useState(false);
  const [lastSaved,   setLastSaved]   = useState<Date | null>(null);

  const draftIdRef = useRef<string | null>(null);

  // Keep ref in sync so saveDraft closure always sees the latest id
  useEffect(() => { draftIdRef.current = draftId; }, [draftId]);

  // ── Mount: load existing draft ───────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await loadDraftEstimate(serviceType);
        if (cancelled || !row) return;
        setDraftId(row.id);
        draftIdRef.current = row.id;
        if (row.draft_data) {
          setLoadedDraft({ draftData: row.draft_data as unknown as DraftData, id: row.id });
        }
      } catch {
        // Silently ignore — draft loading is non-critical
      }
    })();
    return () => { cancelled = true; };
  }, [serviceType, enabled]);

  // ── saveDraft (immediate, explicit user action only) ─────────────────────
  const saveDraft = useCallback(async (data: DraftData) => {
    setIsSaving(true);
    try {
      const result = await saveDraftEstimate(serviceType, data, draftIdRef.current ?? undefined);
      if (!draftIdRef.current && result?.id) {
        setDraftId(result.id);
        draftIdRef.current = result.id;
      }
      setLastSaved(new Date());
    } catch {
      // Best-effort — caller may choose to show a toast if needed
    } finally {
      setIsSaving(false);
    }
  }, [serviceType]);

  // ── deleteDraft ──────────────────────────────────────────────────────────
  const deleteDraft = useCallback(async () => {
    const id = draftIdRef.current;
    if (!id) return;
    try {
      await deleteDraftEstimate(id);
      setDraftId(null);
      draftIdRef.current = null;
      setLoadedDraft(null);
      setLastSaved(null);
    } catch {
      // Best-effort
    }
  }, []);

  const clearLoadedDraft = useCallback(() => setLoadedDraft(null), []);

  return { draftId, loadedDraft, clearLoadedDraft, saveDraft, deleteDraft, isSaving, lastSaved };
}
