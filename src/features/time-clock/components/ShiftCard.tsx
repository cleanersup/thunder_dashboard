import { formatDisplayDateTime } from "@/shared/utils/formatters";
import { Pencil } from "lucide-react";
import { formatDbTimeDisplay } from "../utils/parseDbDateTime";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import type { TimeEntry } from "../types/timeClock.types";

// ─── Status helper ────────────────────────────────────────────────────────────

function getStatusInfo(entry: TimeEntry) {
  if (entry.clock_in_time && !entry.clock_out_time) {
    // Check overtime by scheduled end_time
    if (entry.route_appointments?.end_time) {
      const now = new Date();
      const end = new Date();
      const [h, mi] = entry.route_appointments.end_time.split(":").map(Number);
      end.setHours(h, mi, 0, 0);
      if (now > end) return { label: "Overtime", className: "bg-red-500/20 text-red-700 dark:text-red-400" };
    }
    return { label: "Active", className: "bg-green-500/20 text-green-700 dark:text-green-400" };
  }
  if (entry.break_start_time && !entry.break_end_time) {
    return { label: "On Break", className: "bg-pink-500/20 text-pink-700 dark:text-pink-400" };
  }
  if (entry.clock_in_time && entry.clock_out_time) {
    return { label: "Completed", className: "bg-purple-500/20 text-purple-700 dark:text-purple-400" };
  }
  return { label: "Scheduled", className: "bg-blue-500/20 text-blue-700 dark:text-blue-400" };
}

function fmtTime(ts: string | null) {
  return formatDbTimeDisplay(ts, "h:mm a");
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  entry: TimeEntry;
  shiftLabel?: string;
  isEditing: boolean;
  editDraftValues: Record<string, string>;
  onSetDraftValues: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  onStartEdit: (entry: TimeEntry) => void;
  onCancelEdit: () => void;
  onRequestSave: (entry: TimeEntry) => void;
  isPaid: boolean;
}

const FIELDS = [
  { key: "clock_in",    dbKey: "clock_in_time",    label: "Clock In"      },
  { key: "break_start", dbKey: "break_start_time", label: "Break Started" },
  { key: "break_end",   dbKey: "break_end_time",   label: "Break Ended"   },
  { key: "clock_out",   dbKey: "clock_out_time",   label: "Clock Out"     },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function ShiftCard({
  entry,
  shiftLabel,
  isEditing,
  editDraftValues,
  onSetDraftValues,
  onStartEdit,
  onCancelEdit,
  onRequestSave,
  isPaid,
}: Props) {
  const status = getStatusInfo(entry);

  return (
    <div className="border border-border rounded-lg p-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        {shiftLabel && <p className="text-xs text-muted-foreground">{shiftLabel}</p>}
        <div className="flex items-center gap-1.5 ml-auto">
          {entry.manually_edited && !isEditing && (
            <span
              title={entry.edited_at ? `Edited ${formatDisplayDateTime(entry.edited_at)}` : "Manually edited"}
              className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded"
            >
              Edited
            </span>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${status.className}`}>
            {status.label}
          </span>
          {!isPaid && !isEditing && (
            <button
              onClick={() => onStartEdit(entry)}
              className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              title="Edit times"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2×2 grid of time fields */}
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(({ key, dbKey, label }) => {
          const dbValue = entry[dbKey] ? formatDbTimeDisplay(entry[dbKey] as string, "HH:mm", "") : "";
          return (
            <div key={key} className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">{label}</p>
              {isEditing ? (
                <Input
                  type="time"
                  value={editDraftValues[key] ?? dbValue}
                  onChange={(e) => onSetDraftValues((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="text-sm text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-700 [color-scheme:light] dark:[color-scheme:dark]"
                />
              ) : (
                <p className="text-sm font-medium text-foreground py-2 px-3 bg-muted/50 rounded-md border border-border min-h-[36px]">
                  {fmtTime(entry[dbKey])}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Save / Cancel row */}
      {isEditing && (
        <div className="flex items-center gap-2 mt-3">
          <Button size="sm" variant="outline" className="flex-1" onClick={onCancelEdit}>
            Cancel
          </Button>
          <Button size="sm" className="flex-1" onClick={() => onRequestSave(entry)}>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
