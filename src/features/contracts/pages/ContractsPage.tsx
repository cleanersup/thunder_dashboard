/**
 * @module ContractsPage
 * CON-2: Main contracts list page — 3-panel analytics, toolbar, table with actions.
 */
import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/shared/config/queryKeys";
import { format } from "date-fns";
import {
  Plus, Search, MoreHorizontal, ChevronLeft, ChevronRight,
  Calendar as CalendarIcon, Edit, RotateCcw, Trash2,
  ShieldCheck, Clock, Send, Eye, FileSignature,
  AlertTriangle, RefreshCw, Download,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Card, CardContent }    from "@/shared/components/ui/card";
import { Button }               from "@/shared/components/ui/button";
import { Input }                from "@/shared/components/ui/input";
import { Badge }                from "@/shared/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Calendar }        from "@/shared/components/ui/calendar";
import { cn }              from "@/shared/utils/cn";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/shared/hooks/useProfile";
import { useContracts, useDeleteContract } from "../hooks/useContracts";
import { CreateContractStep1Page }  from "./CreateContractStep1Page";
import { useSendContractEmail }     from "../hooks/useSendContractEmail";
import { useContractAccess }        from "../hooks/useContractAccess";
import { downloadContractPdf }      from "../services/generateContractPDF";
import { ContractDetailModal }      from "../components/ContractDetailModal";
import { RenewContractModal }       from "../components/RenewContractModal";
import { ContractTrialModal } from "../components/ContractTrialModal";
import { wasContractTrialModalShown } from "../utils/contractTrialStorage";
import { CONTRACT_CUTOFF_DATE }     from "../config/contracts.config";
import type { Contract, ContractStatus } from "../types/contract.types";

