import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { EntityPickerField, type EntityOption } from "@/shared/components/common/EntityPickerField";
import { EmployeeForm } from "@/features/employees/components/EmployeeForm";
import { taskSchema, type TaskFormData } from "../schemas/taskSchema";
import { useCreateTask, useUpdateTask } from "../hooks/useTasks";
import { useClients } from "@/features/crm/clients/hooks/useClients";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import type { Task } from "../types/task.types";

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  task?: Task;
}

export function TaskForm({ open, onClose, task }: TaskFormProps) {
  const isEdit = !!task;
  const { mutate: create, isPending: creating } = useCreateTask();
  const { mutate: update, isPending: updating } = useUpdateTask();
  const { data: clients = [] }   = useClients();
  const { data: employees = [] } = useEmployees();
  const isPending = creating || updating;

  // ── Entity picker state (managed outside RHF to avoid Json type conflicts) ──
  const [selectedEmployees, setSelectedEmployees] = useState<EntityOption[]>([]);
  const [selectedClient,    setSelectedClient]    = useState<EntityOption | null>(null);
  const [showAddEmployee,   setShowAddEmployee]   = useState(false);

  // Convert raw data to EntityOption format
  const employeeOptions: EntityOption[] = employees.map((e) => ({
    id: e.id,
    label: e.name,
  }));
  const clientOptions: EntityOption[] = clients.map((c) => ({
    id: c.id,
    label: c.full_name,
  }));

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: "medium", status: "to do" },
  });

  // ── Initialise form when opening in edit mode ────────────────────────────
  useEffect(() => {
    if (!open) return;

    if (task) {
      reset({
        title:       task.title,
        description: task.description ?? undefined,
        priority:    task.priority as TaskFormData["priority"],
        status:      task.status   as TaskFormData["status"],
        due_date:    task.due_date ?? undefined,
      });

      // Restore assigned employees from the task's JSON field
      if (Array.isArray(task.assigned_employees)) {
        const parsed = (task.assigned_employees as unknown[]).flatMap((e) => {
          const emp = e as Record<string, unknown>;
          const id  = String(emp.id ?? "");
          const label = String(emp.name ?? emp.full_name ?? "");
          return id ? [{ id, label }] : [];
        });
        setSelectedEmployees(parsed);
      } else {
        setSelectedEmployees([]);
      }

      // Restore linked client
      if (task.client_id) {
        const match = clients.find((c) => c.id === task.client_id);
        setSelectedClient(match ? { id: match.id, label: match.full_name } : null);
      } else {
        setSelectedClient(null);
      }
    } else {
      reset({ priority: "medium", status: "to do" });
      setSelectedEmployees([]);
      setSelectedClient(null);
    }
  }, [open, task, clients, reset]);

  const onSubmit = (data: TaskFormData) => {
    const payload = {
      ...data,
      client_id:          selectedClient?.id ?? null,
      assigned_employees: selectedEmployees.length > 0
        ? selectedEmployees.map((e) => ({ id: e.id, name: e.label }))
        : null,
    };
    if (isEdit && task) {
      update({ id: task.id, payload }, { onSuccess: onClose });
    } else {
      create(payload, { onSuccess: onClose });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Task" : "Add Task"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div>
              <Label>Task Title *</Label>
              <Input {...register("title")} placeholder="Task title" />
              {errors.title && (
                <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label>Description</Label>
              <Textarea {...register("description")} rows={3} placeholder="Task description..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority *</Label>
                <Controller
                  control={control}
                  name="priority"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label>Status *</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="to do">To Do</SelectItem>
                        <SelectItem value="in progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div>
              <Label>Due Date</Label>
              <Input type="date" {...register("due_date")} />
            </div>

            {/* ── Assigned To (multi-select with inline Add Employee) ── */}
            <div>
              <Label>Assigned To</Label>
              <EntityPickerField
                multiple
                options={employeeOptions}
                selected={selectedEmployees}
                onChange={setSelectedEmployees}
                placeholder="Select employees"
                emptyMessage="No active employees"
                onCreateNew={() => setShowAddEmployee(true)}
                createNewLabel="Add Employee"
              />
            </div>

            {/* ── Client (single-select, optional) ─────────────────── */}
            <div>
              <Label>Client</Label>
              <EntityPickerField
                options={clientOptions}
                selected={selectedClient ? [selectedClient] : []}
                onChange={([c]) => setSelectedClient(c ?? null)}
                placeholder="Select a client"
                emptyMessage="No clients found"
                allowClear
                clearLabel="No client"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? "Saving..." : (isEdit ? "Save Changes" : "Add Task")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Nested modal — opens without closing the TaskForm */}
      <EmployeeForm
        open={showAddEmployee}
        onClose={() => setShowAddEmployee(false)}
        onCreated={(emp) => {
          setSelectedEmployees((prev) => [...prev, emp]);
          setShowAddEmployee(false);
        }}
      />
    </>
  );
}
