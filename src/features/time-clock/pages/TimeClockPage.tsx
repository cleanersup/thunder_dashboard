import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  CalendarIcon, Search,
  MoreHorizontal, Eye, Pencil, CheckCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { QK } from "@/shared/config/queryKeys";
import { useTimeEntriesToday, useTimeEntriesScheduled, useTimeEntriesAll } from "../hooks/useTimeClock";
import { useShiftTimeEdit } from "../hooks/useShiftTimeEdit";
import { TimeClockKPICards } from "../components/TimeClockKPICards";
import { ShiftTimeEditConfirmModal } from "../components/ShiftTimeEditConfirmModal";
import { EmployeeDetailView } from "../components/EmployeeDetailView";
import type { TimeEntry } from "../types/timeClock.types";
import { formatDbTimeDisplay, formatEntryDateDisplay } from "../utils/parseDbDateTime";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function fmtTime(ts: string | null) {
  return formatDbTimeDisplay(ts, "h:mm a");
}

function fmtHours(h: number | null) {
  if (!h) return "—";
  return `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`;
}

function getStatusBadge(entry: TimeEntry) {
  if (entry.clock_in_time && !entry.clock_out_time) {
    if (entry.route_appointments?.end_time) {
      const now = new Date();
      const end = new Date();
      const [hh, mm] = entry.route_appointments.end_time.split(":").map(Number);
      end.setHours(hh, mm, 0, 0);
      if (now > end) return { label: "Overtime", className: "bg-red-500/20 text-red-700 dark:text-red-400 border-0" };
    }
    return { label: "Active", className: "bg-green-500/20 text-green-700 dark:text-green-400 border-0" };
  }
  if (entry.break_start_time && !entry.break_end_time)
    return { label: "On Break", className: "bg-pink-500/20 text-pink-700 dark:text-pink-400 border-0" };
  if (entry.clock_in_time && entry.clock_out_time)
    return { label: "Completed", className: "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-0" };
  return { label: "Scheduled", className: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-0" };
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type TabKey = "today" | "scheduled" | "timesheets";

const TABS: { key: TabKey; label: string }[] = [
  { key: "today",      label: "Today"      },
  { key: "scheduled",  label: "Scheduled"  },
  { key: "timesheets", label: "Timesheets" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function TimeClockPage() {
  const [activeTab,        setActiveTab]        = useState<TabKey>("today");
  const [search,           setSearch]           = useState("");
  const [selectedDate,     setSelectedDate]     = useState<Date>(new Date());
  const [datePickerOpen,   setDatePickerOpen]   = useState(false);
  const [timesheetsFrom,   setTimesheetsFrom]   = useState<Date>(new Date());
  const [timesheetsTo,     setTimesheetsTo]     = useState<Date>(new Date());
  const [tsFromOpen,       setTsFromOpen]       = useState(false);
  const [tsToOpen,         setTsToOpen]         = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<TimeEntry | null>(null);
  const [detailFrom,       setDetailFrom]       = useState<Date>(new Date());
  const [detailTo,         setDetailTo]         = useState<Date>(new Date());

  const queryClient = useQueryClient();

  const todayStr = format(selectedDate,  "yyyy-MM-dd");
  const tsFrom   = format(timesheetsFrom, "yyyy-MM-dd");
  const tsTo     = format(timesheetsTo,   "yyyy-MM-dd");

  const { data: todayEntries     = [], isLoading: todayLoading }     = useTimeEntriesToday(todayStr);
  const { data: scheduledEntries = [], isLoading: scheduledLoading } = useTimeEntriesScheduled();
  const { data: allEntries       = [], isLoading: allLoading }       = useTimeEntriesAll(tsFrom, tsTo);

  // When selecting employee from Today tab, set detail date to today
  useEffect(() => {
    if (selectedEmployee && activeTab === "today") {
      const now = new Date();
      setDetailFrom(now);
      setDetailTo(now);
    }
  }, [selectedEmployee, activeTab]);

  // Shift edit — invalidate all time-entry queries on success
  const shiftEdit = useShiftTimeEdit(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QK.timeEntriesToday(todayStr) }),
      queryClient.invalidateQueries({ queryKey: QK.timeEntriesAll(tsFrom, tsTo) }),
      queryClient.invalidateQueries({ queryKey: QK.timeEntriesScheduled }),
    ]);
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("time_entries_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "time_entries" }, () => {
        queryClient.invalidateQueries({ queryKey: QK.timeEntriesToday(todayStr) });
        queryClient.invalidateQueries({ queryKey: QK.timeEntriesScheduled });
        queryClient.invalidateQueries({ queryKey: QK.timeEntriesAll(tsFrom, tsTo) });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, todayStr, tsFrom, tsTo]);

  // ── Filtered entries per tab ────────────────────────────────────────────────

  const filteredToday = useMemo(() => {
    if (!search.trim()) return todayEntries;
    const q = search.toLowerCase();
    return todayEntries.filter((e) => {
      const name = `${e.employees?.first_name ?? ""} ${e.employees?.last_name ?? ""}`.toLowerCase();
      return name.includes(q) || (e.employees?.position ?? "").toLowerCase().includes(q);
    });
  }, [todayEntries, search]);

  const filteredScheduled = useMemo(() => {
    if (!search.trim()) return scheduledEntries;
    const q = search.toLowerCase();
    return scheduledEntries.filter((e) => {
      const name = `${e.employees?.first_name ?? ""} ${e.employees?.last_name ?? ""}`.toLowerCase();
      return name.includes(q);
    });
  }, [scheduledEntries, search]);

  // Aggregate timesheets per employee
  const timesheetRows = useMemo(() => {
    const map = new Map<string, { entry: TimeEntry; hours: number; pay: number }>();
    for (const e of allEntries) {
      const existing = map.get(e.employee_id);
      const hrs = e.total_hours ?? 0;
      const pay = hrs * (e.employees?.hourly_rate ?? 0);
      if (existing) { existing.hours += hrs; existing.pay += pay; }
      else map.set(e.employee_id, { entry: e, hours: hrs, pay });
    }
    const rows = [...map.values()];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(({ entry }) => {
      const name = `${entry.employees?.first_name ?? ""} ${entry.employees?.last_name ?? ""}`.toLowerCase();
      return name.includes(q) || (entry.employees?.position ?? "").toLowerCase().includes(q);
    });
  }, [allEntries, search]);

  function openDetail(entry: TimeEntry) {
    setSelectedEmployee(entry);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-background p-2.5 space-y-2.5">

      {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
      <TimeClockKPICards entries={todayEntries} />

      {/* ── Employee Detail Overlay ───────────────────────────────────────────── */}
      {selectedEmployee ? (
        <EmployeeDetailView
          employee={selectedEmployee}
          onBack={() => setSelectedEmployee(null)}
          detailDateFrom={detailFrom}
          detailDateTo={detailTo}
          onDateFromChange={setDetailFrom}
          onDateToChange={setDetailTo}
          shiftEdit={shiftEdit}
          queryClient={queryClient}
        />
      ) : (
        <>
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-0">

            {/* ── Toolbar ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4 px-4 pt-1 pb-0">
              {/* Tab links */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
                <TabsList>
                  {TABS.map(({ key, label }) => (
                    <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {/* Right controls */}
              <div className="flex items-center gap-2 pb-2 pt-2">
                <div className="relative w-52">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    className="pl-9 h-9 bg-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* Today tab: single date picker */}
                {activeTab === "today" && (
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        {format(selectedDate, "MMM d")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(d) => { if (d) { setSelectedDate(d); setDatePickerOpen(false); } }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {/* Timesheets tab: from/to date range */}
                {activeTab === "timesheets" && (
                  <div className="flex items-center gap-1.5">
                    <Popover open={tsFromOpen} onOpenChange={setTsFromOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          {format(timesheetsFrom, "MMM d")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={timesheetsFrom}
                          onSelect={(d) => { if (d) { setTimesheetsFrom(d); setTsFromOpen(false); } }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="text-xs text-muted-foreground">—</span>
                    <Popover open={tsToOpen} onOpenChange={setTsToOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          {format(timesheetsTo, "MMM d")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={timesheetsTo}
                          onSelect={(d) => { if (d) { setTimesheetsTo(d); setTsToOpen(false); } }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>

          </CardContent>
        </Card>

        {/* ── Table Card ───────────────────────────────────────────────────────── */}
        <Card className="border border-border/50 shadow-none overflow-hidden">

            {/* ── Today Table ──────────────────────────────────────────────── */}
            {activeTab === "today" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Employee</TableHead>
                    <TableHead className="font-bold">Position</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Clock In</TableHead>
                    <TableHead className="font-bold">Clock Out</TableHead>
                    <TableHead className="font-bold">Hours</TableHead>
                    <TableHead className="font-bold">Pay</TableHead>
                    <TableHead className="font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayLoading ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="flex justify-center py-8">
                          <LoadingSpinner />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredToday.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No time entries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredToday.map((entry) => {
                      const emp    = entry.employees;
                      const status = getStatusBadge(entry);
                      const pay    = (entry.total_hours ?? 0) * (emp?.hourly_rate ?? 0);
                      return (
                        <TableRow
                          key={entry.id}
                          className="cursor-pointer hover:bg-accent/30"
                          onClick={() => openDetail(entry)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                {emp?.avatar_url && <AvatarFallback>{getInitials(emp.first_name, emp.last_name)}</AvatarFallback>}
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(emp?.first_name ?? "", emp?.last_name ?? "")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">
                                {emp?.first_name} {emp?.last_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{emp?.position ?? "—"}</TableCell>
                          <TableCell>
                            <Badge className={status.className}>{status.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{fmtTime(entry.clock_in_time)}</TableCell>
                          <TableCell className="text-sm">{fmtTime(entry.clock_out_time)}</TableCell>
                          <TableCell className="text-sm">{fmtHours(entry.total_hours)}</TableCell>
                          <TableCell className="text-sm">${pay.toFixed(2)}</TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDetail(entry)}>
                                  <Eye className="w-4 h-4 mr-2" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => { openDetail(entry); shiftEdit.startEdit(entry); }}
                                >
                                  <Pencil className="w-4 h-4 mr-2" /> Edit Times
                                </DropdownMenuItem>
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

            {/* ── Scheduled Table ──────────────────────────────────────────── */}
            {activeTab === "scheduled" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Employee</TableHead>
                    <TableHead className="font-bold">Position</TableHead>
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="font-bold">Scheduled Time</TableHead>
                    <TableHead className="font-bold">Client</TableHead>
                    <TableHead className="font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledLoading ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="flex justify-center py-8">
                          <LoadingSpinner />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredScheduled.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No scheduled entries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredScheduled.map((entry) => {
                      const emp  = entry.employees;
                      const appt = entry.route_appointments;
                      return (
                        <TableRow key={entry.id} className="cursor-pointer hover:bg-accent/30" onClick={() => openDetail(entry)}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(emp?.first_name ?? "", emp?.last_name ?? "")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">
                                {emp?.first_name} {emp?.last_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{emp?.position ?? "—"}</TableCell>
                          <TableCell className="text-sm">
                            {formatEntryDateDisplay(entry.date, "EEE, MMM d")}
                          </TableCell>
                          <TableCell className="text-sm">
                            {appt?.scheduled_time ? fmtTime(appt.scheduled_time) : "—"}
                            {appt?.end_time ? ` – ${fmtTime(appt.end_time)}` : ""}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {appt?.clients?.full_name ?? "—"}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDetail(entry)}>
                                  <Eye className="w-4 h-4 mr-2" /> View Details
                                </DropdownMenuItem>
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

            {/* ── Timesheets Table ─────────────────────────────────────────── */}
            {activeTab === "timesheets" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Employee</TableHead>
                    <TableHead className="font-bold">Position</TableHead>
                    <TableHead className="font-bold">Total Hours</TableHead>
                    <TableHead className="font-bold">Total Pay</TableHead>
                    <TableHead className="font-bold">Rate/hr</TableHead>
                    <TableHead className="font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allLoading ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="flex justify-center py-8">
                          <LoadingSpinner />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : timesheetRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No time entries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    timesheetRows.map(({ entry, hours, pay }) => {
                      const emp = entry.employees;
                      return (
                        <TableRow
                          key={entry.employee_id}
                          className="cursor-pointer hover:bg-accent/30"
                          onClick={() => { setDetailFrom(timesheetsFrom); setDetailTo(timesheetsTo); openDetail(entry); }}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                {emp?.avatar_url && (
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {getInitials(emp.first_name, emp.last_name)}
                                  </AvatarFallback>
                                )}
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(emp?.first_name ?? "", emp?.last_name ?? "")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">
                                {emp?.first_name} {emp?.last_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{emp?.position ?? "—"}</TableCell>
                          <TableCell className="text-sm font-medium">{fmtHours(hours)}</TableCell>
                          <TableCell className="text-sm font-semibold">${pay.toFixed(2)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {emp?.hourly_rate ? `$${emp.hourly_rate.toFixed(2)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setDetailFrom(timesheetsFrom); setDetailTo(timesheetsTo); openDetail(entry); }}>
                                  <Eye className="w-4 h-4 mr-2" /> View Timesheet
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setDetailFrom(timesheetsFrom); setDetailTo(timesheetsTo); openDetail(entry); }}>
                                  <CheckCircle className="w-4 h-4 mr-2" /> Mark as Paid
                                </DropdownMenuItem>
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

        </Card>
        </>
      )}

      {/* ── Shift Edit Confirm Modal ──────────────────────────────────────────── */}
      <ShiftTimeEditConfirmModal
        open={shiftEdit.isEditConfirmOpen}
        onOpenChange={shiftEdit.setIsEditConfirmOpen}
        changes={shiftEdit.pendingEditChanges}
        onConfirm={shiftEdit.confirmSave}
        isSaving={shiftEdit.isConfirmingSave}
      />
    </div>
  );
}