const ITEMS_PER_PAGE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "Active":   return "bg-green-100 text-green-700 border-green-200";
    case "Pending":  return "bg-orange-100 text-orange-700 border-orange-200";
    case "Draft":    return "bg-blue-100 text-blue-700 border-blue-200";
    case "Expired":  return "bg-red-100 text-red-700 border-red-200";
    case "Expiring": return "bg-yellow-100 text-yellow-700 border-yellow-200";
    default:         return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function freqSuffix(freq: string | null) {
  switch (freq) {
    case "weekly":    return "/wk";
    case "biweekly":  return "/bi-wk";
    case "monthly":   return "/mo";
    case "one-time":  return null;
    default:          return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContractsPage() {
  const navigate = useNavigate();

  // ── Filters ──────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ContractStatus>("All");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [currentPage,  setCurrentPage]  = useState(1);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showCreate,    setShowCreate]    = useState(false);
  const [editId,        setEditId]        = useState<string | undefined>();
  const [viewContract,  setViewContract]  = useState<Contract | null>(null);
  const [renewTarget,   setRenewTarget]   = useState<Contract | null>(null);
  const [showTrialModal, setShowTrialModal] = useState(false);

  // ── Confirm delete ────────────────────────────────────────────────────────
  const [deleteContract, setDeleteContract] = useState<Contract | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const queryClient = useQueryClient();
  const { data: profile }                    = useProfile();
  const { data: allContracts = [], isLoading } = useContracts();
  const deleteM    = useDeleteContract();
  const sendEmail  = useSendContractEmail();
  const { hasAccess, daysRemaining, reason } = useContractAccess();

  // ── Redirect if access expired (basic_expired or no_plan) ──────────────
  useEffect(() => {
    if (!hasAccess && reason !== "basic_trial") {
      navigate("/subscription-plans", { replace: true });
    }
  }, [hasAccess, reason, navigate]);

  // ── Trial modal: show once when basic user enters for the first time ────
  useEffect(() => {
    if (reason === "basic_trial" && !wasContractTrialModalShown()) {
      setShowTrialModal(true);
    }
  }, [reason]);

  // ── Real-time: refetch when contract status changes (e.g. client accepts) ─
  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      ch = supabase
        .channel("contracts-list-realtime")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "contracts", filter: `user_id=eq.${user.id}` },
          () => queryClient.invalidateQueries({ queryKey: QK.contracts }))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "contracts", filter: `user_id=eq.${user.id}` },
          () => queryClient.invalidateQueries({ queryKey: QK.contracts }))
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "contracts", filter: `user_id=eq.${user.id}` },
          () => queryClient.invalidateQueries({ queryKey: QK.contracts }))
        .subscribe();
    });
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [queryClient]);

  // ── Analytics ─────────────────────────────────────────────────────────────
  const active   = allContracts.filter((c) => c.status === "Active");
  const pending  = allContracts.filter((c) => c.status === "Pending");
  const expired  = allContracts.filter((c) => c.status === "Expired");
  const drafts   = allContracts.filter((c) => c.status === "Draft");

  const expiring = allContracts.filter((c) => {
    if (c.status !== "Active" || !c.end_date) return false;
    const end = new Date(c.end_date);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  });

  const statusDistribution = [
    { name: "Active",   value: active.length,   color: "hsl(142, 71%, 45%)" },
    { name: "Expiring", value: expiring.length,  color: "hsl(38, 92%, 50%)" },
    { name: "Pending",  value: pending.length,   color: "hsl(32, 95%, 44%)" },
    { name: "Draft",    value: drafts.length,    color: "hsl(217, 91%, 60%)" },
    { name: "Expired",  value: expired.length,   color: "hsl(0, 72%, 51%)" },
  ];

  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthName  = d.toLocaleDateString("en-US", { month: "short" });
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0);

      let revenue = 0;
      allContracts.forEach((c) => {
        if (!["Active", "Pending"].includes(c.status)) return;
        const cStart = c.start_date ? new Date(c.start_date) : null;
        const cEnd   = c.end_date   ? new Date(c.end_date)   : null;
        if (!cStart) return;
        if (cEnd && cEnd < monthStart) return;
        if (cStart > monthEnd) return;

        const freq = c.payment_frequency ?? "monthly";
        if (freq === "one-time") {
          if (cStart.getMonth() === d.getMonth() && cStart.getFullYear() === d.getFullYear()) {
            revenue += Number(c.total);
          }
        } else if (freq === "weekly")   revenue += Number(c.total) * 4;
        else if (freq === "biweekly")   revenue += Number(c.total) * 2;
        else                            revenue += Number(c.total);
      });
      return { name: monthName, revenue: Math.round(revenue * 100) / 100 };
    });
  }, [allContracts]);

  // ── Filtering + pagination ────────────────────────────────────────────────
  const filtered = allContracts
    .filter((c) =>
      c.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
      c.contract_number.toLowerCase().includes(search.toLowerCase())
    )
    .filter((c) => {
      if (statusFilter === "All") return true;
      if (statusFilter === "Expiring") {
        if (!c.end_date || c.status !== "Active") return false;
        const diffDays = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000);
        return diffDays > 0 && diffDays <= 30;
      }
      return c.status === statusFilter;
    })
    .filter((c) => {
      if (!selectedDate) return true;
      const d = new Date(c.created_at);
      return (
        d.getDate()     === selectedDate.getDate() &&
        d.getMonth()    === selectedDate.getMonth() &&
        d.getFullYear() === selectedDate.getFullYear()
      );
    });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ── Action helpers ────────────────────────────────────────────────────────
  const handleSend = (contract: Contract) => {
    if (contract.recipient_email) {
      sendEmail.mutate({ contractId: contract.id, recipientEmail: contract.recipient_email });
    }
  };

  const handleDownloadPDF = (contract: Contract) => {
    const p = profile as Record<string, unknown> | null | undefined;
    downloadContractPdf({
      companyLogo:     (p?.company_logo    as string) || null,
      companyName:     (p?.company_name    as string) || "",
      companyAddress:  (p?.company_address as string) || "",
      companyCity:     (p?.company_city    as string) || "",
      companyState:    (p?.company_state   as string) || "",
      companyZip:      (p?.company_zip     as string) || "",
      companyPhone:    (p?.company_phone   as string) || "",
      companyEmail:    (p?.company_email   as string) || "",
      contractNumber:  contract.contract_number,
      recipientName:   contract.recipient_name,
      startDate:       contract.start_date,
      endDate:         contract.end_date,
      whoWeAre:        contract.who_we_are        ?? "",
      whyChooseUs:     contract.why_choose_us     ?? "",
      ourServices:     contract.our_services      ?? "",
      serviceCoverage: contract.service_coverage  ?? "",
      sections:        contract.sections,
    });
  };

  const isSending = sendEmail.isPending;

  const canEdit   = (s: ContractStatus) => s === "Draft" || s === "Pending";
  const canSend   = (s: ContractStatus) => s === "Pending" || s === "Active" || s === "Expiring";
  const canRenew  = (s: ContractStatus) => s === "Active" || s === "Expiring" || s === "Expired";
  const canDelete = (s: ContractStatus) => s === "Draft" || s === "Pending" || s === "Expired";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-background p-2.5">

      {/* Trial countdown banner */}
      {hasAccess && reason === "basic_trial" && daysRemaining !== null && (
        <div className="mb-2.5 flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Free access ends in{" "}
                <span className="tabular-nums">{daysRemaining} day{daysRemaining !== 1 ? "s" : ""}</span>
              </p>
              <p className="text-xs text-amber-700">
                Contracts requires the Essential plan after{" "}
                {format(CONTRACT_CUTOFF_DATE, "MMMM d, yyyy")}.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs shrink-0"
            onClick={() => navigate("/subscription-plans")}
          >
            Upgrade to Keep Access
          </Button>
        </div>
      )}

      {/* No access banner */}
      {!hasAccess && (
        <div className="mb-2.5 flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
              <FileSignature className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-semibold text-destructive">Contracts is a premium feature</p>
              <p className="text-xs text-destructive/80">
                Available on the Essential plan ($79/mo) or higher.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="h-8 text-xs shrink-0"
            onClick={() => navigate("/subscription-plans")}
          >
            View Plans
          </Button>
        </div>
      )}

      {/* ── 3-Panel Analytics ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-[240px_1fr_1fr] gap-2.5 mb-2.5 items-stretch">

        {/* Overview sidebar */}
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-4 flex flex-col gap-3 h-full justify-between">
            <p className="text-[13px] font-semibold text-foreground">Overview</p>

            <div
              className="border border-border/50 rounded-lg border-l-4 pl-3 py-2 pr-3 flex items-center justify-between"
              style={{ borderLeftColor: "hsl(var(--green-vibrant))" }}
            >
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-xl font-bold" style={{ color: "hsl(var(--green-vibrant))" }}>
                  {active.length}
                </p>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "hsl(var(--green-vibrant) / 0.12)" }}
              >
                <ShieldCheck size={16} style={{ color: "hsl(var(--green-vibrant))" }} />
              </div>
            </div>

            <div
              className="border border-border/50 rounded-lg border-l-4 pl-3 py-2 pr-3 flex items-center justify-between"
              style={{ borderLeftColor: "hsl(32, 95%, 44%)" }}
            >
              <div>
                <p className="text-xs text-muted-foreground">Expiring Soon</p>
                <p className="text-xl font-bold" style={{ color: "hsl(32, 95%, 44%)" }}>
                  {expiring.length}
                </p>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(200,100,20,0.10)" }}
              >
                <Clock size={16} style={{ color: "hsl(32, 95%, 44%)" }} />
              </div>
            </div>

            <div
              className="border border-border/50 rounded-lg border-l-4 pl-3 py-2 pr-3 flex items-center justify-between"
              style={{ borderLeftColor: "hsl(0, 72%, 51%)" }}
            >
              <div>
                <p className="text-xs text-muted-foreground">Expired</p>
                <p className="text-xl font-bold" style={{ color: "hsl(0, 72%, 51%)" }}>
                  {expired.length}
                </p>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(200,50,50,0.10)" }}
              >
                <AlertTriangle size={16} style={{ color: "hsl(0, 72%, 51%)" }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue bar chart */}
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-4 flex flex-col h-full">
            <p className="text-[13px] font-semibold text-foreground mb-3">Monthly Revenue</p>
            <div className="flex-1 min-h-0" style={{ minHeight: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                      "Revenue",
                    ]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Contract Status donut chart */}
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-4 flex flex-col h-full">
            <p className="text-[13px] font-semibold text-foreground mb-3">Contract Status</p>
            <div className="flex items-center gap-4 flex-1">
              <div className="relative">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-lg font-bold text-foreground">{allContracts.length}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                {statusDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-muted-foreground w-16">{item.name}</span>
                    <span className="text-xs font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none mb-2.5">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setCurrentPage(1); }}
              >
                <SelectTrigger className="w-[130px] h-9 text-[13px] bg-white border-border/50">
                  <SelectValue placeholder="Status: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All"      className="text-[13px]">Status: All</SelectItem>
                  <SelectItem value="Active"   className="text-[13px]">Active</SelectItem>
                  <SelectItem value="Pending"  className="text-[13px]">Pending</SelectItem>
                  <SelectItem value="Draft"    className="text-[13px]">Draft</SelectItem>
                  <SelectItem value="Expired"  className="text-[13px]">Expired</SelectItem>
                  <SelectItem value="Expiring" className="text-[13px]">Expiring Soon</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search client..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="pl-9 h-9 border-border/50 text-[13px] bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 whitespace-nowrap border-border/50 text-[13px]",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "MMM d") : "Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setCurrentPage(1); }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Button className="h-9 text-[13px]" onClick={() => { setEditId(undefined); setShowCreate(true); }}>
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active date filter pill */}
      {selectedDate && (
        <div className="flex items-center justify-between bg-accent/50 p-2 rounded-md mb-2.5">
          <span className="text-[13px] text-muted-foreground">
            Filtered by: {format(selectedDate, "PPP")}
          </span>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setSelectedDate(undefined)}>
            Clear
          </Button>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <Table className="text-[13px]">
          <TableHeader>
            <TableRow>
              <TableHead className="h-10 font-bold text-[13px]">Client Name</TableHead>
              <TableHead className="h-10 font-bold text-[13px]">Contract #</TableHead>
              <TableHead className="h-10 font-bold text-[13px]">Date</TableHead>
              <TableHead className="h-10 font-bold text-[13px]">Period</TableHead>
              <TableHead className="h-10 font-bold text-[13px]">Status</TableHead>
              <TableHead className="h-10 font-bold text-[13px]">Amount</TableHead>
              <TableHead className="h-10 font-bold text-[13px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading contracts...
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 rounded-full bg-secondary/50">
                      <FileSignature className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {allContracts.length === 0 ? "No contracts yet" : "No contracts match your filters"}
                      </p>
                      <p className="text-[13px] text-muted-foreground">
                        {allContracts.length === 0 ? "Create your first contract to get started" : "Try adjusting your filters"}
                      </p>
                    </div>
                    {allContracts.length === 0 && (
                      <Button size="sm" onClick={() => setShowCreate(true)}>
                        <Plus className="w-4 h-4 mr-1" />
                        Create Contract
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((contract) => (
                <TableRow
                  key={contract.id}
                  className="cursor-pointer hover:bg-muted/50 border-b border-border/50"
                  onClick={() => setViewContract(contract)}
                >
                  <TableCell className="py-2 px-4 font-medium">{contract.recipient_name}</TableCell>
                  <TableCell className="py-2 px-4 font-mono text-xs">{contract.contract_number}</TableCell>
                  <TableCell className="py-2 px-4 text-muted-foreground">
                    {format(new Date(contract.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="py-2 px-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        Start: {contract.start_date ? format(new Date(contract.start_date), "MMM d, yyyy") : "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        End: {contract.end_date ? format(new Date(contract.end_date), "MMM d, yyyy") : "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-4">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn("font-medium text-[13px]", getStatusBadgeClass(contract.status))}
                      >
                        {contract.status}
                      </Badge>
                      {contract.renewed_at && (
                        <Badge variant="outline" className="font-medium text-[11px] bg-emerald-50 text-emerald-600 border-emerald-200">
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Renewed
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-4">
                    <div className="flex flex-col">
                      <span className="font-semibold">${Number(contract.total).toFixed(2)}</span>
                      {freqSuffix(contract.payment_frequency) && (
                        <span className="text-xs text-muted-foreground">
                          {freqSuffix(contract.payment_frequency)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">

                        {/* View */}
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); setViewContract(contract); }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>

                        {/* Edit */}
                        {canEdit(contract.status) && (
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); setEditId(contract.id); setShowCreate(true); }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}

                        {/* Send / Resend */}
                        {canSend(contract.status) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={isSending}
                              onClick={(e) => { e.stopPropagation(); handleSend(contract); }}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Resend
                            </DropdownMenuItem>
                          </>
                        )}

                        {/* Renew */}
                        {canRenew(contract.status) && (
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); setRenewTarget(contract); }}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Renew
                          </DropdownMenuItem>
                        )}

                        {/* Download PDF */}
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleDownloadPDF(contract); }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </DropdownMenuItem>

                        {/* Delete */}
                        {canDelete(contract.status) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeleteContract(contract); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <span className="text-[13px] text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} contracts
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-[13px] font-medium px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Detail modal (CON-6) ───────────────────────────────────────────── */}
      <ContractDetailModal
        contract={viewContract}
        open={!!viewContract}
        onClose={() => setViewContract(null)}
        onEdit={(c)     => { setViewContract(null); setEditId(c.id); setShowCreate(true); }}
        onRenew={(c)    => { setViewContract(null); setRenewTarget(c); }}
        onDownload={handleDownloadPDF}
        onDelete={(c)   => { setViewContract(null); setDeleteContract(c); }}
      />

      {/* ── Create / Edit modal ────────────────────────────────────────────── */}
      {showCreate && (
        <CreateContractStep1Page
          key={editId ?? "new"}
          open={showCreate}
          onClose={() => { setShowCreate(false); setEditId(undefined); }}
          editId={editId}
        />
      )}

      {/* ── Renew modal (CON-8) ────────────────────────────────────────────── */}
      <RenewContractModal
        contract={renewTarget}
        open={!!renewTarget}
        onClose={() => setRenewTarget(null)}
      />

      {/* ── Delete confirmation ────────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteContract}
        onOpenChange={(open) => { if (!open) setDeleteContract(null); }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contract</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{deleteContract?.contract_number}</span> for{" "}
              <span className="font-medium">{deleteContract?.recipient_name}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteContract(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteM.isPending}
              onClick={() => {
                if (!deleteContract) return;
                deleteM.mutate(deleteContract.id, {
                  onSuccess: () => setDeleteContract(null),
                });
              }}
            >
              {deleteM.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Trial modal (shown once per browser for basic_trial users) ───────── */}
      {reason === "basic_trial" && daysRemaining !== null && (
        <ContractTrialModal
          open={showTrialModal}
          daysRemaining={daysRemaining}
          onClose={() => setShowTrialModal(false)}
        />
      )}
    </div>
  );
}
