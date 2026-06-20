import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Briefcase, CheckCircle, DollarSign, TrendingUp,
  Search, Plus, ChevronLeft, ChevronRight, MoreHorizontal, Eye, Edit, CalendarIcon, X,
  Play, CalendarClock, XCircle, Trash2, Download, Receipt,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { JobCompleteDialog } from "../components/JobCompleteDialog";
import { useDeleteJob, useUpdateJobStatus } from "../hooks/useJobMutations";
import { jobsService } from "../services/jobsService";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { cn } from "@/shared/utils/cn";
import { format as formatDate } from "date-fns";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { JobStatusBadge } from "../components/JobStatusBadge";
import { useJobs } from "../hooks/useJobs";
import { AddJobPage } from "./AddJobPage";
import { JobDetailPanel } from "../components/JobDetailPanel";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/shared/config/queryKeys";
import { getEffectiveJobStatus } from "../types/job.types";
import type { JobStatusFilter } from "../config/jobStatusConfig";

const ITEMS_PER_PAGE = 10;

export function JobsPage() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const qc          = useQueryClient();

  const [jobModalOpen,  setJobModalOpen]  = useState(false);
  const [editJobId,     setEditJobId]     = useState<string | null>(null);
  const [detailId,      setDetailId]      = useState<string | null>(null);
  const [detailOpen,    setDetailOpen]    = useState(false);

  // ── Per-row action state ─────────────────────────────────────────────────
  const [actionJob,       setActionJob]       = useState<(typeof jobs)[0] | null>(null);
  const [showComplete,    setShowComplete]    = useState(false);
  const [showPublish,     setShowPublish]     = useState(false);
  const [showCancel,      setShowCancel]      = useState(false);
  const [showDelete,      setShowDelete]      = useState(false);
  const { mutate: updateStatus, isPending: updatingStatus } = useUpdateJobStatus();
  const { mutate: deleteJob,    isPending: deletingJob }    = useDeleteJob();

  // Auto-open panel from state (coming from conversion or linked record)
  useEffect(() => {
    const state = location.state as { openEditJobId?: string; openId?: string } | null;
    if (state?.openEditJobId) {
      setEditJobId(state.openEditJobId);
      setJobModalOpen(true);
      window.history.replaceState({}, "");
    } else if (state?.openId) {
      setDetailId(state.openId);
      setDetailOpen(true);
      window.history.replaceState({}, "");
    }
  }, [location.state]);
  const { data: jobs = [], isLoading } = useJobs();

  // ─── Real-time ──────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("jobs_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => {
        qc.invalidateQueries({ queryKey: QK.jobs });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const [statusFilter,  setStatusFilter]  = useState<JobStatusFilter>("All");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [selectedDate,  setSelectedDate]  = useState<Date | undefined>();
  const [sortOrder,     setSortOrder]     = useState<"status" | "date_desc" | "date_asc">("status");
  const [currentPage,   setCurrentPage]   = useState(1);

  // ─── KPIs (matches swift-slate exactly) ─────────────────────────────────
  const kpis = useMemo(() => {
    const completed = jobs.filter((j) => j.status === "Completed");
    const missed    = jobs.filter((j) => j.status === "Missed");
    const revenue   = completed.reduce((s, j) => s + j.total, 0);
    const rate      = completed.length + missed.length > 0
      ? Math.round((completed.length / (completed.length + missed.length)) * 100)
      : 0;
    return {
      total:          jobs.filter((j) => j.status !== "Cancelled").length,
      completed:      completed.length,
      revenue,
      completionRate: rate,
    };
  }, [jobs]);

  const kpiCards = [
    { title: "Total Jobs",      value: kpis.total,           subtitle: "Active & completed", icon: Briefcase,   color: "hsl(var(--primary))"       },
    { title: "Completed",       value: kpis.completed,       subtitle: "Successfully done",  icon: CheckCircle, color: "hsl(var(--green-vibrant))" },
    { title: "Revenue",         value: `$${kpis.revenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
                                                              subtitle: "From completed jobs", icon: DollarSign, color: "hsl(var(--orange-vibrant))"},
    { title: "Completion Rate", value: `${kpis.completionRate}%`, subtitle: "Completed vs missed", icon: TrendingUp, color: "hsl(var(--info))"   },
  ];

  // ─── Filtering + sorting (matches swift-slate exactly) ───────────────────
  const STATUS_PRIORITY: Record<string, number> = {
    Today: 0, Ongoing: 0,
    Upcoming: 1,
    Scheduled: 2,
    Missed: 3,
    Draft: 4,
    Completed: 5,
    Cancelled: 6,
  };

  const filtered = useMemo(() => {
    return jobs
      .filter((j) => {
        if (statusFilter === "All") return true;
        return getEffectiveJobStatus(j) === statusFilter;
      })
      .filter((j) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return j.clientName.toLowerCase().includes(q) || j.jobNumber.toLowerCase().includes(q);
      })
      .filter((j) => {
        if (!selectedDate) return true;
        const [y, m, d] = j.jobDate.split("-").map(Number);
        return (
          selectedDate.getFullYear() === y &&
          selectedDate.getMonth() + 1 === m &&
          selectedDate.getDate() === d
        );
      })
      .sort((a, b) => {
        const dateCompare = a.jobDate.localeCompare(b.jobDate);
        const timeCompare = (a.startTime || "").localeCompare(b.startTime || "");
        if (sortOrder === "date_desc") {
          return dateCompare !== 0 ? -dateCompare : -timeCompare;
        }
        if (sortOrder === "date_asc") {
          return dateCompare !== 0 ? dateCompare : timeCompare;
        }
        // Default: status priority, then date asc
        const pa = STATUS_PRIORITY[getEffectiveJobStatus(a)] ?? 99;
        const pb = STATUS_PRIORITY[getEffectiveJobStatus(b)] ?? 99;
        if (pa !== pb) return pa - pb;
        return dateCompare !== 0 ? dateCompare : timeCompare;
      });
  }, [jobs, statusFilter, searchQuery, selectedDate, sortOrder]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleFilterChange = (val: string) => { setStatusFilter(val as JobStatusFilter); setCurrentPage(1); };
  const handleSearch = (val: string) => { setSearchQuery(val); setCurrentPage(1); };

  return (
    <div className="min-h-full bg-background p-2.5 space-y-2.5">

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card) => (
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
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Search */}
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client or job #..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 h-9 bg-white"
                />
              </div>
              {/* Date filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-9 gap-1.5 bg-white", selectedDate && "border-primary text-primary")}>
                    <CalendarIcon className="h-4 w-4" />
                    {selectedDate ? formatDate(selectedDate, "MMM d") : "Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setCurrentPage(1); }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {/* Status filter */}
              <Select value={statusFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="h-9 w-[130px] bg-white">
                  <SelectValue placeholder="Status: All" />
                </SelectTrigger>
                <SelectContent>
                  {["All", "Draft", "Scheduled", "Upcoming", "Today", "Completed", "Missed", "Cancelled"].map((s) => (
                    <SelectItem key={s} value={s}>{s === "All" ? "Status: All" : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Sort */}
              <Select value={sortOrder} onValueChange={(v) => { setSortOrder(v as typeof sortOrder); setCurrentPage(1); }}>
                <SelectTrigger className={cn("h-9 w-[110px] bg-white", sortOrder !== "status" && "border-primary text-primary")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">By Status</SelectItem>
                  <SelectItem value="date_desc">Newest</SelectItem>
                  <SelectItem value="date_asc">Oldest</SelectItem>
                </SelectContent>
              </Select>
              {/* Clear active filters */}
              {(selectedDate || statusFilter !== "All" || searchQuery) && (
                <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground" onClick={() => { setSelectedDate(undefined); setStatusFilter("All"); setSearchQuery(""); setCurrentPage(1); }}>
                  <X className="h-4 w-4" /> Clear
                </Button>
              )}
            </div>
            <Button className="h-9 flex-shrink-0" onClick={() => { setEditJobId(null); setJobModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New Job
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        {isLoading ? (
          <LoadingSpinner centered />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-10 font-bold">Job #</TableHead>
                <TableHead className="h-10 font-bold">Client</TableHead>
                <TableHead className="h-10 font-bold">Date</TableHead>
                <TableHead className="h-10 font-bold">Service</TableHead>
                <TableHead className="h-10 font-bold">Total</TableHead>
                <TableHead className="h-10 font-bold">Status</TableHead>
                <TableHead className="h-10 font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No jobs found
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((job) => {
                  const effectiveStatus = getEffectiveJobStatus(job);
                  return (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer hover:bg-muted/50 border-b border-border/50"
                    onClick={() => { setDetailId(job.id); setDetailOpen(true); }}
                  >
                    <TableCell className="py-2 px-4 font-mono text-sm">{job.jobNumber}</TableCell>
                    <TableCell className="py-2 px-4 font-medium">{job.clientName}</TableCell>
                    <TableCell className="py-2 px-4 text-sm text-muted-foreground">
                      {format(parseISO(job.jobDate), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="py-2 px-4 capitalize text-sm">{job.serviceType}</TableCell>
                    <TableCell className="py-2 px-4 text-sm font-medium">
                      ${job.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="py-2 px-4">
                      <JobStatusBadge status={job.status} job={job} size="sm" />
                    </TableCell>
                    <TableCell className="py-2 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => { setDetailId(job.id); setDetailOpen(true); }}>
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>

                          {/* Draft */}
                          {effectiveStatus === "Draft" && (<>
                            <DropdownMenuItem onClick={() => { setActionJob(job); setShowPublish(true); }}>
                              <Play className="w-4 h-4 mr-2 text-blue-600" /> Publish & Schedule
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditJobId(job.id); setJobModalOpen(true); }}>
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setActionJob(job); setShowCancel(true); }}>
                              <XCircle className="w-4 h-4 mr-2" /> Cancel
                            </DropdownMenuItem>
                          </>)}

                          {/* Scheduled */}
                          {effectiveStatus === "Scheduled" && (<>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setActionJob(job); setShowCancel(true); }}>
                              <XCircle className="w-4 h-4 mr-2" /> Cancel
                            </DropdownMenuItem>
                          </>)}

                          {/* Upcoming / Today */}
                          {(effectiveStatus === "Upcoming" || effectiveStatus === "Today") && (<>
                            <DropdownMenuItem onClick={() => { setActionJob(job); setShowComplete(true); }}>
                              <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Mark as Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditJobId(job.id); setJobModalOpen(true); }}>
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setActionJob(job); setShowCancel(true); }}>
                              <XCircle className="w-4 h-4 mr-2" /> Cancel
                            </DropdownMenuItem>
                          </>)}

                          {/* Missed */}
                          {effectiveStatus === "Missed" && (<>
                            <DropdownMenuItem onClick={() => { setActionJob(job); setShowComplete(true); }}>
                              <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Mark as Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditJobId(job.id); setJobModalOpen(true); }}>
                              <CalendarClock className="w-4 h-4 mr-2" /> Reschedule
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setActionJob(job); setShowCancel(true); }}>
                              <XCircle className="w-4 h-4 mr-2" /> Cancel
                            </DropdownMenuItem>
                          </>)}

                          {/* Completed */}
                          {effectiveStatus === "Completed" && (<>
                            {job.invoiceIds?.[0] && (
                              <DropdownMenuItem onClick={() => navigate("/invoices", { state: { openId: job.invoiceIds[0] } })}>
                                <Receipt className="w-4 h-4 mr-2" /> View Invoice
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setActionJob(job); setShowDelete(true); }}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </>)}

                          {/* Cancelled */}
                          {effectiveStatus === "Cancelled" && (<>
                            <DropdownMenuItem onClick={() => { setEditJobId(job.id); setJobModalOpen(true); }}>
                              <CalendarClock className="w-4 h-4 mr-2" /> Reschedule
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setActionJob(job); setShowDelete(true); }}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </>)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <span className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} jobs
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium px-2">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AddJobPage
        open={jobModalOpen}
        onClose={() => { setJobModalOpen(false); setEditJobId(null); }}
        jobId={editJobId}
      />

      <JobDetailPanel
        jobId={detailId}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailId(null); }}
        onUpdated={() => {}}
      />

      {/* ── Per-row action dialogs ─────────────────────────────────────── */}
      <JobCompleteDialog
        job={actionJob ?? null}
        open={showComplete}
        onOpenChange={(v) => { setShowComplete(v); if (!v) setActionJob(null); }}
      />

      <ConfirmDialog
        open={showPublish}
        onOpenChange={(v) => { setShowPublish(v); if (!v) setActionJob(null); }}
        title="Publish & Schedule"
        description="The job will be marked as Upcoming and added to the active schedule."
        onConfirm={() => updateStatus({ id: actionJob!.id, status: "Upcoming" }, { onSuccess: () => { setShowPublish(false); setActionJob(null); } })}
        confirmLabel="Publish & Schedule"
        isLoading={updatingStatus}
      />

      <ConfirmDialog
        open={showCancel}
        onOpenChange={(v) => { setShowCancel(v); if (!v) setActionJob(null); }}
        title="Cancel Job"
        description="This job will be marked as cancelled."
        onConfirm={() => updateStatus({ id: actionJob!.id, status: "Cancelled" }, { onSuccess: () => { setShowCancel(false); setActionJob(null); } })}
        confirmLabel="Cancel Job"
        variant="destructive"
        isLoading={updatingStatus}
      />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={(v) => { setShowDelete(v); if (!v) setActionJob(null); }}
        title="Delete Job"
        description="This job will be permanently deleted."
        onConfirm={() => deleteJob(actionJob!.id, { onSuccess: () => { setShowDelete(false); setActionJob(null); } })}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deletingJob}
      />
    </div>
  );
}
