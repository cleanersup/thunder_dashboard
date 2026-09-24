import { useState } from "react";
import { Users, TrendingUp, Star, CheckCircle, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { LeadsKanban } from "../components/LeadsKanban";
import { useCRMStats } from "../../hooks/useCRMStats";

export function LeadsPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const { stats } = useCRMStats();

  return (
    <div className="p-2.5 space-y-2.5">

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Total Leads",     value: stats.totalLeads,    subtitle: "All leads",         color: "hsl(var(--info))",           icon: Users       },
              { title: "Active Leads",    value: stats.activeLeads,   subtitle: "In pipeline",       color: "hsl(var(--success))",        icon: TrendingUp  },
              { title: "Hot Leads",       value: stats.hotLeads,      subtitle: "High priority",     color: "hsl(var(--warning))",        icon: Star        },
              { title: "Converted",       value: stats.convertedLeads,subtitle: "Won this period",   color: "hsl(var(--purple-vibrant))", icon: CheckCircle },
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
            <span className="text-sm font-medium text-muted-foreground">Leads Pipeline</span>
            <Button className="h-9" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Lead
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Kanban ──────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-lg shadow-sm overflow-hidden p-4">
        <LeadsKanban showForm={showAddForm} onCloseForm={() => setShowAddForm(false)} />
      </div>

    </div>
  );
}
