import { useMemo } from "react";
import { useClients } from "../clients/hooks/useClients";
import { useLeads } from "../leads/hooks/useLeads";
import { useTasks } from "@/features/tasks/hooks/useTasks";

/**
 * Aggregates CRM summary statistics from the cached client, lead, and task queries.
 * React Query deduplicates the underlying requests — no extra network calls are made
 * when these queries are already active in a child component.
 *
 * @returns Counts for total leads, all clients, active clients, and tasks
 */
export function useCRMStats() {
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const { data: leads = [],  isLoading: loadingLeads }   = useLeads();
  const { data: tasks = [],  isLoading: loadingTasks }   = useTasks();

  const stats = useMemo(() => ({
    totalLeads:      leads.length,
    allClients:      clients.length,
    activeClients:   clients.filter((c) => c.status === "active").length,
    inactiveClients: clients.filter((c) => c.status === "inactive").length,
    totalTasks:      tasks.length,
    activeLeads:     leads.filter((l) => l.status === "active").length,
    hotLeads:        leads.filter((l) => l.priority_level === "high").length,
    convertedLeads:  leads.filter((l) => l.status === "won").length,
    pendingTasks:    tasks.filter((t) => t.status === "pending").length,
    inProgressTasks: tasks.filter((t) => t.status === "in_progress").length,
    completedTasks:  tasks.filter((t) => t.status === "completed").length,
  }), [clients, leads, tasks]);

  return {
    stats,
    isLoading: loadingClients || loadingLeads || loadingTasks,
  };
}
