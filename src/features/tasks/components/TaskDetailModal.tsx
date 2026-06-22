import { useState } from "react";
import {
  FileText, Flag, Calendar, Clock,
  User, Building2, Phone, Mail, MessageSquare,
  Edit, Trash2, Play, CheckCircle, MoreHorizontal,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { SidePanel } from "@/shared/components/common/SidePanel";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { TaskForm } from "./TaskForm";
import { useDeleteTask, useUpdateTask } from "../hooks/useTasks";
import { PRIORITY_SOFT_BORDER, TASK_STATUS_SOFT } from "@/shared/constants/styleTokens";
import { getAssignedNames, formatDueDate } from "../utils/taskFormatters";
import { toast } from "sonner";
import type { TaskWithClient } from "../types/task.types";

// ─── Row helper ───────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value ?? "—"}</p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
interface TaskDetailModalProps {
  task: TaskWithClient | null;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailModal({ task, open, onClose }: TaskDetailModalProps) {
  const { mutate: deleteTask } = useDeleteTask();
  const { mutate: updateTask } = useUpdateTask();
  const [showEdit,   setShowEdit]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const t = task;

  if (!t) return null;

  const statusLabel =
    t.status === "to do" ? "To Do" :
    t.status === "in progress" ? "In Progress" : "Completed";

  // SidePanel renders the badge over a dark header, so colors must be readable
  // there. --task-status-todo is a very dark navy (23% L) that disappears on the
  // header, so the badge uses the lighter --info blue (same hue, 48% L) instead.
  const statusColor =
    t.status === "to do"       ? "hsl(var(--info))"                  :
    t.status === "in progress" ? "hsl(var(--task-status-progress))"  :
                                 "hsl(var(--task-status-completed))";
  const statusBg =
    t.status === "to do"       ? "hsl(var(--info) / 0.15)"                 :
    t.status === "in progress" ? "hsl(var(--task-status-progress) / 0.15)" :
                                 "hsl(var(--task-status-completed) / 0.15)";

  const badge = { label: statusLabel, color: statusColor, bg: statusBg };

  const assignedNames = getAssignedNames(t.assigned_employees);
  const client = t.clients;

  const handleStart = () => {
    updateTask(
      { id: t.id, payload: { status: "in progress" } },
      { onSuccess: () => toast.success("Task started! Keep up the great work!") },
    );
  };

  const handleComplete = () => {
    updateTask(
      { id: t.id, payload: { status: "completed" } },
      { onSuccess: () => toast.success("Task marked as completed") },
    );
  };

  const footer = (
    <div className="flex items-center gap-2">
      {t.status === "to do" && (
        <Button size="sm" className="flex-1 bg-success hover:bg-success/90 text-white" onClick={handleStart}>
          <Play className="h-3.5 w-3.5 mr-1.5" /> Start Task
        </Button>
      )}
      {t.status === "in progress" && (
        <Button size="sm" className="flex-1 bg-success hover:bg-success/90 text-white" onClick={handleComplete}>
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Complete Task
        </Button>
      )}
      {t.status === "completed" && (
        <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowEdit(true)}>
          <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="px-2.5">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setShowEdit(true)}>
            <Edit className="h-3.5 w-3.5 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        title={t.title}
        badge={badge}
        footer={footer}
      >
        <div className="p-4 space-y-6">

          {/* Task Information */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Task Information</h3>

            {t.description && (
              <InfoRow icon={FileText} label="Description" value={t.description} />
            )}

            <div className="flex items-start gap-3">
              <Flag className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Priority</p>
                <span className={`inline-block mt-0.5 text-xs font-medium px-2.5 py-0.5 rounded-full border capitalize ${PRIORITY_SOFT_BORDER[t.priority] ?? ""}`}>
                  {t.priority}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Status</p>
                <span className={`inline-block mt-0.5 text-xs font-medium px-2.5 py-0.5 rounded-full border capitalize ${TASK_STATUS_SOFT[t.status] ?? ""}`}>
                  {statusLabel}
                </span>
              </div>
            </div>

            {t.due_date && (
              <InfoRow icon={Calendar} label="Due Date" value={formatDueDate(t.due_date)} />
            )}
          </section>

          {/* Assigned To */}
          {assignedNames.length > 0 && (
            <>
              <hr className="border-border" />
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned To</h3>
                {assignedNames.map((name) => (
                  <div key={name} className="flex items-center gap-3">
                    <User className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                ))}
              </section>
            </>
          )}

          {/* Linked Client */}
          {client && (
            <>
              <hr className="border-border" />
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Client</h3>
                <InfoRow icon={User} label="Name" value={client.full_name} />
                {client.company && (
                  <InfoRow icon={Building2} label="Company" value={client.company} />
                )}

                {/* Phone with shortcuts */}
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{client.phone}</p>
                      <div className="flex gap-1.5 shrink-0">
                        <a href={`sms:${client.phone}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors" aria-label="SMS">
                          <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        </a>
                        <a href={`tel:${client.phone}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors" aria-label="Call">
                          <Phone className="h-3.5 w-3.5 text-primary" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email with shortcut */}
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{client.email}</p>
                      <a href={`mailto:${client.email}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors shrink-0" aria-label="Email">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Timeline */}
          <hr className="border-border" />
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Timeline</h3>
            <InfoRow icon={Clock} label="Created"      value={format(parseISO(t.created_at), "MMM d, yyyy · h:mm a")} />
            <InfoRow icon={Clock} label="Last Updated" value={format(parseISO(t.updated_at), "MMM d, yyyy · h:mm a")} />
          </section>

        </div>
      </SidePanel>

      <TaskForm open={showEdit} onClose={() => setShowEdit(false)} task={t} />
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Task"
        description="Are you sure? This task will be permanently deleted."
        onConfirm={() => deleteTask(t.id, { onSuccess: onClose })}
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  );
}
