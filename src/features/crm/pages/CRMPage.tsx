import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, TrendingUp, CheckSquare, CheckCircle, Search, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ClientsTable } from "../clients/components/ClientsTable";
import { LeadsKanban } from "../leads/components/LeadsKanban";
import { TasksTable } from "@/features/tasks/components/TasksTable";
import { useCRMStats } from "../hooks/useCRMStats";

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number;
  sublabel: string;
  color: string;
  icon: React.ElementType;
}

function CRMStatCard({ label, value, sublabel, color, icon: Icon }: StatCardProps) {
  return (
    <div
      className="bg-card rounded-lg px-5 py-4 flex items-center justify-between border-l-4 shadow-sm"
      style={{ borderLeftColor: color }}
    >
      <div className="space-y-0.5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold leading-none" style={{ color }}>{value}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </div>
      <Icon className="h-8 w-8 opacity-80" style={{ color }} />
    </div>
  );
}

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CRMStatCard label="Total Leads"    value={stats.totalLeads}    sublabel="Potential Clients"   color="hsl(var(--info))"          icon={Users}       />
        <CRMStatCard label="All Clients"    value={stats.allClients}    sublabel="Current client list" color="hsl(var(--success))"       icon={TrendingUp}  />
        <CRMStatCard label="Active Clients" value={stats.activeClients} sublabel="Currently active"    color="hsl(var(--purple-vibrant))" icon={CheckCircle} />
        <CRMStatCard label="Tasks"          value={stats.totalTasks}    sublabel="Total tasks"          color="hsl(var(--warning))"       icon={CheckSquare} />
      </div>

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
