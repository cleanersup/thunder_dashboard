import { useState } from "react";
import {
  FileText, Flag, Calendar, Clock,
  User, Building2, Phone, Mail, MessageSquare,
  Edit, Trash2, Play, CheckCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { DetailModal, InfoRow } from "@/shared/components/common/DetailModal";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { TaskForm } from "./TaskForm";
import { useDeleteTask, useUpdateTask } from "../hooks/useTasks";
import { PRIORITY_BADGE, TASK_STATUS_BADGE, TASK_STATUS_HEADER_BADGE } from "@/shared/constants/styleTokens";
import { getAssignedNames, formatDueDate } from "../utils/taskFormatters";
import { toast } from "sonner";
import type { TaskWithClient } from "../types/task.types";

// ─── Action button (matches swift-slate style) ────────────────────────────────
function ActionButton({
  icon: Icon,
  iconBg,
  iconColor = "text-primary",
  label,
  description,
  labelColor = "text-foreground",
  onClick,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor?: string;
  label: string;
  description: string;
  labelColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
    >
      <div className={`p-2 rounded-md flex-shrink-0 ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div>
        <p className={`text-sm font-semibold ${labelColor}`}>{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
interface TaskDetailModalProps {
  task: TaskWithClient | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Full-detail modal for a task record.
 * Shows task info, assigned employees, linked client, and status-conditional quick actions.
 */
export function TaskDetailModal({ task, open, onClose }: TaskDetailModalProps) {
  const { mutate: deleteTask } = useDeleteTask();
  const { mutate: updateTask } = useUpdateTask();
  const [showEdit, setShowEdit]     = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  if (!task) return null;

  const handleDelete = () => deleteTask(task.id, { onSuccess: onClose });

  const handleStart = () => {
    updateTask(
      { id: task.id, payload: { status: "in progress" } },
      { onSuccess: () => toast.success("Task started! Keep up the great work!") },
    );
  };

  const handleComplete = () => {
    updateTask(
      { id: task.id, payload: { status: "completed" } },
      { onSuccess: () => toast.success("Task completed! Excellent work!") },
    );
  };

  const assignedNames = getAssignedNames(task.assigned_employees);
  const client = task.clients;

  const statusLabel =
    task.status === "to do" ? "To Do" :
    task.status === "in progress" ? "In Progress" : "Completed";

  return (
    <>
      <DetailModal
        open={open}
        onClose={onClose}
        title={task.title}
        badge={{
          label: statusLabel,
          className: TASK_STATUS_HEADER_BADGE[task.status] ?? "bg-secondary text-secondary-foreground",
        }}
      >
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">

          {/* ── Left: Task Info + Timeline ────────────────────────────── */}
          <div className="p-6 space-y-6">
            <section>
              <h3 className="text-sm font-bold text-foreground mb-4">Task Information</h3>
              <div className="space-y-4">
                {task.description && (
                  <InfoRow icon={FileText} label="Description" value={task.description} />
                )}

                {/* Priority + Status badges side by side */}
                <div className="flex items-start gap-3">
                  <Flag className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${PRIORITY_BADGE[task.priority] ?? "bg-secondary text-secondary-foreground"}`}>
                      {task.priority}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${TASK_STATUS_BADGE[task.status] ?? ""}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>

                {task.due_date && (
                  <InfoRow icon={Calendar} label="Due Date" value={formatDueDate(task.due_date)} />
                )}
              </div>
            </section>

            <hr className="border-border" />

            <section>
              <h3 className="text-sm font-bold text-foreground mb-4">Timeline</h3>
              <div className="space-y-4">
                <InfoRow
                  icon={Clock}
                  label="Created"
                  value={format(parseISO(task.created_at), "MMM d, yyyy · h:mm a")}
                />
                <InfoRow
                  icon={Clock}
                  label="Last Updated"
                  value={format(parseISO(task.updated_at), "MMM d, yyyy · h:mm a")}
                />
              </div>
            </section>
          </div>

          {/* ── Right: Assigned + Client + Quick Actions ──────────────── */}
          <div className="p-6 space-y-6">

            {/* Assigned employees */}
            {assignedNames.length > 0 && (
              <>
                <section>
                  <h3 className="text-sm font-bold text-foreground mb-4">Assigned To</h3>
                  <div className="space-y-2">
                    {assignedNames.map((name) => (
                      <div key={name} className="flex items-center gap-3">
                        <User className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">{name}</span>
                      </div>
                    ))}
                  </div>
                </section>
                <hr className="border-border" />
              </>
            )}

            {/* Linked client */}
            {client && (
              <>
                <section>
                  <h3 className="text-sm font-bold text-foreground mb-4">Client</h3>
                  <div className="space-y-4">
                    <InfoRow icon={User}      label="Name"    value={client.full_name} />
                    {client.company && (
                      <InfoRow icon={Building2} label="Company" value={client.company} />
                    )}

                    {/* Phone with call + SMS */}
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{client.phone}</p>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <a
                              href={`sms:${client.phone}`}
                              className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
                              aria-label="Send SMS"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-primary" />
                            </a>
                            <a
                              href={`tel:${client.phone}`}
                              className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
                              aria-label="Call"
                            >
                              <Phone className="h-3.5 w-3.5 text-primary" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Email with mailto */}
                    <div className="flex items-start gap-3">
                      <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{client.email}</p>
                          <a
                            href={`mailto:${client.email}`}
                            className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors flex-shrink-0"
                            aria-label="Send email"
                          >
                            <Mail className="h-3.5 w-3.5 text-primary" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
                <hr className="border-border" />
              </>
            )}

            {/* Quick Actions — conditional by status (mirrors swift-slate logic) */}
            <section>
              <h3 className="text-sm font-bold text-foreground mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {task.status === "to do" && (
                  <ActionButton
                    icon={Play}
                    iconBg="bg-success/10"
                    iconColor="text-success"
                    label="Start Task"
                    description="Begin working on this task"
                    onClick={handleStart}
                  />
                )}
                {task.status === "in progress" && (
                  <ActionButton
                    icon={CheckCircle}
                    iconBg="bg-success/10"
                    iconColor="text-success"
                    label="Complete Task"
                    description="Mark this task as completed"
                    onClick={handleComplete}
                  />
                )}
                <ActionButton
                  icon={Edit}
                  iconBg="bg-primary/10"
                  label="Edit"
                  description="Modify task details"
                  onClick={() => setShowEdit(true)}
                />
                <ActionButton
                  icon={Trash2}
                  iconBg="bg-destructive/10"
                  iconColor="text-destructive"
                  label="Delete"
                  description="Remove this task permanently"
                  labelColor="text-destructive"
                  onClick={() => setShowDelete(true)}
                />
              </div>
            </section>
          </div>
        </div>
      </DetailModal>

      <TaskForm open={showEdit} onClose={() => setShowEdit(false)} task={task} />
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Task"
        description="Are you sure? This task will be permanently deleted."
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  );
}
