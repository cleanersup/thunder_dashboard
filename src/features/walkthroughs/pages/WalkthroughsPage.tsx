import { useState, useMemo } from "react";
import {
  formatTime,
  formatDate,
  statusBadgeClass,
  formatStatusLabel,
} from "../utils/walkthroughUtils";
import {
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Eye,
  Play,
  FileCheck,
  CalendarClock,
  Download,
  Trash2,
  CalendarIcon,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useWalkthroughs, useUpdateWalkthroughStatus, useDeleteWalkthrough } from "../hooks/useWalkthroughs";
import { WalkthroughDetailsModal } from "../components/WalkthroughDetailsModal";
import type { WalkthroughWithContact } from "../services/walkthroughsService";
import { cn } from "@/shared/utils/cn";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ─── KPI config ───────────────────────────────────────────────────────────────

const KPI_CONFIG = [
  {
    key:         "pending",
    title:       "Pending",
    subtitle:    "Awaiting completion",
    icon:        Clock,
    color:       "#f97316",   // orange
    statuses:    ["Scheduled", "Pending"],
  },
  {
    key:         "completed",
    title:       "Completed",
    subtitle:    "Ready to estimate",
    icon:        CheckCircle,
    color:       "#22c55e",   // green
    statuses:    ["Completed"],
  },
  {
    key:         "estimate_sent",
    title:       "Estimate Sent",
    subtitle:    "Estimates delivered",
    icon:        CheckCircle2,
    color:       "#a855f7",   // purple
    statuses:    ["estimate_sent"],
  },
  {
    key:         "cancelled",
    title:       "Cancelled",
    subtitle:    "Not proceeding",
    icon:        XCircle,
    color:       "#ef4444",   // red
    statuses:    ["Cancelled"],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function WalkthroughsPage() {
  const navigate = useNavigate();

  const { data: walkthroughs = [], isLoading, refetch } = useWalkthroughs();
  const { mutate: updateStatus } = useUpdateWalkthroughStatus();
  const { mutate: deleteMutate } = useDeleteWalkthrough();

  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [detailWalkthrough, setDetailWalkthrough] = useState<WalkthroughWithContact | null>(null);
  const [detailOpen, setDetailOpen]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WalkthroughWithContact | null>(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [cancelTarget, setCancelTarget] = useState<WalkthroughWithContact | null>(null);
  const [cancelOpen, setCancelOpen]     = useState(false);
  const [qrOpen, setQrOpen]             = useState(false);
  const [qrTarget, setQrTarget]         = useState<WalkthroughWithContact | null>(null);
  const [isStarting, setIsStarting]     = useState(false);

  const { data: userId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    staleTime: Infinity,
  });

  const contactCardUrl = `${import.meta.env.VITE_PUBLIC_APP_URL ?? window.location.origin}/contact-card/${userId ?? ""}`;

  // ── KPI counts ─────────────────────────────────────────────────────────────
  const kpiCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    KPI_CONFIG.forEach((k) => {
      counts[k.key] = walkthroughs.filter((w) => k.statuses.includes(w.status)).length;
    });
    return counts;
  }, [walkthroughs]);

  // ── Filtered rows ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return walkthroughs.filter((w) => {
      const matchStatus = statusFilter === "All" || w.status === statusFilter;
      const matchSearch = !search || w.contact_name.toLowerCase().includes(search.toLowerCase());
      const matchDate   = !selectedDate || (() => {
        const [y, m, d] = w.scheduled_date.split("-").map(Number);
        return (
          selectedDate.getFullYear() === y &&
          selectedDate.getMonth()    === m - 1 &&
          selectedDate.getDate()     === d
        );
      })();
      return matchStatus && matchSearch && matchDate;
    });
  }, [walkthroughs, statusFilter, search, selectedDate]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openDetail(w: WalkthroughWithContact) {
    setDetailWalkthrough(w);
    setDetailOpen(true);
  }

  async function handleStartWalkthrough(w: WalkthroughWithContact) {
    setIsStarting(true);
    setQrTarget(w);
    try {
      await supabase.functions.invoke("send-walkthrough-start", { body: { walkthroughId: w.id } });
      supabase.functions.invoke("send-walkthrough-start-sms", { body: { walkthroughId: w.id } }).catch(() => {});
      setQrOpen(true);
    } catch {
      toast.error("Failed to send walkthrough notification");
      setQrTarget(null);
    } finally {
      setIsStarting(false);
    }
  }

  function handleNavigateToForm() {
    if (!qrTarget) return;
    const path = qrTarget.service_type === "residential"
      ? `/walkthrough/residential/${qrTarget.id}`
      : `/walkthrough/commercial/${qrTarget.id}`;
    setQrOpen(false);
    navigate(path);
  }

  function handleGenerateEstimate(w: WalkthroughWithContact) {
    const path = w.service_type === "residential"
      ? "/estimates/new/residential"
      : "/estimates/new/commercial";
    navigate(path, {
      state: {
        prefill: {
          walkthrough_id: w.id,
          contact_name:   w.contact_name,
          client_id:      w.client_id,
          lead_id:        w.lead_id,
        },
      },
    });
  }

  function handleDownloadPDF() {
    toast.info("PDF download coming soon");
  }

  function confirmCancel(w: WalkthroughWithContact) {
    setCancelTarget(w);
    setCancelOpen(true);
  }

  function handleCancel() {
    if (!cancelTarget) return;
    updateStatus(
      { id: cancelTarget.id, status: "Cancelled" },
      {
        onSuccess: () => {
          toast.success("Walkthrough cancelled");
          setCancelOpen(false);
          setCancelTarget(null);
          refetch();
        },
      }
    );
  }

  function confirmDelete(w: WalkthroughWithContact) {
    setDeleteTarget(w);
    setDeleteOpen(true);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        setDeleteTarget(null);
        refetch();
      },
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-background p-2.5 space-y-2.5">

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {KPI_CONFIG.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.key} className="border-l-4 pl-4" style={{ borderLeftColor: kpi.color }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{kpi.title}</p>
                      <p className="text-2xl font-bold mt-1" style={{ color: kpi.color }}>
                        {kpiCounts[kpi.key] ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/50">
                      <Icon className="w-5 h-5" style={{ color: kpi.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Back to Estimates */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => navigate("/estimates")}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Estimates
            </Button>

            <div className="flex-1" />

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Status: All</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="estimate_sent">Estimate Sent</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 w-44"
              />
            </div>

            {/* Date filter */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("h-9 gap-2", selectedDate && "border-primary text-primary")}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {selectedDate ? format(selectedDate, "MM/dd/yyyy") : "Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { setSelectedDate(d); setCalendarOpen(false); }}
                  initialFocus
                />
                {selectedDate && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setSelectedDate(undefined)}
                    >
                      Clear date filter
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* New walkthrough */}
            <Button
              size="sm"
              className="h-9 gap-2"
              onClick={() => navigate("/walkthroughs/new")}
            >
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Client</TableHead>
              <TableHead className="font-bold">Service</TableHead>
              <TableHead className="font-bold">Date</TableHead>
              <TableHead className="font-bold">Time</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="w-[60px] font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No walkthroughs found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((w) => (
                <TableRow
                  key={w.id}
                  className="cursor-pointer hover:bg-secondary/50"
                  onClick={() => openDetail(w)}
                >
                  <TableCell className="font-medium">{w.contact_name}</TableCell>
                  <TableCell className="capitalize">{w.service_type}</TableCell>
                  <TableCell>{formatDate(w.scheduled_date)}</TableCell>
                  <TableCell>{formatTime(w.scheduled_time)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("rounded-full", statusBadgeClass(w.status))}>
                      {formatStatusLabel(w.status)}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDetail(w)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>

                        {/* Scheduled */}
                        {w.status === "Scheduled" && (
                          <DropdownMenuItem onClick={() => navigate(`/walkthroughs/${w.id}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {w.status === "Scheduled" && (
                          <DropdownMenuItem
                            className="text-green-600 focus:text-green-600"
                            disabled={isStarting && qrTarget?.id === w.id}
                            onClick={() => handleStartWalkthrough(w)}
                          >
                            {isStarting && qrTarget?.id === w.id
                              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              : <Play className="mr-2 h-4 w-4" />
                            }
                            Start Walkthrough
                          </DropdownMenuItem>
                        )}

                        {/* Pending */}
                        {w.status === "Pending" && (
                          <DropdownMenuItem onClick={() => navigate(`/walkthroughs/${w.id}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}

                        {/* Completed */}
                        {w.status === "Completed" && (
                          <DropdownMenuItem onClick={() => handleGenerateEstimate(w)}>
                            <FileCheck className="mr-2 h-4 w-4" />
                            Generate Estimate
                          </DropdownMenuItem>
                        )}

                        {/* Cancelled */}
                        {w.status === "Cancelled" && (
                          <DropdownMenuItem onClick={() => navigate(`/walkthroughs/${w.id}/edit`)}>
                            <CalendarClock className="mr-2 h-4 w-4" />
                            Reschedule
                          </DropdownMenuItem>
                        )}

                        {/* Download PDF (all except estimate_sent) */}
                        {w.status !== "estimate_sent" && (
                          <DropdownMenuItem onClick={() => handleDownloadPDF()}>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                        )}

                        {/* Destructive */}
                        {(w.status === "Scheduled" || w.status === "Cancelled") && (
                          <DropdownMenuSeparator />
                        )}
                        {w.status === "Scheduled" && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => confirmCancel(w)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel Walkthrough
                          </DropdownMenuItem>
                        )}
                        {w.status === "Cancelled" && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => confirmDelete(w)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      <WalkthroughDetailsModal
        walkthrough={detailWalkthrough}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={() => refetch()}
      />

      {/* Cancel confirmation */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Walkthrough</AlertDialogTitle>
            <AlertDialogDescription>
              This action will change the walkthrough status to Cancelled. You can reschedule it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Walkthrough</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this walkthrough? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR — Share contact card */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm p-6 gap-3">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-center">Share your information with your client</DialogTitle>
            <p className="text-sm text-muted-foreground text-center">
              Ask your client to scan this QR code so they can easily save all of your company's information
            </p>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="p-4 rounded-lg border border-border bg-white">
              <QRCodeSVG value={contactCardUrl} size={180} level="H" includeMargin={true} />
            </div>
            <Button className="w-full h-12 text-base font-semibold" onClick={handleNavigateToForm}>
              Start Walkthrough
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
