/**
 * @module InvoiceDetailPanel
 * Right-side detail panel for invoices — replaces InvoiceDetailsModal.
 *
 * Uses SidePanel as the shell and migrates all content and action handlers
 * from InvoiceDetailsModal to a single-column scrollable layout.
 *
 * Footer actions by status:
 *   Draft     → Send Invoice · More (Edit, Download PDF, Cancel)
 *   Pending   → Mark as Paid · Send Reminder · More (Edit, Download PDF, Cancel)
 *   Paid      → Download PDF (full width)
 *   Cancelled → Download PDF (full width)
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle, Clock, Mail, Phone, MapPin, Building2, Calendar,
  FileText, Download, DollarSign, XCircle, Loader2, Pencil, MoreHorizontal,
  CreditCard,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button }         from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input }          from "@/shared/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { toast }          from "sonner";
import { formatCurrency, formatDateOnly } from "@/shared/utils/formatters";
import {
  useInvoice,
  useMarkInvoiceAsPaid,
  useCancelInvoice,
  useClientSavedCard,
  useChargeSavedInvoice,
} from "../hooks/useInvoices";
import { useSendInvoiceEmail }      from "../hooks/useSendInvoiceEmail";
import { useInvoiceDetailRealtime } from "../hooks/useInvoiceRealtime";
import { useInvoicePDFDownload }    from "../hooks/useInvoicePDFDownload";
import { INVOICE_STATUS_COLOR, INVOICE_STATUS_BG } from "../utils/invoiceStatusHelpers";
import { safeParseLineItems } from "../utils/invoiceCalculations";
import { SidePanel }       from "@/shared/components/common/SidePanel";
import { useProfile }      from "@/shared/hooks/useProfile";
import type { InvoiceStatus } from "../types/invoice.types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface InvoiceDetailPanelProps {
  open:      boolean;
  onClose:   () => void;
  invoiceId: string | null;
  /** Called when user clicks Edit — parent opens the edit modal/page */
  onEdit?:   (invoiceId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InvoiceDetailPanel({
  open, onClose, invoiceId, onEdit,
}: InvoiceDetailPanelProps) {
  const navigate = useNavigate();
  const { downloadPDF }                    = useInvoicePDFDownload();
  const { sendInvoiceEmail, isSending }    = useSendInvoiceEmail();
  const markPaid                           = useMarkInvoiceAsPaid();
  const cancelInv                          = useCancelInvoice();
  const chargeSaved                        = useChargeSavedInvoice();
  const { data: profile }                = useProfile();

  const { data: invoice, isLoading } = useInvoice(open && invoiceId ? invoiceId : undefined);
  const { data: savedCard } = useClientSavedCard(
    invoice?.email,
    open && invoice?.status === "Pending",
  );

  const canChargeSavedCard =
    invoice?.status === "Pending" &&
    !!profile?.stripe_account_id &&
    !!profile?.stripe_onboarding_completed &&
    !!savedCard?.stripe_default_payment_method_id;
  useInvoiceDetailRealtime(invoiceId, open);

  // ── Local dialog state ────────────────────────────────────────────────────────
  const [isPaymentDialogOpen,      setIsPaymentDialogOpen]      = useState(false);
  const [isCancelDialogOpen,       setIsCancelDialogOpen]       = useState(false);
  const [selectedPayment,          setSelectedPayment]          = useState<"Cash" | "Cheque" | null>(null);
  const [showChequeInput,          setShowChequeInput]          = useState(false);
  const [chequeNumber,             setChequeNumber]             = useState("");
  const [showSuccessDialog,        setShowSuccessDialog]        = useState(false);
  const [paymentDetails,           setPaymentDetails]           = useState({ method: "", amount: 0 });
  const [isEmailSuccessDialogOpen, setIsEmailSuccessDialogOpen] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleMarkAsPaid = () => {
    if (!invoice || !selectedPayment) return;
    if (selectedPayment === "Cheque" && !chequeNumber.trim()) {
      toast.error("Please enter a cheque number");
      return;
    }
    markPaid.mutate(
      { id: invoice.id, paymentMethod: selectedPayment, chequeNumber: chequeNumber || undefined },
      {
        onSuccess: () => {
          setPaymentDetails({
            method: selectedPayment === "Cheque" ? `Cheque #${chequeNumber}` : "Cash",
            amount: invoice.total,
          });
          setIsPaymentDialogOpen(false);
          setShowChequeInput(false);
          setChequeNumber("");
          setSelectedPayment(null);
          setShowSuccessDialog(true);
        },
      },
    );
  };

  const handleCancelInvoice = () => {
    if (!invoice) return;
    cancelInv.mutate(invoice.id, {
      onSuccess: () => setIsCancelDialogOpen(false),
    });
  };

  const handleSendEmail = async () => {
    if (!invoiceId) return;
    const result = await sendInvoiceEmail(invoiceId);
    if (result.success) setIsEmailSuccessDialogOpen(true);
  };

  function handleEdit() {
    if (!invoiceId) return;
    onClose();
    if (onEdit) onEdit(invoiceId);
    else navigate(`/invoices/${invoiceId}/edit`);
  }

  // ── Derived data ──────────────────────────────────────────────────────────────

  const statusColor = INVOICE_STATUS_COLOR[(invoice?.status as InvoiceStatus) ?? "Draft"];
  const statusBg    = INVOICE_STATUS_BG[(invoice?.status as InvoiceStatus) ?? "Draft"];

  const { items: lineItems, error: lineItemsError } = safeParseLineItems(invoice?.line_items);
  const subtotal = lineItems.reduce((s, i) => s + i.total, 0);

  // ── Footer ────────────────────────────────────────────────────────────────────

  function renderFooter() {
    if (!invoice) return undefined;

    if (invoice.status === "Draft") {
      return (
        <div className="flex items-center gap-2">
          <Button size="sm" className="flex-1" onClick={handleSendEmail} disabled={isSending}>
            <Mail className="w-4 h-4 mr-1.5" /> {isSending ? "Sending…" : "Send Invoice"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="px-2.5">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => invoice && downloadPDF(invoice)}>
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setIsCancelDialogOpen(true)}
              >
                <XCircle className="w-4 h-4 mr-2" /> Cancel Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    if (invoice.status === "Pending") {
      return (
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="flex-1"
              style={{ backgroundColor: "hsl(var(--green-vibrant))", color: "white" }}
              onClick={() => setIsPaymentDialogOpen(true)}
            >
              <DollarSign className="w-4 h-4 mr-1.5" /> Mark as Paid
            </Button>
            <Button size="sm" variant="outline" onClick={handleSendEmail} disabled={isSending}>
              <Mail className="w-4 h-4 mr-1.5" /> {isSending ? "Sending…" : "Send Reminder"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="px-2.5">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleEdit}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => invoice && downloadPDF(invoice)}>
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setIsCancelDialogOpen(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" /> Cancel Invoice
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {canChargeSavedCard && (
            <Button
              size="sm"
              variant="default"
              className="w-full bg-blue-vibrant text-white hover:bg-blue-vibrant/90 focus-visible:ring-blue-vibrant/40"
              disabled={chargeSaved.isPending}
              onClick={() => chargeSaved.mutate(invoice.id)}
            >
              <CreditCard className="w-4 h-4 mr-1.5 shrink-0" />
              {chargeSaved.isPending
                ? "Processing…"
                : `Charge card${
                    savedCard?.card_last4 ? ` ····${savedCard.card_last4}` : ""
                  }`}
            </Button>
          )}
        </div>
      );
    }

    // Paid or Cancelled: Download PDF only
    return (
      <Button size="sm" variant="outline" className="w-full" onClick={() => invoice && downloadPDF(invoice)}>
        <Download className="w-4 h-4 mr-1.5" /> Download PDF
      </Button>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        title={invoice?.invoice_number ?? (isLoading ? "Loading…" : "Invoice")}
        badge={invoice ? { label: invoice.status, color: statusColor, bg: statusBg } : undefined}
        footer={renderFooter()}
      >
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Not found */}
        {!isLoading && !invoice && (
          <div className="flex flex-col items-center justify-center h-40 gap-3 px-6">
            <p className="text-sm text-muted-foreground">Invoice not found.</p>
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        )}

        {/* Content */}
        {!isLoading && invoice && (
          <div className="p-4 space-y-3">

            {/* Client Info */}
            <Card className="border border-border/50">
              <CardContent className="p-4">
                <h3 className="text-base font-semibold mb-3">{invoice.client_name}</h3>
                <div className="space-y-2">
                  {invoice.company_name && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm">{invoice.company_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm">{invoice.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm">{invoice.email}</span>
                  </div>
                  {invoice.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
                      <span className="text-sm">
                        {invoice.address}{invoice.apt && `, ${invoice.apt}`}<br />
                        {invoice.city}, {invoice.state} {invoice.zip}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Total Amount */}
            <Card className="border border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                <p className="text-3xl font-bold mb-2" style={{ color: statusColor }}>
                  ${formatCurrency(invoice.total)}
                </p>
                {invoice.status === "Paid" && invoice.payment_method && (
                  <div
                    className="flex justify-between items-center p-3 rounded-lg"
                    style={{ backgroundColor: "hsl(var(--green-vibrant) / 0.05)" }}
                  >
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" style={{ color: "hsl(var(--green-vibrant))" }} />
                      <span className="text-sm font-semibold" style={{ color: "hsl(var(--green-vibrant))" }}>
                        Payment Method
                      </span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: "hsl(var(--green-vibrant))" }}>
                      {invoice.payment_method}
                      {invoice.cheque_number && ` #${invoice.cheque_number}`}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card className="border border-border/50">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold mb-3">Invoice Details</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Service Type</p>
                      <p className="text-sm font-medium">{invoice.service_type}</p>
                    </div>
                  </div>
                  {invoice.invoice_name && (
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Invoice Title</p>
                        <p className="text-sm font-medium">{invoice.invoice_name}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 shrink-0 text-purple-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Invoice Date</p>
                      <p className="text-sm font-medium">
                        {formatDateOnly(invoice.invoice_date, "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 shrink-0 text-orange-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Due Date</p>
                      <p className="text-sm font-medium">
                        {formatDateOnly(invoice.due_date, "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  {invoice.status === "Paid" && invoice.paid_date && (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--green-vibrant))" }} />
                      <div>
                        <p className="text-xs text-muted-foreground">Paid Date</p>
                        <p className="text-sm font-medium" style={{ color: "hsl(var(--green-vibrant))" }}>
                          {formatDateOnly(invoice.paid_date, "MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  )}
                  {invoice.status === "Cancelled" && (
                    <div className="flex items-center gap-3">
                      <XCircle className="w-4 h-4 shrink-0 text-destructive" />
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="text-sm font-medium text-destructive">Cancelled</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card className="border border-border/50">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold mb-3">Line Items</h4>
                <div className="space-y-2.5">
                  {lineItemsError ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3">
                      <p className="text-sm font-medium text-destructive">Unable to load line items</p>
                      <p className="text-xs text-muted-foreground mt-1">{lineItemsError}</p>
                    </div>
                  ) : lineItems.length > 0 ? (
                    lineItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center pb-2 border-b border-border/30 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            ${item.price.toFixed(2)} × {item.qty}
                          </p>
                        </div>
                        <span className="text-sm font-semibold">${item.total.toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between items-center pb-2 border-b border-border/30">
                      <div>
                        <p className="text-sm font-medium">{invoice.service_type}</p>
                        <p className="text-xs text-muted-foreground">
                          ${formatCurrency(invoice.total)} × 1
                        </p>
                      </div>
                      <span className="text-sm font-semibold">${formatCurrency(invoice.total)}</span>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="border-t border-border/50 pt-2.5 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Subtotal</span>
                      <span className="text-sm font-semibold">
                        ${lineItems.length > 0 ? subtotal.toFixed(2) : formatCurrency(invoice.total)}
                      </span>
                    </div>
                    {(invoice.discount_value ?? 0) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Discount{invoice.discount_type === "percentage" ? ` (${invoice.discount_value}%)` : ""}
                        </span>
                        <span className="text-sm font-semibold text-destructive">
                          -${invoice.discount_type === "percentage"
                            ? ((lineItems.length > 0 ? subtotal : invoice.total) * ((invoice.discount_value ?? 0) / 100)).toFixed(2)
                            : (invoice.discount_value ?? 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {(invoice.tax_rate ?? 0) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Tax ({invoice.tax_rate}%)</span>
                        <span className="text-sm font-semibold">
                          ${((lineItems.length > 0 ? subtotal : invoice.total) * ((invoice.tax_rate ?? 0) / 100)).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1.5 border-t border-border/50">
                      <span className="text-sm font-bold">Total</span>
                      <span className="text-sm font-bold text-primary">
                        ${formatCurrency(invoice.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {invoice.notes && (
              <Card className="border border-border/50">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Attachments */}
            {invoice.attachments && invoice.attachments.length > 0 && (
              <Card className="border border-border/50">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-3">Attachments</h4>
                  <div className="space-y-2">
                    {invoice.attachments.map((file: { name: string; size?: number }, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-secondary/30 rounded-md">
                        <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm flex-1">{file.name}</span>
                        {file.size && (
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        )}
      </SidePanel>

      {/* ── Payment Dialog ────────────────────────────────────────────────────── */}
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
              variant={selectedPayment === "Cash" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => { setSelectedPayment("Cash"); setShowChequeInput(false); }}
            >
              <DollarSign className="w-4 h-4 mr-2" /> Cash
            </Button>
            <Button
              variant={selectedPayment === "Cheque" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => { setSelectedPayment("Cheque"); setShowChequeInput(true); }}
            >
              <FileText className="w-4 h-4 mr-2" /> Cheque
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
            <AlertDialogCancel onClick={() => { setSelectedPayment(null); setShowChequeInput(false); setChequeNumber(""); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkAsPaid}
              disabled={!selectedPayment || markPaid.isPending}
              style={{ backgroundColor: "hsl(var(--green-vibrant))" }}
            >
              {markPaid.isPending ? "Processing..." : "Confirm Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Cancel Dialog ─────────────────────────────────────────────────────── */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this invoice? This action will move the invoice to the Cancelled section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleCancelInvoice}
              disabled={cancelInv.isPending}
            >
              {cancelInv.isPending ? "Cancelling..." : "Yes, cancel invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Payment Success Dialog ────────────────────────────────────────────── */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "hsl(var(--green-vibrant) / 0.1)" }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: "hsl(var(--green-vibrant))" }} />
              </div>
            </div>
            <AlertDialogTitle className="text-center">Payment Confirmed!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Invoice marked as paid via {paymentDetails.method}
              <br />
              <span className="font-bold text-foreground">${formatCurrency(paymentDetails.amount)}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              onClick={() => setShowSuccessDialog(false)}
              style={{ backgroundColor: "hsl(var(--green-vibrant))", color: "white" }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Email Success Dialog ──────────────────────────────────────────────── */}
      <AlertDialog open={isEmailSuccessDialogOpen} onOpenChange={setIsEmailSuccessDialogOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
            </div>
            <AlertDialogTitle className="text-center">Email Sent Successfully!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              The invoice has been sent to <strong>{invoice?.email}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              className="bg-primary hover:bg-primary/90"
              onClick={() => setIsEmailSuccessDialogOpen(false)}
            >
              Got it!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
