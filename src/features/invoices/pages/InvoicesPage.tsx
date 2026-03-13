/**
 * @module InvoicesPage
 * Main invoices listing page with KPI cards, table, search, and filters.
 * Adapted from thunder-web-version/src/pages/Invoices.tsx.
 */
import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Plus, FileEdit, XCircle, ChevronLeft, ChevronRight, Search,
  Calendar as CalendarIcon, CheckCircle, Clock, MoreHorizontal,
  Eye, Mail, Download, Edit, Share,
} from "lucide-react";
import { Card, CardContent }         from "@/shared/components/ui/card";
import { Button }                     from "@/shared/components/ui/button";
import { Input }                      from "@/shared/components/ui/input";
import { Badge }                      from "@/shared/components/ui/badge";
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
import { Calendar }  from "@/shared/components/ui/calendar";
import { cn }        from "@/shared/utils/cn";
import { toast }     from "sonner";
import { formatCurrency, formatDateOnly, parseDateOnly } from "@/shared/utils/formatters";
import { useProfile }     from "@/shared/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";
import { useInvoices, useMarkInvoiceAsPaid, useCancelInvoice } from "../hooks/useInvoices";
import { QK } from "@/shared/config/queryKeys";
import { supabase } from "@/integrations/supabase/client";
import { useSendInvoiceEmail } from "../hooks/useSendInvoiceEmail";
import { generateInvoicePDF }  from "../services/generateInvoicePDF";
import { InvoiceDetailsModal } from "../components/InvoiceDetailsModal";
import { CreateInvoicePage }   from "./CreateInvoicePage";
import type { Invoice, InvoiceStatus, LineItem } from "../types/invoice.types";
import { calculateInvoiceTotals } from "../utils/invoiceCalculations";

// ─── Status badge helpers ─────────────────────────────────────────────────────

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  Paid:      "bg-green-100 text-green-700 border-green-200",
  Pending:   "bg-orange-100 text-orange-700 border-orange-200",
  Draft:     "bg-blue-100 text-blue-700 border-blue-200",
  Cancelled: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_BORDER: Record<InvoiceStatus, string> = {
  Pending:   "hsl(var(--orange-vibrant))",
  Paid:      "hsl(var(--green-vibrant))",
  Draft:     "hsl(var(--blue-vibrant))",
  Cancelled: "hsl(var(--destructive))",
};

const ITEMS_PER_PAGE = 10;

// ─── Component ────────────────────────────────────────────────────────────────

