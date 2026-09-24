import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchTasks, fetchTask, createTask, updateTask, deleteTask } from "../services/tasksService";
import type { TaskInsert, TaskUpdate } from "../types/task.types";
import { QK } from "@/shared/config/queryKeys";

export function useTasks() {
  return useQuery({ queryKey: QK.tasks, queryFn: fetchTasks });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: [...QK.tasks, id],
    queryFn: () => fetchTask(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<TaskInsert, "user_id">) => createTask(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.tasks });
      toast.success("Task created successfully");
    },
    onError: () => toast.error("Failed to create task"),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TaskUpdate }) => updateTask(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: QK.tasks });
      qc.invalidateQueries({ queryKey: [...QK.tasks, id] });
      toast.success("Task updated successfully");
    },
    onError: () => toast.error("Failed to update task"),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.tasks });
      toast.success("Task deleted");
    },
    onError: () => toast.error("Failed to delete task"),
  });
}
