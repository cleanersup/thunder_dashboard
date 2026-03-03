/**
 * @module useDraftEstimate
 * Manages draft estimate persistence. Mirrors swift-slate's useDraftEstimate pattern.
 *
 * - On mount: checks DB for an existing is_draft=true row for the given service type.
 * - Exposes saveDraft() which debounces 3 s and skips identical payloads.
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
}

interface UseDraftEstimateReturn {
  /** ID of the persisted draft row (null while no draft exists yet) */
  draftId:   string | null;
  /** Raw draft loaded on mount — consume once to restore form state */
  loadedDraft: {
    draftData: DraftData;
    id: string;
  } | null;
  /** Mark draft as consumed so DraftRecoveryDialog doesn't re-appear */
  clearLoadedDraft: () => void;
  /** Schedule a save (debounced 3 s) */
  saveDraft:  (data: DraftData) => void;
  /** Immediately delete the draft (after submit or discard) */
  deleteDraft: () => Promise<void>;
  isSaving:   boolean;
  lastSaved:  Date | null;
}

export function useDraftEstimate({ serviceType }: UseDraftEstimateOptions): UseDraftEstimateReturn {
  const [draftId,      setDraftId]      = useState<string | null>(null);
  const [loadedDraft,  setLoadedDraft]  = useState<{ draftData: DraftData; id: string } | null>(null);
  const [isSaving,     setIsSaving]     = useState(false);
  const [lastSaved,    setLastSaved]    = useState<Date | null>(null);

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastJsonRef  = useRef<string>("");
  const draftIdRef   = useRef<string | null>(null);

  // Keep ref in sync so saveDraft closure always sees latest id
  useEffect(() => { draftIdRef.current = draftId; }, [draftId]);

  // ── Mount: load existing draft ───────────────────────────────────────────
  useEffect(() => {
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
  }, [serviceType]);

  // ── saveDraft (debounced, change-detected) ───────────────────────────────
  const saveDraft = useCallback((data: DraftData) => {
    const json = JSON.stringify(data);
    if (json === lastJsonRef.current) return; // Nothing changed
    lastJsonRef.current = json;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const result = await saveDraftEstimate(serviceType, data, draftIdRef.current ?? undefined);
        if (!draftIdRef.current && result?.id) {
          setDraftId(result.id);
          draftIdRef.current = result.id;
        }
        setLastSaved(new Date());
      } catch {
        // Silently ignore — draft saving is best-effort
      } finally {
        setIsSaving(false);
      }
    }, 3000);
  }, [serviceType]);

  // ── deleteDraft ──────────────────────────────────────────────────────────
  const deleteDraft = useCallback(async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const id = draftIdRef.current;
    if (!id) return;
    try {
      await deleteDraftEstimate(id);
      setDraftId(null);
      draftIdRef.current = null;
      setLoadedDraft(null);
      setLastSaved(null);
      lastJsonRef.current = "";
    } catch {
      // Best-effort
    }
  }, []);

  const clearLoadedDraft = useCallback(() => setLoadedDraft(null), []);

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return { draftId, loadedDraft, clearLoadedDraft, saveDraft, deleteDraft, isSaving, lastSaved };
}
