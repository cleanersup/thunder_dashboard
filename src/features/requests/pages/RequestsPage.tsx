import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { formatDisplayDateShort } from "@/shared/utils/formatters";
import {
  Copy, Search, Home, Building2, MoreHorizontal,
  ChevronLeft, ChevronRight, FileText, Plus, CalendarIcon,
  Inbox, BarChart2, TrendingUp, FileCheck,
  ArrowRightLeft, Edit, Archive, XCircle, Trash2, RefreshCw,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { RequestDetailPanel } from "../components/RequestDetailPanel";
import { ConvertRequestDialog } from "../components/ConvertRequestDialog";
import { AddRequestPage } from "./AddRequestPage";
import { EditRequestPage } from "./EditRequestPage";
import { AddWalkthroughPage } from "@/features/walkthroughs/pages/AddWalkthroughPage";
import { useRequests, useCancelRequest, useArchiveRequest, useRestoreRequest, useDeleteRequest } from "../hooks/useRequests";
import { useNavigate } from "react-router-dom";
import type { WalkthroughConvertConfig } from "../types/request.types";
import { useProfile } from "@/shared/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/shared/config/queryKeys";
import { toast } from "sonner";
import { cn } from "@/shared/utils/cn";
import type { Booking } from "../types/request.types";

const ITEMS_PER_PAGE = 10;

const getStatusBadge = (status: string) => {
  if (status === "new")       return "bg-orange-500/15 text-orange-700 border-orange-500/30";
  if (status === "converted") return "bg-purple-500/15 text-purple-700 border-purple-500/30";
  if (status === "archived")  return "bg-secondary text-secondary-foreground border-border";
  if (status === "cancelled") return "bg-red-500/15 text-red-700 border-red-500/30";
  return "bg-secondary text-secondary-foreground border-border";
};

const getStatusLabel = (request: Booking): string => {
  if (request.status === "converted" && request.converted_to_type) {
    return `→ ${request.converted_to_type === "walkthrough" ? "Walkthrough" : "Estimate"}`;
  }
  return request.status.charAt(0).toUpperCase() + request.status.slice(1);
};

export function RequestsPage() {
  const qc       = useQueryClient();
  const navigate = useNavigate();
  const { data: requests = [], isLoading } = useRequests();
  const { data: profile } = useProfile();

  // ─── Real-time ────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("bookings_changes_requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        qc.invalidateQueries({ queryKey: QK.requests });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const [statusFilter, setStatusFilter]       = useState("all");
  const [searchQuery, setSearchQuery]         = useState("");
  const [selectedDate, setSelectedDate]       = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage]         = useState(1);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [modalOpen, setModalOpen]                 = useState(false);

  // Derive from live list so the panel auto-updates after edits
  const selectedRequest = selectedRequestId
    ? (requests.find((r) => r.id === selectedRequestId) ?? null)
    : null;
  const [createOpen, setCreateOpen]           = useState(false);

  // ─── Inline row actions ───────────────────────────────────────────────────
  const [actionRequest, setActionRequest]     = useState<Booking | null>(null);
  const [confirmAction, setConfirmAction]     = useState<"cancel" | "archive" | "delete" | null>(null);
  const [editOpen, setEditOpen]                   = useState(false);
  const [convertOpen, setConvertOpen]             = useState(false);
  const [walkthroughOpen, setWalkthroughOpen]     = useState(false);
  const [walkthroughConfig, setWalkthroughConfig] = useState<WalkthroughConvertConfig | null>(null);

  const { mutate: cancelRequest  } = useCancelRequest();
  const { mutate: archiveRequest } = useArchiveRequest();
  const { mutate: restoreRequest } = useRestoreRequest();
  const { mutate: deleteRequest  } = useDeleteRequest();

  const handleConfirm = () => {
    if (!confirmAction || !actionRequest) return;
    if (confirmAction === "cancel")  cancelRequest(actionRequest.id);
    if (confirmAction === "archive") archiveRequest(actionRequest.id);
    if (confirmAction === "delete")  deleteRequest(actionRequest.id);
    setConfirmAction(null);
    setActionRequest(null);
  };

  // ─── KPI counts (current month vs previous month) ────────────────────────
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const prevMonthStart    = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd      = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const currentMonth = requests.filter((r) => {
    const d = new Date(r.created_at);
    return d >= currentMonthStart && d <= currentMonthEnd;
  });
  const prevMonth = requests.filter((r) => {
    const d = new Date(r.created_at);
    return d >= prevMonthStart && d <= prevMonthEnd;
  });

  const totalCurrent     = currentMonth.length;
  const totalPrev        = prevMonth.length;
  const newCurrent       = currentMonth.filter((r) => r.status === "new").length;
  const newPrev          = prevMonth.filter((r) => r.status === "new").length;
  const convertedCurrent = currentMonth.filter((r) => r.status === "converted").length;
  const convertedPrev    = prevMonth.filter((r) => r.status === "converted").length;
  const conversionRate   = totalCurrent > 0 ? Math.round((convertedCurrent / totalCurrent) * 100) : 0;
  const prevConvRate     = totalPrev    > 0 ? Math.round((convertedPrev    / totalPrev)    * 100) : 0;

  function diffLabel(current: number, prev: number) {
    const diff = current - prev;
    if (diff === 0) return <span className="text-muted-foreground text-xs">0 vs last month</span>;
    return (
      <span className={`text-xs font-medium ${diff > 0 ? "text-green-600" : "text-red-500"}`}>
        {diff > 0 ? "+" : ""}{diff} vs last month
      </span>
    );
  }

  const kpiCards = [
    { title: "Total Requests",   value: String(totalCurrent),     subtitle: diffLabel(totalCurrent, totalPrev),         icon: Inbox,      color: "hsl(var(--blue-vibrant))"    },
    { title: "New Requests",     value: String(newCurrent),       subtitle: diffLabel(newCurrent, newPrev),             icon: BarChart2,  color: "hsl(var(--orange-vibrant))"  },
    { title: "Conversion Rate",  value: `${conversionRate}%`,     subtitle: diffLabel(conversionRate, prevConvRate),    icon: TrendingUp, color: "hsl(var(--green-vibrant))"   },
    { title: "Converted",        value: String(convertedCurrent), subtitle: diffLabel(convertedCurrent, convertedPrev), icon: FileCheck,  color: "hsl(var(--purple-vibrant))"  },
  ];

  // ─── Filtering ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return requests
      .filter((b) => {
        if (statusFilter === "new")       return b.status === "new";
        if (statusFilter === "cancelled") return b.status === "cancelled";
        return true;
      })
      .filter((b) =>
        b.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter((b) => {
        if (!selectedDate) return true;
        const d = parseISO(b.created_at);
        return (
          d.getDate()     === selectedDate.getDate()  &&
          d.getMonth()    === selectedDate.getMonth() &&
          d.getFullYear() === selectedDate.getFullYear()
        );
      });
  }, [requests, statusFilter, searchQuery, selectedDate]);

  // ─── Pagination ──────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleFilterChange = (val: string) => { setStatusFilter(val); setCurrentPage(1); };
  const handleSearch       = (val: string) => { setSearchQuery(val);   setCurrentPage(1); };
  const handleDateChange   = (date: Date | undefined) => { setSelectedDate(date); setCurrentPage(1); };

  // ─── Actions ─────────────────────────────────────────────────────────────
  const handleCopyLink = () => {
    const userId = profile?.user_id;
    if (!userId) return;
    const url = `${window.location.origin}/booking/${userId}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Booking link copied to clipboard"),
      () => toast.error("Could not copy link"),
    );
  };

  const openDetail = (request: Booking) => {
    setSelectedRequestId(request.id);
    setModalOpen(true);
  };

  return (
    <div className="min-h-full bg-background p-2.5 space-y-2.5">

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card) => (
              <div key={card.title} className="border-l-4 pl-4" style={{ borderLeftColor: card.color }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: card.color }}>{card.value}</p>
                    <div className="mt-1">{card.subtitle}</div>
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
          <div className="flex items-center justify-between gap-2 flex-wrap">

            {/* Left: filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-[130px] h-9 bg-white">
                  <SelectValue placeholder="Status: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Status: All</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 h-9 bg-white"
                />
              </div>

              <Popover>
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
                    onSelect={handleDateChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                  {selectedDate && (
                    <div className="p-2 border-t">
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => handleDateChange(undefined)}>
                        Clear date filter
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2">
              <Button className="h-9" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                New Request
              </Button>
              <Button
                className="h-9 bg-success text-success-foreground hover:bg-success/90"
                onClick={handleCopyLink}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy Link
              </Button>

            </div>
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
                <TableHead className="h-10 font-bold">Date</TableHead>
                <TableHead className="h-10 font-bold">Name</TableHead>
                <TableHead className="h-10 font-bold">Type</TableHead>
                <TableHead className="h-10 font-bold">Email</TableHead>
                <TableHead className="h-10 font-bold">Phone</TableHead>
                <TableHead className="h-10 font-bold">Status</TableHead>
                <TableHead className="h-10 font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No requests found
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((request) => (
                  <TableRow
                    key={request.id}
                    className="cursor-pointer hover:bg-muted/50 border-b border-border/50"
                    onClick={() => openDetail(request)}
                  >
                    <TableCell className="py-2 px-4">
                      {formatDisplayDateShort(request.created_at)}
                    </TableCell>
                    <TableCell className="py-2 px-4 font-medium">{request.lead_name}</TableCell>
                    <TableCell className="py-2 px-4">
                      <div className="flex items-center gap-1.5">
                        {request.service_type === "residential"
                          ? <Home className="w-3.5 h-3.5 text-muted-foreground" />
                          : <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        }
                        <span className="capitalize">{request.service_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-4">{request.email}</TableCell>
                    <TableCell className="py-2 px-4">{request.phone}</TableCell>
                    <TableCell className="py-2 px-4">
                      <Badge
                        variant="outline"
                        className={cn("font-medium", getStatusBadge(request.status))}
                      >
                        {getStatusLabel(request)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(request); }}>
                            <FileText className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>

                          {request.status === "new" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActionRequest(request); setConvertOpen(true); }}>
                                <ArrowRightLeft className="w-4 h-4 mr-2" /> Convert Request
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActionRequest(request); setEditOpen(true); }}>
                                <Edit className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActionRequest(request); setConfirmAction("archive"); }}>
                                <Archive className="w-4 h-4 mr-2" /> Archive
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => { e.stopPropagation(); setActionRequest(request); setConfirmAction("cancel"); }}
                              >
                                <XCircle className="w-4 h-4 mr-2" /> Cancel
                              </DropdownMenuItem>
                            </>
                          )}

                          {request.status === "cancelled" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => { e.stopPropagation(); setActionRequest(request); setConfirmAction("delete"); }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}

                          {request.status === "archived" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); restoreRequest(request.id); }}>
                                <RefreshCw className="w-4 h-4 mr-2" /> Reactivate
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <span className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} requests
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium px-2">{currentPage} / {totalPages}</span>
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <RequestDetailPanel
        booking={selectedRequest}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedRequestId(null); }}
      />

      <AddRequestPage
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <EditRequestPage
        bookingId={actionRequest?.id ?? null}
        open={editOpen}
        onClose={() => { setEditOpen(false); setActionRequest(null); }}
      />

      <ConvertRequestDialog
        request={actionRequest}
        open={convertOpen}
        onOpenChange={(v) => { setConvertOpen(v); if (!v) setActionRequest(null); }}
        onEstimateConvert={(route, state) => { setActionRequest(null); navigate(route, { state }); }}
        onWalkthroughConvert={(config) => { setWalkthroughConfig(config); setWalkthroughOpen(true); setActionRequest(null); }}
      />

      <AddWalkthroughPage
        open={walkthroughOpen}
        onClose={() => { setWalkthroughOpen(false); setWalkthroughConfig(null); }}
        fromRequestId={walkthroughConfig?.fromRequestId}
        walkthroughEditId={walkthroughConfig?.walkthroughEditId}
        prefillContactType={walkthroughConfig?.prefillContactType}
        prefillContactId={walkthroughConfig?.prefillContactId}
        prefillServiceType={walkthroughConfig?.prefillServiceType}
        prefillDate={walkthroughConfig?.prefillDate}
        prefillTime={walkthroughConfig?.prefillTime}
        prefillNotes={walkthroughConfig?.prefillNotes}
        prefillPropertyId={walkthroughConfig?.prefillPropertyId}
      />

      {/* Confirm dialogs */}
      <AlertDialog open={confirmAction === "cancel"} onOpenChange={(v) => { if (!v) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Request?</AlertDialogTitle>
            <AlertDialogDescription>The request will remain visible with a Cancelled status.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleConfirm}>Yes, cancel</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction === "archive"} onOpenChange={(v) => { if (!v) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Request?</AlertDialogTitle>
            <AlertDialogDescription>The request will be archived. You can reactivate it later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction === "delete"} onOpenChange={(v) => { if (!v) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleConfirm}>Delete permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
