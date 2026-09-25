import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QK } from "@/shared/config/queryKeys";
import {
  fetchQuickQuotes,
  fetchQuickQuote,
  createQuickQuote,
  updateQuickQuote,
  updateQuickQuoteStatus,
  deleteQuickQuote,
} from "../services/quickQuoteService";
import type { QuickQuoteInsert } from "../types/quickQuote.types";

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Todos los quick quotes del usuario. */
export function useQuickQuotes() {
  return useQuery({
    queryKey:             QK.quickQuotes,
    queryFn:              fetchQuickQuotes,
    staleTime:            0,
    refetchOnMount:       "always",
    refetchOnWindowFocus: true,
  });
}

/** Un quick quote por id. */
export function useQuickQuote(id: string | null) {
  return useQuery({
    queryKey:  QK.quickQuote(id!),
    queryFn:   () => fetchQuickQuote(id!),
    enabled:   !!id,
    staleTime: 60 * 1000,
    retry:     false,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateQuickQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuickQuoteInsert) => createQuickQuote(payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: QK.quickQuotes }); },
  });
}

export function useUpdateQuickQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: QuickQuoteInsert }) => updateQuickQuote(id, update),
    onSuccess:  (_data, { id }) => {
      qc.invalidateQueries({ queryKey: QK.quickQuotes });
      qc.invalidateQueries({ queryKey: QK.quickQuote(id) });
    },
  });
}

export function useUpdateQuickQuoteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateQuickQuoteStatus(id, status),
    onSuccess:  (_data, { id }) => {
      qc.invalidateQueries({ queryKey: QK.quickQuotes });
      qc.invalidateQueries({ queryKey: QK.quickQuote(id) });
    },
  });
}

export function useDeleteQuickQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteQuickQuote(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: QK.quickQuotes }); },
  });
}
