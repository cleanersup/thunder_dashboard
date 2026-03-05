import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, TrendingUp, CheckSquare, CheckCircle, Search, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ClientsTable } from "../clients/components/ClientsTable";
import { LeadsKanban } from "../leads/components/LeadsKanban";
import { TasksTable } from "@/features/tasks/components/TasksTable";
import { useCRMStats } from "../hooks/useCRMStats";

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CRMPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "leads";

  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Stats (React Query deduplicates — same keys used by child components)
  const { stats } = useCRMStats();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
    setSearch("");
    setShowAddForm(false);
  };

  const addLabel =
    activeTab === "clients" ? "Add Client" :
    activeTab === "leads"   ? "Add Lead"   : "Add Task";

  const searchPlaceholder =
    activeTab === "clients" ? "Search clients..." : "Search tasks...";

  return (
    <div className="p-2.5 space-y-2.5">
      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Total Leads",    value: stats.totalLeads,    subtitle: "Potential Clients",   color: "hsl(var(--info))",           icon: Users       },
              { title: "All Clients",    value: stats.allClients,    subtitle: "Current client list", color: "hsl(var(--success))",        icon: TrendingUp  },
              { title: "Active Clients", value: stats.activeClients, subtitle: "Currently active",    color: "hsl(var(--purple-vibrant))", icon: CheckCircle },
              { title: "Tasks",          value: stats.totalTasks,    subtitle: "Total tasks",         color: "hsl(var(--warning))",        icon: CheckSquare },
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

      {/* ── Tab section ────────────────────────────────────────────────── */}
      <div>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-2.5">
          {/* Tab bar row */}
          <div className="bg-card rounded-lg shadow-sm overflow-hidden p-2.5">
            <div className="flex items-center justify-between">
              <TabsList className="h-auto bg-transparent p-0 gap-0 border-b border-border">
                <TabsTrigger
                  value="leads"
                  className="flex items-center gap-1.5 pb-3 rounded-none text-sm font-medium text-muted-foreground border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent hover:text-foreground transition-colors"
                >
                  <Users className="h-3.5 w-3.5" /> Leads
                </TabsTrigger>
                <TabsTrigger
                  value="clients"
                  className="flex items-center gap-1.5 pb-3 rounded-none text-sm font-medium text-muted-foreground border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent hover:text-foreground transition-colors"
                >
                  <Users className="h-3.5 w-3.5" /> Clients
                </TabsTrigger>
                <TabsTrigger
                  value="tasks"
                  className="flex items-center gap-1.5 pb-3 rounded-none text-sm font-medium text-muted-foreground border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent hover:text-foreground transition-colors"
                >
                  <CheckSquare className="h-3.5 w-3.5" /> Tasks
                </TabsTrigger>
              </TabsList>

              {/* Search + Add */}
              <div className="flex items-center gap-2 pb-2">
                {activeTab !== "leads" && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      className="pl-8 h-8 w-44 text-sm"
                      placeholder={searchPlaceholder}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                )}
                <Button size="sm" className="h-8" onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-1" /> {addLabel}
                </Button>
              </div>
            </div>
          </div>

          {/* Tab content */}
          <div className="bg-card rounded-lg shadow-sm overflow-hidden">
            <TabsContent value="leads" className="p-4 mt-0">
              <LeadsKanban showForm={showAddForm} onCloseForm={() => setShowAddForm(false)} />
            </TabsContent>
            <TabsContent value="clients" className="mt-0">
              <ClientsTable
                searchQuery={search}
                showForm={showAddForm}
                onCloseForm={() => setShowAddForm(false)}
              />
            </TabsContent>
            <TabsContent value="tasks" className="mt-0">
              <TasksTable
                searchQuery={search}
                showForm={showAddForm}
                onCloseForm={() => setShowAddForm(false)}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
