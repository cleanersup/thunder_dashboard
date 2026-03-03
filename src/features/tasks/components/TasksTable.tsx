import { useState, useMemo } from "react";
import { MoreVertical, Edit, Play, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { DataTable, type ColumnDef } from "@/shared/components/common/DataTable";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { PRIORITY_SOFT_BORDER, TASK_STATUS_SOFT } from "@/shared/constants/styleTokens";
import { useTasks, useUpdateTask, useDeleteTask } from "../hooks/useTasks";
import { TaskForm } from "./TaskForm";
import { TaskDetailModal } from "./TaskDetailModal";
import { formatDueDate, getAssignedName } from "../utils/taskFormatters";
import { toast } from "sonner";
import type { TaskWithClient } from "../types/task.types";

// ─── Actions dropdown ─────────────────────────────────────────────────────────
interface ActionsCellProps {
  task: TaskWithClient;
  onOpenDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ActionsCell({ task, onOpenDetails, onEdit, onDelete }: ActionsCellProps) {
  const { mutate: updateTask } = useUpdateTask();

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask(
      { id: task.id, payload: { status: "in progress" } },
      { onSuccess: () => toast.success("Task started! Keep up the great work!") },
    );
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask(
      { id: task.id, payload: { status: "completed" } },
      { onSuccess: () => toast.success("Task completed! Excellent work!") },
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenDetails(); }}>
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <Edit className="h-3.5 w-3.5 mr-2" /> Edit
        </DropdownMenuItem>

        {/* Status-conditional actions */}
        {task.status === "to do" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleStart}>
              <Play className="h-3.5 w-3.5 mr-2 text-success" /> Start Task
            </DropdownMenuItem>
          </>
        )}
        {task.status === "in progress" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleComplete}>
              <CheckCircle className="h-3.5 w-3.5 mr-2 text-success" /> Complete Task
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
interface TasksTableProps {
  searchQuery: string;
  showForm: boolean;
  onCloseForm: () => void;
}

export function TasksTable({ searchQuery, showForm, onCloseForm }: TasksTableProps) {
  const { data: tasks = [], isLoading } = useTasks();
  const { mutate: deleteTask } = useDeleteTask();

  const [selectedTask, setSelectedTask] = useState<TaskWithClient | null>(null);
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingTask, setEditingTask]   = useState<TaskWithClient | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskWithClient | null>(null);

  const openDetails = (task: TaskWithClient) => { setSelectedTask(task); setModalOpen(true); };
  const closeModal  = () => { setModalOpen(false); setSelectedTask(null); };

  const columns = useMemo<ColumnDef<TaskWithClient>[]>(() => [
    {
      key: "title",
      header: "Task Title",
      cell: (t) => <span className="font-medium text-sm">{t.title}</span>,
    },
    {
      key: "assigned_to",
      header: "Assigned To",
      cell: (t) => (
        <span className="text-sm text-muted-foreground">
          {getAssignedName(t.assigned_employees)}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "due_date",
      header: "Due Date",
      cell: (t) => <span className="text-sm text-muted-foreground">{formatDueDate(t.due_date)}</span>,
      hideOnMobile: true,
    },
    {
      key: "priority",
      header: "Priority",
      cell: (t) => (
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border capitalize ${PRIORITY_SOFT_BORDER[t.priority] ?? ""}`}>
          {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => (
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border capitalize ${TASK_STATUS_SOFT[t.status] ?? ""}`}>
          {t.status === "to do" ? "To Do" : t.status === "in progress" ? "In Progress" : "Completed"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (t) => (
        <ActionsCell
          task={t}
          onOpenDetails={() => openDetails(t)}
          onEdit={() => setEditingTask(t)}
          onDelete={() => setDeletingTask(t)}
        />
      ),
      className: "w-12 text-right",
    },
  ], []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTasks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.clients?.full_name?.toLowerCase().includes(q) ?? false)
    );
  }, [tasks, searchQuery]);

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredTasks}
        keyExtractor={(t) => t.id}
        isLoading={isLoading}
        paginated
        onRowClick={openDetails}
        emptyTitle="No tasks yet"
        emptyDescription="Add your first task to get started."
      />

      {/* Detail modal */}
      <TaskDetailModal
        task={selectedTask}
        open={modalOpen}
        onClose={closeModal}
      />

      {/* Add / Edit form */}
      <TaskForm open={showForm} onClose={onCloseForm} />
      <TaskForm open={!!editingTask} onClose={() => setEditingTask(null)} task={editingTask ?? undefined} />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deletingTask}
        onOpenChange={(v) => { if (!v) setDeletingTask(null); }}
        title="Delete Task"
        description="Are you sure? This task will be permanently deleted."
        onConfirm={() => {
          if (deletingTask) deleteTask(deletingTask.id, { onSuccess: () => setDeletingTask(null) });
        }}
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  );
}
