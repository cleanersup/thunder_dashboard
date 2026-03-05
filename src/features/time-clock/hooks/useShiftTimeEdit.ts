import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updateTimeEntryTimes } from "../services/timeClockService";
import type { ShiftTimeFields, EditChange } from "../types/timeClock.types";

const FIELD_LABELS: Record<string, string> = {
  clock_in:    "Clock In",
  break_start: "Break Started",
  break_end:   "Break Ended",
  clock_out:   "Clock Out",
};

const DB_FIELD_MAP: Record<string, keyof ShiftTimeFields> = {
  clock_in:    "clock_in_time",
  break_start: "break_start_time",
  break_end:   "break_end_time",
  clock_out:   "clock_out_time",
};

export function useShiftTimeEdit(onSuccess?: () => void | Promise<void>) {
  const [editingShiftId,    setEditingShiftId]    = useState<string | null>(null);
  const [editDraftValues,   setEditDraftValues]   = useState<Record<string, string>>({});
  const [isEditConfirmOpen, setIsEditConfirmOpen] = useState(false);
  const [isConfirmingSave,  setIsConfirmingSave]  = useState(false);
  const [pendingEditChanges, setPendingEditChanges] = useState<EditChange[]>([]);
  const [confirmingShift,   setConfirmingShift]   = useState<ShiftTimeFields | null>(null);

  function startEdit(shift: ShiftTimeFields) {
    setEditDraftValues({
      clock_in:    shift.clock_in_time    ? format(new Date(shift.clock_in_time),    "HH:mm") : "",
      break_start: shift.break_start_time ? format(new Date(shift.break_start_time), "HH:mm") : "",
      break_end:   shift.break_end_time   ? format(new Date(shift.break_end_time),   "HH:mm") : "",
      clock_out:   shift.clock_out_time   ? format(new Date(shift.clock_out_time),   "HH:mm") : "",
    });
    setEditingShiftId(shift.id);
  }

  function cancelEdit() {
    setEditingShiftId(null);
    setEditDraftValues({});
  }

  function requestSave(shift: ShiftTimeFields) {
    const changes: EditChange[] = [];
    for (const field of ["clock_in", "break_start", "break_end", "clock_out"]) {
      const dbField = DB_FIELD_MAP[field];
      const oldValue = shift[dbField] ? format(new Date(shift[dbField] as string), "HH:mm") : "";
      const newValue = editDraftValues[field] ?? "";
      if (newValue !== oldValue && newValue) {
        changes.push({ field, label: FIELD_LABELS[field], oldValue, newValue });
      }
    }
    if (changes.length === 0) { cancelEdit(); return; }
    setPendingEditChanges(changes);
    setConfirmingShift(shift);
    setIsEditConfirmOpen(true);
  }

  async function confirmSave() {
    if (!confirmingShift || pendingEditChanges.length === 0) return;
    setIsConfirmingSave(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsConfirmingSave(false); return; }

    const fields: Record<string, string> = {};
    for (const change of pendingEditChanges) {
      const dbField = DB_FIELD_MAP[change.field] as string;
      fields[dbField] = new Date(`${confirmingShift.date}T${change.newValue}:00`).toISOString();
    }

    try {
      await updateTimeEntryTimes(confirmingShift.id, fields, user.id);
      toast.success(
        `${pendingEditChanges.length} field${pendingEditChanges.length > 1 ? "s" : ""} updated successfully`,
      );
      setIsEditConfirmOpen(false);
      setPendingEditChanges([]);
      setConfirmingShift(null);
      setEditingShiftId(null);
      setEditDraftValues({});
      await onSuccess?.();
    } catch {
      toast.error("Failed to update times");
    } finally {
      setIsConfirmingSave(false);
    }
  }

  return {
    editingShiftId,
    editDraftValues,
    setEditDraftValues,
    isEditConfirmOpen,
    setIsEditConfirmOpen,
    isConfirmingSave,
    pendingEditChanges,
    startEdit,
    cancelEdit,
    requestSave,
    confirmSave,
  };
}
