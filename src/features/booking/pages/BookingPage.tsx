import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  Copy, Edit, Search, CheckCircle2, Home, Building2,
  Info, Globe, Share2, Linkedin, Monitor, MoreHorizontal,
  ChevronLeft, ChevronRight, FileText,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { BookingDetailModal } from "../components/BookingDetailModal";
import { useBookings } from "../hooks/useBookings";
import { useProfile } from "@/shared/hooks/useProfile";
import { toast } from "sonner";
import { cn } from "@/shared/utils/cn";
import type { Booking } from "../types/booking.types";

const ITEMS_PER_PAGE = 10;

const getStatusBadge = (status: string) => {
  if (status === "new")       return "bg-success-subtle text-success-subtle-foreground border-success-subtle-border";
  if (status === "cancelled") return "bg-destructive/10 text-destructive border-destructive/30";
  return "bg-muted text-muted-foreground border-border";
};

export function BookingPage() {
  const navigate = useNavigate();
  const { data: bookings = [], isLoading } = useBookings();
  const { data: profile } = useProfile();

  const [statusFilter, setStatusFilter]       = useState("all");
  const [searchQuery, setSearchQuery]         = useState("");
  const [selectedDate, setSelectedDate]       = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage]         = useState(1);
  const [showInfoDialog, setShowInfoDialog]   = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [modalOpen, setModalOpen]             = useState(false);

  // ─── KPI counts ──────────────────────────────────────────────────────────
  const totalCount        = bookings.length;
  const newCount          = bookings.filter((b) => b.status === "new").length;
  const residentialCount  = bookings.filter((b) => b.service_type === "residential").length;
  const commercialCount   = bookings.filter((b) => b.service_type === "commercial").length;

  const kpiCards = [
    { title: "Total Bookings",  value: totalCount,       subtitle: "All time",         icon: FileText,     color: "hsl(var(--primary))"         },
    { title: "New Bookings",    value: newCount,         subtitle: "Awaiting action",  icon: CheckCircle2, color: "hsl(var(--green-vibrant))"   },
    { title: "Residential",     value: residentialCount, subtitle: "Service type",     icon: Home,         color: "hsl(var(--blue-vibrant))"    },
    { title: "Commercial",      value: commercialCount,  subtitle: "Service type",     icon: Building2,    color: "hsl(var(--orange-vibrant))"  },
  ];

  // ─── Filtering ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return bookings
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
  }, [bookings, statusFilter, searchQuery, selectedDate]);

  // ─── Pagination ──────────────────────────────────────────────────────────
  const totalPages     = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated      = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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

  const openDetail = (booking: Booking) => {
    setSelectedBooking(booking);
    setModalOpen(true);
  };

  return (
    <div className="min-h-full bg-background p-2.5">

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none mb-2.5">
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
      <Card className="border border-border/50 shadow-none mb-2.5">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">

            {/* Left: actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" className="flex items-center gap-2 h-9 px-3" onClick={() => navigate("/booking/edit")}>
                <Edit className="w-4 h-4" />
                <span className="text-sm font-medium">Edit Form</span>
              </Button>
              <Button
                className="flex items-center gap-2 h-9 px-3 bg-success text-success-foreground hover:bg-success/90"
                onClick={handleCopyLink}
              >
                <Copy className="w-4 h-4" />
                <span className="text-sm font-medium">Copy Link</span>
              </Button>

              {/* Info dialog */}
              <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Info className="h-4 w-4 text-destructive" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold">Booking Link Information</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h3 className="font-semibold text-base mb-2">What is the booking link?</h3>
                      <p className="text-muted-foreground">
                        The booking link is a powerful tool for attracting new clients to your business.
                        It works through a simple online form that potential clients fill out when requesting
                        residential or commercial services. The form is fully customizable.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-base mb-3">How to use the booking link?</h3>
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium mb-1 flex items-center gap-2">
                            <Globe className="w-4 h-4 text-primary" /> Google Business:
                          </h4>
                          <p className="text-muted-foreground">
                            Copy and paste your booking link into the section where Google requests a booking URL.
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1 flex items-center gap-2">
                            <Share2 className="w-4 h-4 text-primary" /> Social Media (Facebook/Instagram):
                          </h4>
                          <p className="text-muted-foreground">
                            Share the link in your posts so interested users can fill out the form.
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1 flex items-center gap-2">
                            <Linkedin className="w-4 h-4 text-primary" /> LinkedIn:
                          </h4>
                          <p className="text-muted-foreground">
                            Use the link on your company profile or direct messages to potential clients.
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1 flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-primary" /> Website:
                          </h4>
                          <p className="text-muted-foreground">
                            Add the link directly to your website so visitors can book without searching for contact options.
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-muted-foreground">
                      With the booking link, every click becomes an opportunity to acquire a new client.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Right: filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-[130px] h-9 bg-white">
                  <SelectValue placeholder="Status: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Status: All</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search booking..."
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
                    <Search className="mr-2 h-4 w-4 hidden" />
                    {selectedDate ? format(selectedDate, "MMM d") : "Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Active date filter indicator ───────────────────────────────── */}
      {selectedDate && (
        <div className="flex items-center justify-between bg-accent/50 p-2 rounded-md mb-2.5">
          <span className="text-sm text-muted-foreground">
            Filtered by: {format(selectedDate, "PPP")}
          </span>
          <Button variant="ghost" size="sm" onClick={() => handleDateChange(undefined)} className="h-6 px-2 text-xs">
            Clear
          </Button>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        {isLoading ? (
          <LoadingSpinner centered />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-10 font-bold">Date</TableHead>
                <TableHead className="h-10 font-bold">Lead Name</TableHead>
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
                    No bookings found
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((booking) => (
                  <TableRow
                    key={booking.id}
                    className="cursor-pointer hover:bg-muted/50 border-b border-border/50"
                    onClick={() => openDetail(booking)}
                  >
                    <TableCell className="py-2 px-4">
                      {format(parseISO(booking.created_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="py-2 px-4 font-medium">{booking.lead_name}</TableCell>
                    <TableCell className="py-2 px-4">
                      <div className="flex items-center gap-1.5">
                        {booking.service_type === "residential"
                          ? <Home className="w-3.5 h-3.5 text-muted-foreground" />
                          : <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        }
                        <span className="capitalize">{booking.service_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-4">{booking.email}</TableCell>
                    <TableCell className="py-2 px-4">{booking.phone}</TableCell>
                    <TableCell className="py-2 px-4">
                      <Badge
                        variant="outline"
                        className={cn("font-medium capitalize", getStatusBadge(booking.status))}
                      >
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(booking); }}>
                            <FileText className="w-4 h-4 mr-2" />
                            View Details
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <span className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} bookings
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

      <BookingDetailModal
        booking={selectedBooking}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedBooking(null); }}
      />
    </div>
  );
}
