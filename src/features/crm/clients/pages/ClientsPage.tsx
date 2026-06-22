import { useState } from "react";
import { Users, CheckCircle, UserX, Search, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ClientsTable } from "../components/ClientsTable";
import { useCRMStats } from "../../hooks/useCRMStats";

export function ClientsPage() {
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
              { title: "Total Clients",   value: stats.allClients,      subtitle: "All time",        color: "hsl(var(--primary))",        icon: Users       },
              { title: "Active Clients",  value: stats.activeClients,   subtitle: "Currently active",color: "hsl(var(--success))",        icon: CheckCircle },
              { title: "Inactive",        value: stats.inactiveClients, subtitle: "Not active",      color: "hsl(var(--warning))",        icon: UserX       },
              { title: "Total",           value: stats.allClients,      subtitle: "Client list",     color: "hsl(var(--purple-vibrant))", icon: Users       },
            ].map((card) => (
              <div key={card.title + card.subtitle} className="border-l-4 pl-4" style={{ borderLeftColor: card.color }}>
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
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button className="h-9" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Client
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <ClientsTable
          searchQuery={searchQuery}
          showForm={showAddForm}
          onCloseForm={() => setShowAddForm(false)}
        />
      </div>

    </div>
  );
}