export function InvoicesPage() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { sendInvoiceEmail, isSending } = useSendInvoiceEmail();
  const markPaid  = useMarkInvoiceAsPaid();
  const cancelInv = useCancelInvoice();

  // ── Real-time: refetch list when invoices change (viewed_at, status, etc.) ───
  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      ch = supabase
        .channel("invoices-list-realtime")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "invoices", filter: `user_id=eq.${user.id}` },
          () => queryClient.invalidateQueries({ queryKey: QK.invoices }))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "invoices", filter: `user_id=eq.${user.id}` },
          () => queryClient.invalidateQueries({ queryKey: QK.invoices }))
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "invoices", filter: `user_id=eq.${user.id}` },
          () => queryClient.invalidateQueries({ queryKey: QK.invoices }))
        .subscribe();
    });
    return () => { ch && supabase.removeChannel(ch); };
  }, [queryClient]);

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | InvoiceStatus>("All");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [currentPage,  setCurrentPage]  = useState(1);

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [detailId,       setDetailId]       = useState<string | null>(null);
  const [isDetailOpen,   setIsDetailOpen]   = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editInvoiceId,  setEditInvoiceId]  = useState<string | undefined>(undefined);
  const [showEditModal,  setShowEditModal]  = useState(false);

  // ── Quick action state (from row dropdown, not modal) ────────────────────────
  const [actionInvoice,         setActionInvoice]         = useState<Invoice | null>(null);
  const [isPaymentDialogOpen,   setIsPaymentDialogOpen]   = useState(false);
  const [isCancelDialogOpen,    setIsCancelDialogOpen]    = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"Cash" | "Cheque" | null>(null);
  const [showChequeInput,       setShowChequeInput]       = useState(false);
  const [chequeNumber,          setChequeNumber]          = useState("");

  // ── Data ─────────────────────────────────────────────────────────────────────
  const { data: allInvoices = [], isLoading } = useInvoices();

  const paid      = allInvoices.filter((i) => i.status === "Paid");
  const pending   = allInvoices.filter((i) => i.status === "Pending");
  const drafts    = allInvoices.filter((i) => i.status === "Draft");
  const cancelled = allInvoices.filter((i) => i.status === "Cancelled");

  const paidTotal      = paid.reduce((s, i) => s + i.total, 0);
  const pendingTotal   = pending.reduce((s, i) => s + i.total, 0);
  const draftTotal     = drafts.reduce((s, i) => s + i.total, 0);
  const cancelledTotal = cancelled.reduce((s, i) => s + i.total, 0);

  const kpiCards = [
    { title: "Pending",   value: `$${formatCurrency(pendingTotal)}`,   subtitle: `${pending.length} invoices`,   icon: Clock,     borderColor: STATUS_BORDER.Pending   },
    { title: "Paid",      value: `$${formatCurrency(paidTotal)}`,      subtitle: `${paid.length} invoices`,      icon: CheckCircle, borderColor: STATUS_BORDER.Paid    },
    { title: "Draft",     value: `$${formatCurrency(draftTotal)}`,     subtitle: `${drafts.length} invoices`,    icon: FileEdit,  borderColor: STATUS_BORDER.Draft     },
    { title: "Cancelled", value: `$${formatCurrency(cancelledTotal)}`, subtitle: `${cancelled.length} invoices`, icon: XCircle,   borderColor: STATUS_BORDER.Cancelled },
  ];

  // ── Filtering + pagination ────────────────────────────────────────────────────
  const filtered = allInvoices
    .filter((inv) => inv.client_name.toLowerCase().includes(search.toLowerCase()))
    .filter((inv) => statusFilter === "All" || inv.status === statusFilter)
    .filter((inv) => {
      if (!selectedDate) return true;
      const d = parseDateOnly(inv.invoice_date);
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

  // ── Quick-action handlers (from dropdown, no modal) ──────────────────────────
  const handleQuickPay = () => {
    if (!actionInvoice || !selectedPaymentMethod) return;
    if (selectedPaymentMethod === "Cheque" && !chequeNumber.trim()) {
      toast.error("Please enter a cheque number");
      return;
    }
    markPaid.mutate(
      { id: actionInvoice.id, paymentMethod: selectedPaymentMethod, chequeNumber: chequeNumber || undefined },
      {
        onSuccess: () => {
          setIsPaymentDialogOpen(false);
          setSelectedPaymentMethod(null);
          setShowChequeInput(false);
          setChequeNumber("");
          setActionInvoice(null);
        },
      }
    );
  };

  const handleQuickCancel = () => {
    if (!actionInvoice) return;
    cancelInv.mutate(actionInvoice.id, {
      onSuccess: () => {
        setIsCancelDialogOpen(false);
        setActionInvoice(null);
      },
    });
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    if (!profile) { toast.error("Company profile not loaded"); return; }

    try {
      const lineItems: LineItem[] = invoice.line_items ?? [];
      const taxRate  = invoice.tax_rate ?? 0;
      const { subtotal, discountAmount: discAmt, taxAmount: taxAmt } = calculateInvoiceTotals({
        lineItems,
        discountType:  invoice.discount_type,
        discountValue: invoice.discount_value,
        taxRate,
      });

      const doc = generateInvoicePDF({
        companyLogo:   profile.company_logo   ?? undefined,
        companyName:   profile.company_name   ?? "",
        companyPhone:  profile.company_phone  ?? "",
        companyEmail:  profile.company_email  ?? "",
        companyStreet: profile.company_address ?? "",
        companyCity:   profile.company_city   ?? "",
        companyState:  profile.company_state  ?? "",
        companyZip:    profile.company_zip    ?? "",
        clientName:    invoice.client_name,
        clientPhone:   invoice.phone,
        clientEmail:   invoice.email,
        invoiceNumber: invoice.invoice_number,
        invoiceName:   invoice.invoice_name ?? undefined,
        invoiceDate:   formatDateOnly(invoice.invoice_date, "MMMM d, yyyy"),
        dueDate:       formatDateOnly(invoice.due_date, "MMMM d, yyyy"),
        status:        invoice.status,
        lineItems:     lineItems.map((i) => ({ ...i })),
        subtotal,
        taxRate,
        taxAmount:     taxAmt,
        discountType:  invoice.discount_type ?? undefined,
        discountValue: invoice.discount_value ?? undefined,
        discountAmount: discAmt,
        total:         invoice.total,
        notes:         invoice.notes ?? undefined,
      });
      doc.save(`Invoice_${invoice.invoice_number}.pdf`);
      toast.success("Invoice PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-background p-2.5">
      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none mb-2.5">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpiCards.map((card) => (
              <div
                key={card.title}
                className="border-l-4 pl-4"
                style={{ borderLeftColor: card.borderColor }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: card.borderColor }}>
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary/50">
                    <card.icon className="w-5 h-5" style={{ color: card.borderColor }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none mb-2.5">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status filter */}
              <Select
                value={statusFilter}
                onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setCurrentPage(1); }}
              >
                <SelectTrigger className="w-[140px] h-9 text-sm bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Status: All</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search client..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="pl-9 h-9 border-border/50 text-sm bg-white"
                />
              </div>

              {/* Date picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn("h-9 whitespace-nowrap", !selectedDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "MMM d") : "Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setCurrentPage(1); }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* New button */}
            <Button onClick={() => setShowCreateModal(true)} className="h-9">
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active date filter pill */}
      {selectedDate && (
        <div className="flex items-center justify-between bg-accent/50 p-2 rounded-md mb-2.5 text-sm">
          <span className="text-muted-foreground">
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
              <TableHead className="h-10 font-bold text-[13px]">Invoice #</TableHead>
              <TableHead className="h-10 font-bold text-[13px]">Client Name</TableHead>
              <TableHead className="h-10 font-bold text-[13px]">Date</TableHead>
              <TableHead className="h-10 font-bold text-[13px]">Due Date</TableHead>
              <TableHead className="h-10 font-bold text-[13px]">Status</TableHead>
              <TableHead className="h-10 font-bold text-[13px]">Amount</TableHead>
              <TableHead className="h-10 font-bold text-[13px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading invoices...
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className="cursor-pointer hover:bg-muted/50 border-b border-border/50"
                  onClick={() => {
                    setDetailId(invoice.id);
                    setIsDetailOpen(true);
                  }}
                >
                  <TableCell className="py-2 px-4 font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell className="py-2 px-4">{invoice.client_name}</TableCell>
                  <TableCell className="py-2 px-4">
                    {formatDateOnly(invoice.invoice_date, "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="py-2 px-4">
                    {formatDateOnly(invoice.due_date, "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="py-2 px-4">
                    <Badge
                      variant="outline"
                      className={cn("font-medium text-[13px]", STATUS_BADGE[invoice.status as InvoiceStatus] ?? "")}
                    >
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 px-4 font-semibold">
                    ${formatCurrency(invoice.total)}
                  </TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailId(invoice.id);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>

                        {(invoice.status === "Draft" || invoice.status === "Pending") && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditInvoiceId(invoice.id);
                              setShowEditModal(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}

                        {invoice.status === "Pending" && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionInvoice(invoice);
                              setIsPaymentDialogOpen(true);
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" style={{ color: "hsl(var(--green-vibrant))" }} />
                            Mark as Paid
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        {invoice.status === "Pending" && (
                          <DropdownMenuItem
                            onClick={async (e) => {
                              e.stopPropagation();
                              await sendInvoiceEmail(invoice.id);
                            }}
                            disabled={isSending}
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            Send Reminder
                          </DropdownMenuItem>
                        )}

                        {(invoice.status === "Pending" || invoice.status === "Draft") && (
                          <DropdownMenuItem
                            onClick={async (e) => {
                              e.stopPropagation();
                              await sendInvoiceEmail(invoice.id);
                            }}
                            disabled={isSending}
                          >
                            <Share className="w-4 h-4 mr-2" />
                            Send Invoice
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPDF(invoice);
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </DropdownMenuItem>

                        {(invoice.status === "Pending" || invoice.status === "Draft") && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionInvoice(invoice);
                                setIsCancelDialogOpen(true);
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel Invoice
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
              {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} invoices
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-[13px] text-muted-foreground">
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

      {/* ── Invoice Detail Modal ───────────────────────────────────────────── */}
      <InvoiceDetailsModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        invoiceId={detailId}
        onEdit={(id) => {
          setIsDetailOpen(false);
          setEditInvoiceId(id);
          setShowEditModal(true);
        }}
      />

      {/* ── Quick Pay Dialog ───────────────────────────────────────────────── */}
      <AlertDialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Paid</AlertDialogTitle>
            <AlertDialogDescription>
              Select the payment method to mark this invoice as paid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant={selectedPaymentMethod === "Cash" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => { setSelectedPaymentMethod("Cash"); setShowChequeInput(false); }}
            >
              Mark as Paid — Cash
            </Button>
            <Button
              variant={selectedPaymentMethod === "Cheque" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => { setSelectedPaymentMethod("Cheque"); setShowChequeInput(true); }}
            >
              Mark as Paid — Cheque
            </Button>
            {showChequeInput && (
              <Input
                placeholder="Enter cheque number"
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
              />
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setSelectedPaymentMethod(null);
                setShowChequeInput(false);
                setChequeNumber("");
                setActionInvoice(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleQuickPay}
              disabled={!selectedPaymentMethod || markPaid.isPending}
              style={{ backgroundColor: "hsl(var(--green-vibrant))" }}
            >
              {markPaid.isPending ? "Processing..." : "Confirm Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Cancel Dialog ─────────────────────────────────────────────────── */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this invoice? This action will move the invoice to the Cancelled section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setActionInvoice(null)}>No, keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleQuickCancel}
              disabled={cancelInv.isPending}
            >
              {cancelInv.isPending ? "Cancelling..." : "Yes, cancel invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create Invoice modal ─────────────────────────────────────────── */}
      <CreateInvoicePage
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* ── Edit Invoice modal ───────────────────────────────────────────── */}
      {showEditModal && (
        <CreateInvoicePage
          open={showEditModal}
          onClose={() => { setShowEditModal(false); setEditInvoiceId(undefined); }}
          editId={editInvoiceId}
        />
      )}
    </div>
  );
}
