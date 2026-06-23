import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/shared/config/queryKeys";
import { formatDisplayDateShort } from "@/shared/utils/formatters";
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
import { QRCodeSVG } from "qrcode.react";
import { useWalkthroughs, useUpdateWalkthroughStatus, useDeleteWalkthrough, useSendWalkthroughStart } from "../hooks/useWalkthroughs";
import { WalkthroughDetailsPanel } from "../components/WalkthroughDetailsPanel";
import { AddWalkthroughPage } from "./AddWalkthroughPage";
import {
  createEstimateDraftFromWalkthrough,
  fetchWalkthroughPdfContext,
  type WalkthroughWithContact,
} from "../services/walkthroughsService";
import { buildWalkthroughPdfData } from "../utils/walkthroughPdfData";
import { downloadWalkthroughPdf } from "../services/generateWalkthroughPDF";
import { cn } from "@/shared/utils/cn";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/shared/hooks/useAuth";
import { useProfile } from "@/shared/hooks/useProfile";

// ─── KPI config ───────────────────────────────────────────────────────────────

const KPI_CONFIG = [
  {
    key:         "pending",
    title:       "Pending",
    subtitle:    "Awaiting completion",
    icon:        Clock,
    color:       "hsl(var(--orange-vibrant))",
    statuses:    ["Scheduled", "Pending"],
  },
  {
    key:         "completed",
    title:       "Completed",
    subtitle:    "Ready to estimate",
    icon:        CheckCircle,
    color:       "hsl(var(--green-vibrant))",
    statuses:    ["Completed"],
  },
  {
    key:         "estimate_sent",
    title:       "Estimate Sent",
    subtitle:    "Estimates delivered",
    icon:        CheckCircle2,
    color:       "hsl(var(--purple-vibrant))",
    statuses:    ["estimate_sent"],
  },
  {
    key:         "cancelled",
    title:       "Cancelled",
    subtitle:    "Not proceeding",
    icon:        XCircle,
    color:       "hsl(var(--destructive))",
    statuses:    ["Cancelled"],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function WalkthroughsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  const { data: walkthroughs = [], isLoading, refetch } = useWalkthroughs();

  // Auto-open detail panel when navigated here with a specific walkthrough ID
  const autoOpenId = (location.state as Record<string, unknown>)?.openId as string | undefined;
  useEffect(() => {
    if (!autoOpenId || isLoading) return;
    // Clear the state first so this effect doesn't re-fire
    navigate(location.pathname, { replace: true, state: {} });
    const found = walkthroughs.find((w) => w.id === autoOpenId);
    if (found) {
      setDetailId(autoOpenId);
      setDetailOpen(true);
    } else {
      toast.error("The linked walkthrough was deleted");
    }
  }, [autoOpenId, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps
  const { mutate: updateStatus } = useUpdateWalkthroughStatus();
  const { mutate: deleteMutate } = useDeleteWalkthrough();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { mutateAsync: sendWalkthroughStart, isPending: isStarting } = useSendWalkthroughStart();

  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [detailId, setDetailId]   = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Derive from live list so the panel auto-updates after edits
  const detailWalkthrough = detailId
    ? (walkthroughs.find((w) => w.id === detailId) ?? null)
    : null;
  const [deleteTarget, setDeleteTarget] = useState<WalkthroughWithContact | null>(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [cancelTarget, setCancelTarget] = useState<WalkthroughWithContact | null>(null);
  const [cancelOpen, setCancelOpen]     = useState(false);
  const [qrOpen, setQrOpen]               = useState(false);
  const [qrTarget, setQrTarget]           = useState<WalkthroughWithContact | null>(null);
  const [walkthroughModalOpen, setWalkthroughModalOpen] = useState(false);
  const [walkthroughEditId,    setWalkthroughEditId]    = useState<string | undefined>(undefined);

  function openCreate() { setWalkthroughEditId(undefined); setWalkthroughModalOpen(true); }
  function openEdit(id: string) { setWalkthroughEditId(id); setWalkthroughModalOpen(true); }
  function closeWalkthroughModal() { setWalkthroughModalOpen(false); setWalkthroughEditId(undefined); refetch(); }
  const [scheduleTarget, setScheduleTarget] = useState<WalkthroughWithContact | null>(null);
  const [scheduleOpen, setScheduleOpen]     = useState(false);
  const [completeTarget, setCompleteTarget] = useState<WalkthroughWithContact | null>(null);
  const [completeOpen, setCompleteOpen]     = useState(false);

  const contactCardUrl = `${import.meta.env.VITE_PUBLIC_APP_URL ?? window.location.origin}/contact-card/${user?.id ?? ""}`;

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
    setDetailId(w.id);
    setDetailOpen(true);
  }

  async function handleStartWalkthrough(w: WalkthroughWithContact) {
    setQrTarget(w);
    try {
      await sendWalkthroughStart(w.id);
      setQrOpen(true);
    } catch {
      toast.error("Failed to send walkthrough notification");
      setQrTarget(null);
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

  async function handleGenerateEstimate(w: WalkthroughWithContact) {
    try {
      const { estimateId, route } = await createEstimateDraftFromWalkthrough(w);
      qc.invalidateQueries({ queryKey: QK.walkthroughs });
      qc.invalidateQueries({ queryKey: QK.estimates });
      navigate(route, { state: { isEditing: true, estimateId } });
    } catch {
      toast.error("Could not generate estimate from walkthrough");
    }
  }

  async function handleDownloadPDF(w: WalkthroughWithContact) {
    if (!profile) {
      toast.error("Loading profile… try again in a moment.");
      return;
    }
    try {
      const ctx = await fetchWalkthroughPdfContext(w.id);
      const pdfData = buildWalkthroughPdfData(
        profile,
        ctx.walkthrough,
        ctx.contact,
        ctx.residential,
        ctx.commercial,
        ctx.employees,
      );
      await downloadWalkthroughPdf(pdfData);
      toast.success("PDF downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Could not generate PDF");
    }
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

  function handleSchedule() {
    if (!scheduleTarget) return;
    updateStatus(
      { id: scheduleTarget.id, status: "Scheduled" },
      {
        onSuccess: () => {
          toast.success("Walkthrough scheduled");
          setScheduleOpen(false);
          setScheduleTarget(null);
          refetch();
        },
      }
    );
  }

  function handleMarkComplete() {
    if (!completeTarget) return;
    updateStatus(
      { id: completeTarget.id, status: "Completed" },
      {
        onSuccess: () => {
          toast.success("Walkthrough marked as completed");
          setCompleteOpen(false);
          setCompleteTarget(null);
          refetch();
        },
      }
    );
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
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Left: filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-sm bg-white">
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

              <div className="relative w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search client..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 bg-white"
                />
              </div>

              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("h-9 whitespace-nowrap", !selectedDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? formatDisplayDateShort(selectedDate) : "Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setCalendarOpen(false); }}
                    initialFocus
                  />
                  {selectedDate && (
                    <div className="p-2 border-t">
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => setSelectedDate(undefined)}>
                        Clear date filter
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Right: New */}
            <Button className="h-9" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
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
              <TableHead className="font-bold text-right">Actions</TableHead>
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
                  className="cursor-pointer hover:bg-muted/50 border-b border-border/50"
                  onClick={() => openDetail(w)}
                >
                  <TableCell className="py-2 px-4 font-medium">{w.contact_name}</TableCell>
                  <TableCell className="py-2 px-4 capitalize">{w.service_type}</TableCell>
                  <TableCell className="py-2 px-4">{formatDate(w.scheduled_date)}</TableCell>
                  <TableCell className="py-2 px-4">{formatTime(w.scheduled_time)}</TableCell>
                  <TableCell className="py-2 px-4">
                    <Badge variant="outline" className={cn("font-medium text-[13px]", statusBadgeClass(w.status))}>
                      {formatStatusLabel(w.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => openDetail(w)}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>

                        {/* Draft */}
                        {w.status === "Draft" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEdit(w.id)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setScheduleTarget(w); setScheduleOpen(true); }}>
                              <CalendarClock className="mr-2 h-4 w-4" /> Schedule
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => confirmCancel(w)}>
                              <XCircle className="mr-2 h-4 w-4" /> Cancel
                            </DropdownMenuItem>
                          </>
                        )}

                        {/* Scheduled */}
                        {w.status === "Scheduled" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEdit(w.id)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-green-600 focus:text-green-600"
                              disabled={isStarting && qrTarget?.id === w.id}
                              onClick={() => handleStartWalkthrough(w)}
                            >
                              {isStarting && qrTarget?.id === w.id
                                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                : <Play className="mr-2 h-4 w-4" />}
                              Start Walkthrough
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleDownloadPDF(w)}>
                              <Download className="mr-2 h-4 w-4" /> Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => confirmCancel(w)}>
                              <XCircle className="mr-2 h-4 w-4" /> Cancel
                            </DropdownMenuItem>
                          </>
                        )}

                        {/* Pending / Started */}
                        {(w.status === "Pending" || w.status === "Started") && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEdit(w.id)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setCompleteTarget(w); setCompleteOpen(true); }}>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleDownloadPDF(w)}>
                              <Download className="mr-2 h-4 w-4" /> Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => confirmCancel(w)}>
                              <XCircle className="mr-2 h-4 w-4" /> Cancel
                            </DropdownMenuItem>
                          </>
                        )}

                        {/* Completed */}
                        {w.status === "Completed" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleGenerateEstimate(w)}>
                              <FileCheck className="mr-2 h-4 w-4" /> Generate Estimate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(w.id)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleDownloadPDF(w)}>
                              <Download className="mr-2 h-4 w-4" /> Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => confirmCancel(w)}>
                              <XCircle className="mr-2 h-4 w-4" /> Cancel
                            </DropdownMenuItem>
                          </>
                        )}

                        {/* Cancelled */}
                        {w.status === "Cancelled" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEdit(w.id)}>
                              <CalendarClock className="mr-2 h-4 w-4" /> Reschedule
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleDownloadPDF(w)}>
                              <Download className="mr-2 h-4 w-4" /> Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => confirmDelete(w)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}

                        {/* estimate_sent / Converted */}
                        {(w.status === "estimate_sent" || w.status === "Converted") && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => void handleDownloadPDF(w)}>
                              <Download className="mr-2 h-4 w-4" /> Download PDF
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
      </Card>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      <WalkthroughDetailsPanel
        walkthrough={detailWalkthrough}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailId(null); }}
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

      {/* Schedule confirmation */}
      <AlertDialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Schedule Walkthrough?</AlertDialogTitle>
            <AlertDialogDescription>
              This will confirm the walkthrough and notify the client.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleSchedule}>Yes, Schedule</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark Complete confirmation */}
      <AlertDialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Completed?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure the walkthrough has been completed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkComplete}>Yes, Completed</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create / Edit walkthrough modal — key forces remount on ID change */}
      <AddWalkthroughPage
        key={walkthroughEditId ?? "create"}
        open={walkthroughModalOpen}
        onClose={closeWalkthroughModal}
        walkthroughEditId={walkthroughEditId}
      />

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
