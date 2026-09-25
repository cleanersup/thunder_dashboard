import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, ClipboardList, Flag, Users } from "lucide-react";
import { format } from "date-fns";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import { Button } from "@/shared/components/ui/button";
import {
  FormSection, FloatingInput, SelectField, DateField, TextareaField,
} from "@/shared/components/forms";
import { FORM_SECTION_GAP } from "@/shared/constants/formTokens";
import { parseDateOnly } from "@/shared/utils/formatters";
import { EntityPickerField, type EntityOption } from "@/shared/components/common/EntityPickerField";
import { EmployeeForm } from "@/features/employees/components/EmployeeForm";
import { taskSchema, type TaskFormData } from "../schemas/taskSchema";
import { useCreateTask, useUpdateTask } from "../hooks/useTasks";
import { useClients } from "@/features/crm/clients/hooks/useClients";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import type { Task } from "../types/task.types";

const PRIORITY_OPTIONS = [
  { value: "low",    label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High" },
] as const;

const STATUS_OPTIONS = [
  { value: "to do",       label: "To Do" },
  { value: "in progress", label: "In Progress" },
  { value: "completed",   label: "Completed" },
] as const;

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  task?: Task;
}

export function TaskForm({ open, onClose, task }: TaskFormProps) {
  const isEdit = !!task;
  const { mutate: create, isPending: creating } = useCreateTask();
  const { mutate: update, isPending: updating } = useUpdateTask();
  const { data: clients = [] } = useClients();
  const { data: employees = [] } = useEmployees();
  const isPending = creating || updating;

  const [selectedEmployees, setSelectedEmployees] = useState<EntityOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<EntityOption | null>(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  const employeeOptions: EntityOption[] = employees.map((e) => ({
    id: e.id,
    label: e.name,
  }));
  const clientOptions: EntityOption[] = clients.map((c) => ({
    id: c.id,
    label: c.full_name,
  }));

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: "medium", status: "to do" },
  });

  useEffect(() => {
    if (!open) return;

    if (task) {
      reset({
        title: task.title,
        description: task.description ?? undefined,
        priority: task.priority as TaskFormData["priority"],
        status: task.status as TaskFormData["status"],
        due_date: task.due_date ?? undefined,
      });

      if (Array.isArray(task.assigned_employees)) {
        const parsed = (task.assigned_employees as unknown[]).flatMap((e) => {
          const emp = e as Record<string, unknown>;
          const id = String(emp.id ?? "");
          const label = String(emp.name ?? emp.full_name ?? "");
          return id ? [{ id, label }] : [];
        });
        setSelectedEmployees(parsed);
      } else {
        setSelectedEmployees([]);
      }

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
      client_id: selectedClient?.id ?? null,
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
      <FullScreenModal open={open} onClose={onClose}>
        <div className="flex-shrink-0 bg-card">
          <div className="max-w-2xl mx-auto">
            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="w-1/3" />
              <div className="w-1/3 text-center">
                <h1 className="font-semibold text-base leading-tight">
                  {isEdit ? "Edit Task" : "Add Task"}
                </h1>
              </div>
              <div className="flex items-center w-1/3 justify-end">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/40">
          <div className="max-w-2xl mx-auto px-4 py-2.5">
            <form onSubmit={handleSubmit(onSubmit)} className={FORM_SECTION_GAP}>
              <FormSection
                icon={ClipboardList}
                title="Task"
                subtitle="What has to be done"
                invalid={!!errors.title}
              >
                <Controller
                  control={control}
                  name="title"
                  render={({ field }) => (
                    <FloatingInput
                      id="task-title"
                      label="Task title"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      required
                      error={errors.title?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <TextareaField
                      id="task-description"
                      label="Description"
                      placeholder="Task description..."
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  )}
                />
              </FormSection>

              <FormSection
                icon={Flag}
                title="Tracking"
                subtitle="Priority, status and when it is due"
              >
                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    control={control}
                    name="priority"
                    render={({ field }) => (
                      <SelectField
                        placeholder="Priority"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        options={PRIORITY_OPTIONS}
                        required
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <SelectField
                        placeholder="Status"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        options={STATUS_OPTIONS}
                        required
                      />
                    )}
                  />
                </div>

                <Controller
                  control={control}
                  name="due_date"
                  render={({ field }) => (
                    <DateField
                      placeholder="Due date"
                      value={field.value ? parseDateOnly(field.value) : undefined}
                      onChange={(d) => field.onChange(d ? format(d, "yyyy-MM-dd") : "")}
                    />
                  )}
                />
              </FormSection>

              <FormSection
                icon={Users}
                title="Assignment"
                subtitle="Who does it and for which client"
              >
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
                <EntityPickerField
                  options={clientOptions}
                  selected={selectedClient ? [selectedClient] : []}
                  onChange={([c]) => setSelectedClient(c ?? null)}
                  placeholder="Select a client"
                  emptyMessage="No clients found"
                  allowClear
                  clearLabel="No client"
                />
              </FormSection>

              <div className="bg-card p-4 flex items-center justify-between gap-3">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Saving..." : (isEdit ? "Save Changes" : "Add Task")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </FullScreenModal>

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
