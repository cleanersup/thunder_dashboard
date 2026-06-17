import { useState } from "react";
import { CheckSquare, Clock, Loader2, CheckCircle, Search, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent } from "@/shared/components/ui/card";
import { TasksTable } from "../components/TasksTable";
import { useCRMStats } from "@/features/crm/hooks/useCRMStats";

export function TasksPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { stats } = useCRMStats();

  return (
    <div className="p-2.5 space-y-2.5">

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Total Tasks",   value: stats.totalTasks,    subtitle: "All tasks",       color: "hsl(var(--primary))",        icon: CheckSquare },
              { title: "Pending",       value: stats.pendingTasks,  subtitle: "To do",           color: "hsl(var(--warning))",        icon: Clock       },
              { title: "In Progress",   value: stats.inProgressTasks,subtitle: "Being worked on",color: "hsl(var(--info))",           icon: Loader2     },
              { title: "Completed",     value: stats.completedTasks,subtitle: "Done",            color: "hsl(var(--success))",        icon: CheckCircle },
            ].map((card) => (
              <div key={card.title} className="border-l-4 pl-4" style={{ borderLeftColor: card.color }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: card.color }}>{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary/50">
                    <card.icon className="w-5 h-5" style={{ color: card.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 h-9 bg-white"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button className="h-9" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Task
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <TasksTable
          searchQuery={searchQuery}
          showForm={showAddForm}
          onCloseForm={() => setShowAddForm(false)}
        />
      </div>

    </div>
  );
}
