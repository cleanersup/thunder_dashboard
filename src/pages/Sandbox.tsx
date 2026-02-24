/**
 * Sandbox page — design system preview and layout smoke test.
 * Remove this file once Phase 3 (auth) is implemented and real pages exist.
 * Not protected by AuthGuard so it works without a logged-in session.
 */

import { useState } from "react";
import { MainLayout } from "@/shared/components/layout/MainLayout";
import { PageHeader } from "@/shared/components/common/PageHeader";
import { DataTable, type ColumnDef } from "@/shared/components/common/DataTable";
import { EmptyState } from "@/shared/components/common/EmptyState";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { SkeletonCard, StatCardSkeleton, ChartSkeleton } from "@/shared/components/common/SkeletonCard";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { toast } from "sonner";
import { Users, FileText, Receipt, Plus, Trash2, CheckCircle } from "lucide-react";

// ─── Demo data for DataTable ─────────────────────────────────────────────────

interface DemoClient {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  invoices: number;
}

const DEMO_CLIENTS: DemoClient[] = [
  { id: "1", name: "John Smith", email: "john@example.com", status: "active", invoices: 4 },
  { id: "2", name: "Maria Garcia", email: "maria@example.com", status: "active", invoices: 2 },
  { id: "3", name: "Robert Johnson", email: "robert@example.com", status: "inactive", invoices: 0 },
  { id: "4", name: "Emily Davis", email: "emily@example.com", status: "active", invoices: 7 },
  { id: "5", name: "Carlos Lopez", email: "carlos@example.com", status: "active", invoices: 1 },
  { id: "6", name: "Sarah Wilson", email: "sarah@example.com", status: "inactive", invoices: 0 },
];

const CLIENT_COLUMNS: ColumnDef<DemoClient>[] = [
  {
    key: "name",
    header: "Name",
    cell: (row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
          {row.name[0]}
        </div>
        <span className="font-medium">{row.name}</span>
      </div>
    ),
  },
  {
    key: "email",
    header: "Email",
    cell: (row) => <span className="text-muted-foreground">{row.email}</span>,
    hideOnMobile: true,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <Badge variant={row.status === "active" ? "default" : "secondary"}>
        {row.status}
      </Badge>
    ),
  },
  {
    key: "invoices",
    header: "Invoices",
    cell: (row) => <span>{row.invoices}</span>,
    hideOnMobile: true,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sandbox() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showSkeletons, setShowSkeletons] = useState(false);

  return (
    <MainLayout>
      <div className="p-4 lg:p-6 space-y-8 pb-24 lg:pb-8">

        {/* ── Header ── */}
        <PageHeader
          title="Design System Sandbox"
          subtitle="Preview of all shared components — remove once Phase 3 is done"
          actions={
            <Button onClick={() => toast.success("Action triggered!")}>
              <Plus className="h-4 w-4 mr-2" />
              Test Action
            </Button>
          }
        />

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Clients", value: "248", icon: Users, color: "text-blue-600 bg-blue-50" },
            { label: "Open Invoices", value: "$12,400", icon: FileText, color: "text-orange-600 bg-orange-50" },
            { label: "Estimates", value: "34", icon: Receipt, color: "text-purple-600 bg-purple-50" },
            { label: "Completed", value: "182", icon: CheckCircle, color: "text-green-600 bg-green-50" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Tabs with DataTable ── */}
        <Card>
          <CardHeader>
            <CardTitle>DataTable with search + pagination</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All clients</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="empty">Empty state</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <DataTable
                  columns={CLIENT_COLUMNS}
                  data={DEMO_CLIENTS}
                  keyExtractor={(c) => c.id}
                  searchable
                  searchPlaceholder="Search by name or email…"
                  filterFn={(c, q) =>
                    c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
                  }
                  paginated
                  pageSize={4}
                  onRowClick={(c) => toast.info(`Clicked: ${c.name}`)}
                  emptyTitle="No clients match your search"
                />
              </TabsContent>

              <TabsContent value="active">
                <DataTable
                  columns={CLIENT_COLUMNS}
                  data={DEMO_CLIENTS.filter((c) => c.status === "active")}
                  keyExtractor={(c) => c.id}
                  onRowClick={(c) => toast.info(`Clicked: ${c.name}`)}
                  emptyTitle="No active clients"
                />
              </TabsContent>

              <TabsContent value="empty">
                <DataTable
                  columns={CLIENT_COLUMNS}
                  data={[]}
                  keyExtractor={(c) => c.id}
                  emptyTitle="No clients yet"
                  emptyDescription="Add your first client to get started."
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* ── Components grid ── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Badges & Buttons */}
          <Card>
            <CardHeader><CardTitle>Badges & Buttons</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm">Small</Button>
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Input field…" className="max-w-xs" />
                <Button variant="outline">Submit</Button>
              </div>
            </CardContent>
          </Card>

          {/* Spinners */}
          <Card>
            <CardHeader><CardTitle>LoadingSpinner</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-xs text-muted-foreground">sm</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <LoadingSpinner size="md" />
                <span className="text-xs text-muted-foreground">md</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <LoadingSpinner size="lg" />
                <span className="text-xs text-muted-foreground">lg</span>
              </div>
            </CardContent>
          </Card>

          {/* EmptyState */}
          <Card>
            <CardHeader><CardTitle>EmptyState</CardTitle></CardHeader>
            <CardContent>
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                description="Create your first invoice to start getting paid."
                actionLabel="Create Invoice"
                onAction={() => toast.info("Create invoice clicked")}
              />
            </CardContent>
          </Card>

          {/* ConfirmDialog */}
          <Card>
            <CardHeader><CardTitle>ConfirmDialog</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Trigger a destructive confirmation dialog.
              </p>
              <Button
                variant="destructive"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete client
              </Button>
              <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete client?"
                description="This action cannot be undone. The client and all associated data will be permanently deleted."
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={() => {
                  setConfirmOpen(false);
                  toast.success("Client deleted (demo)");
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* ── Skeletons ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Skeleton components</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSkeletons((v) => !v)}
            >
              {showSkeletons ? "Hide" : "Show"} skeletons
            </Button>
          </CardHeader>
          <CardContent>
            {showSkeletons ? (
              <div className="grid lg:grid-cols-3 gap-4">
                <SkeletonCard rows={3} />
                <StatCardSkeleton />
                <ChartSkeleton height={100} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Toggle skeletons to preview loading states.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Toast triggers ── */}
        <Card>
          <CardHeader><CardTitle>Toast notifications (Sonner)</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => toast.success("Success message")}>Success</Button>
            <Button variant="outline" onClick={() => toast.error("Error message")}>Error</Button>
            <Button variant="outline" onClick={() => toast.info("Info message")}>Info</Button>
            <Button variant="outline" onClick={() => toast.warning("Warning message")}>Warning</Button>
            <Button variant="outline" onClick={() => toast.loading("Loading…", { duration: 2000 })}>Loading</Button>
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
}
