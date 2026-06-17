import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Briefcase, CheckCircle, DollarSign, TrendingUp,
  Search, Plus, ChevronLeft, ChevronRight, MoreHorizontal, Eye, Edit,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { JobStatusBadge } from "../components/JobStatusBadge";
import { useJobs } from "../hooks/useJobs";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/shared/config/queryKeys";
import { getEffectiveJobStatus } from "../types/job.types";
import type { JobStatusFilter } from "../config/jobStatusConfig";

const ITEMS_PER_PAGE = 10;

export function JobsPage() {
  const navigate    = useNavigate();
  const qc          = useQueryClient();
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

  const [statusFilter, setStatusFilter] = useState<JobStatusFilter>("All");
  const [searchQuery, setSearchQuery]   = useState("");
  const [currentPage, setCurrentPage]  = useState(1);

  // ─── KPIs ───────────────────────────────────────────────────────────────
  const completedJobs = jobs.filter((j) => j.status === "Completed");
  const totalRevenue  = completedJobs.reduce((s, j) => s + j.total, 0);
  const completionRate = jobs.length > 0
    ? Math.round((completedJobs.length / jobs.length) * 100)
    : 0;

  const kpiCards = [
    { title: "Total Jobs",       value: jobs.length,           subtitle: "All time",        icon: Briefcase,   color: "hsl(var(--primary))"        },
    { title: "Completed",        value: completedJobs.length,  subtitle: "Finished jobs",   icon: CheckCircle, color: "hsl(var(--success))"        },
    { title: "Revenue",          value: `$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                                                subtitle: "From completed",  icon: DollarSign,  color: "hsl(var(--green-vibrant))"  },
    { title: "Completion Rate",  value: `${completionRate}%`,  subtitle: "vs total jobs",   icon: TrendingUp,  color: "hsl(var(--info))"           },
  ];

  // ─── Filtering ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return jobs
      .filter((j) => {
        if (statusFilter === "All") return true;
        return getEffectiveJobStatus(j) === statusFilter;
      })
      .filter((j) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          j.clientName.toLowerCase().includes(q) ||
          j.jobNumber.toLowerCase().includes(q)
        );
      });
  }, [jobs, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleFilterChange = (val: string) => { setStatusFilter(val as JobStatusFilter); setCurrentPage(1); };
  const handleSearch = (val: string) => { setSearchQuery(val); setCurrentPage(1); };

  return (
    <div className="p-2.5 space-y-2.5">

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
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-[140px] h-9 bg-white">
                  <SelectValue placeholder="Status: All" />
                </SelectTrigger>
                <SelectContent>
                  {["All", "Draft", "Scheduled", "Upcoming", "Today", "Completed", "Missed", "Cancelled"].map((s) => (
                    <SelectItem key={s} value={s}>{s === "All" ? "Status: All" : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 h-9 bg-white"
                />
              </div>
            </div>
            <Button className="h-9" onClick={() => navigate("/jobs/new")}>
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
                paginated.map((job) => (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer hover:bg-muted/50 border-b border-border/50"
                    onClick={() => navigate(`/jobs/${job.id}`)}
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
                    <TableCell className="py-2 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }}>
                            <Eye className="w-4 h-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}/edit`); }}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
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
    </div>
  );
}
