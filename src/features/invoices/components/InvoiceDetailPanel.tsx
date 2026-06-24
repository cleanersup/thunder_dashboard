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
  CreditCard, Share,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button }         from "@/shared/components/ui/button";
import { Input }          from "@/shared/components/ui/input";
import { formatDisplayDateTime } from "@/shared/utils/formatters";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { toast }          from "sonner";
import { formatCurrency, formatDateOnly } from "@/shared/utils/formatters";
import {
  useInvoice,
  useMarkInvoiceAsPaid,
  useChargeInvoiceSavedCard,
  useCancelInvoice,
  useUpdateInvoice,
} from "../hooks/useInvoices";
import { useSendInvoiceEmail }      from "../hooks/useSendInvoiceEmail";
import { useSendInvoiceReminder }   from "../hooks/useSendInvoiceReminder";
import { logInvoiceActivity }       from "@/shared/services/activityLog";
import { useInvoiceDetailRealtime } from "../hooks/useInvoiceRealtime";
import { useInvoicePDFDownload }    from "../hooks/useInvoicePDFDownload";
import { INVOICE_STATUS_COLOR, INVOICE_STATUS_BG } from "../utils/invoiceStatusHelpers";
import { safeParseLineItems } from "../utils/invoiceCalculations";
import { SidePanel }       from "@/shared/components/common/SidePanel";
import { useClientByEmail } from "@/features/crm/clients/hooks/useClients";
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
  const { sendReminder, isSending: isSendingReminder } = useSendInvoiceReminder();
  const markPaid                           = useMarkInvoiceAsPaid();
  const chargeSavedCard                    = useChargeInvoiceSavedCard();
  const cancelInv                          = useCancelInvoice();
  const updateInv                          = useUpdateInvoice();

  const { data: invoice, isLoading } = useInvoice(open && invoiceId ? invoiceId : undefined);
  const { data: paymentClient } = useClientByEmail(invoice?.user_id, invoice?.email);
  useInvoiceDetailRealtime(invoiceId, open);

  // ── Local dialog state ────────────────────────────────────────────────────────
  const [isPaymentDialogOpen,      setIsPaymentDialogOpen]      = useState(false);
  const [isTakePaymentDialogOpen,  setIsTakePaymentDialogOpen]  = useState(false);
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

  const handleTakePayment = () => {
    if (!invoice || !hasCardOnFile) return;

    chargeSavedCard.mutate(invoice.id, {
      onSuccess: () => {
        setPaymentDetails({
          method: cardLabel || "Card on file",
          amount: invoice.total,
        });
        setIsTakePaymentDialogOpen(false);
        setShowSuccessDialog(true);
      },
    });
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
    if (result.success) {
      if (invoice) {
        void logInvoiceActivity("invoice_sent", invoice.invoice_number, invoice.client_name, invoice.total);
      }
      // A Draft invoice that's been sent should move to Pending (awaiting payment).
      if (invoice?.status === "Draft") {
        updateInv.mutate({ id: invoiceId, updates: { status: "Pending" } });
      }
      setIsEmailSuccessDialogOpen(true);
    }
  };

  const handleSendReminder = async () => {
    if (!invoiceId) return;
    await sendReminder(invoiceId);
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
  // Discount applies to the services subtotal only — negative adjustments like the
  // "Deposit Paid" credit line are applied AFTER the discount, so they must be
  // excluded from the percentage base (otherwise a $120 net subtotal would yield a
  // 10% discount of $12 instead of the correct $20 on the $200 of services).
  const discountBase = lineItems.reduce((s, i) => s + (i.total > 0 ? i.total : 0), 0);
  const hasCardOnFile = !!paymentClient?.stripe_default_payment_method_id;
  const cardLabel = hasCardOnFile
    ? `${paymentClient?.card_brand?.toUpperCase() ?? "CARD"} ending in ${paymentClient?.card_last4 ?? "••••"}`
    : "";
  const isPaymentProcessing = markPaid.isPending;

  // ── Footer ────────────────────────────────────────────────────────────────────

  function renderFooter() {
    if (!invoice) return undefined;

    // Draft: Send Invoice (primary) + More (Edit, Share, Download, Cancel)
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
              <DropdownMenuItem onClick={handleSendEmail} disabled={isSending}>
                <Share className="w-4 h-4 mr-2" /> {isSending ? "Sending…" : "Share"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => invoice && downloadPDF(invoice)}>
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setIsCancelDialogOpen(true)}>
                <XCircle className="w-4 h-4 mr-2" /> Cancel Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    // Pending: Mark as Paid (primary) + More (Edit, Send Reminder, Send Invoice, Download, Cancel)
    if (invoice.status === "Pending") {
      return (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1"
            style={{ backgroundColor: "hsl(var(--green-vibrant))", color: "white" }}
            onClick={() => setIsPaymentDialogOpen(true)}
          >
            <DollarSign className="w-4 h-4 mr-1.5" /> Mark as Paid
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="px-2.5">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil className="w-4 h-4 mr-2" /> Edit Invoice
              </DropdownMenuItem>
              {hasCardOnFile && (
                <DropdownMenuItem onClick={() => setIsTakePaymentDialogOpen(true)} disabled={chargeSavedCard.isPending}>
                  <CreditCard className="w-4 h-4 mr-2" /> Take a Payment
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleSendReminder} disabled={isSendingReminder}>
                <Mail className="w-4 h-4 mr-2" /> {isSendingReminder ? "Sending…" : "Send Reminder"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSendEmail} disabled={isSending}>
                <Share className="w-4 h-4 mr-2" /> Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => invoice && downloadPDF(invoice)}>
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setIsCancelDialogOpen(true)}>
                <XCircle className="w-4 h-4 mr-2" /> Cancel Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    // Paid / Cancelled: Download PDF (primary) + More (Share)
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => invoice && downloadPDF(invoice)}>
          <Download className="w-4 h-4 mr-1.5" /> Download PDF
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="px-2.5">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={handleSendEmail} disabled={isSending}>
              <Share className="w-4 h-4 mr-2" /> {isSending ? "Sending…" : "Share"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
          <div className="p-4 space-y-6">

            {/* ── Total Amount ──────────────────────────────────────────── */}
            <section className="space-y-2">
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-3xl font-bold" style={{ color: statusColor }}>
                ${formatCurrency(invoice.total)}
              </p>
              {invoice.status === "Paid" && invoice.payment_method && (
                <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--green-vibrant) / 0.05)" }}>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" style={{ color: "hsl(var(--green-vibrant))" }} />
                    <span className="text-sm font-semibold" style={{ color: "hsl(var(--green-vibrant))" }}>Payment Method</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: "hsl(var(--green-vibrant))" }}>
                    {invoice.payment_method}{invoice.cheque_number && ` #${invoice.cheque_number}`}
                  </span>
                </div>
              )}
            </section>

            <hr className="border-border" />

            {/* ── Contact ───────────────────────────────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact</h3>
              <p className="text-sm font-semibold">{invoice.client_name}</p>
              {invoice.company_name && (
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="text-sm font-medium">{invoice.company_name}</p>
                  </div>
                </div>
              )}
              {/* Phone */}
              {invoice.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{invoice.phone}</p>
                      <div className="flex gap-1.5 shrink-0">
                        <a href={`sms:${invoice.phone}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors" aria-label="SMS">
                          <Mail className="h-3.5 w-3.5 text-primary" />
                        </a>
                        <a href={`tel:${invoice.phone}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors" aria-label="Call">
                          <Phone className="h-3.5 w-3.5 text-primary" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Email */}
              {invoice.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{invoice.email}</p>
                      <a href={`mailto:${invoice.email}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors shrink-0" aria-label="Email">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
              {invoice.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm font-medium">
                      {invoice.address}{invoice.apt && `, ${invoice.apt}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.city}, {invoice.state} {invoice.zip}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <hr className="border-border" />

            {/* ── Invoice Details ───────────────────────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invoice Details</h3>
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Service Type</p>
                  <p className="text-sm font-medium capitalize">{invoice.service_type}</p>
                </div>
              </div>
              {invoice.invoice_name && (
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Invoice Title</p>
                    <p className="text-sm font-medium">{invoice.invoice_name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Invoice Date</p>
                  <p className="text-sm font-medium">{formatDateOnly(invoice.invoice_date, "MMMM d, yyyy")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="text-sm font-medium">{formatDateOnly(invoice.due_date, "MMMM d, yyyy")}</p>
                </div>
              </div>
              {invoice.status === "Paid" && invoice.paid_date && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "hsl(var(--green-vibrant))" }} />
                  <div>
                    <p className="text-xs text-muted-foreground">Paid Date</p>
                    <p className="text-sm font-medium" style={{ color: "hsl(var(--green-vibrant))" }}>
                      {formatDateOnly(invoice.paid_date, "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <hr className="border-border" />

            {/* ── Line Items ────────────────────────────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Line Items</h3>
              {lineItemsError ? (
                <p className="text-sm text-destructive">{lineItemsError}</p>
              ) : lineItems.length > 0 ? (
                lineItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center pb-2 border-b border-border/30 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{item.description}</p>
                      <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} × {item.qty}</p>
                    </div>
                    <span className="text-sm font-semibold">${item.total.toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">{invoice.service_type}</p>
                  <span className="text-sm font-semibold">${formatCurrency(invoice.total)}</span>
                </div>
              )}
              {/* Totals */}
              <div className="border-t border-border/50 pt-2.5 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${lineItems.length > 0 ? subtotal.toFixed(2) : formatCurrency(invoice.total)}</span>
                </div>
                {(invoice.discount_value ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Discount{invoice.discount_type === "percentage" ? ` (${invoice.discount_value}%)` : ""}
                    </span>
                    <span className="font-medium text-destructive">
                      -${invoice.discount_type === "percentage"
                        ? ((lineItems.length > 0 ? discountBase : invoice.total) * ((invoice.discount_value ?? 0) / 100)).toFixed(2)
                        : (invoice.discount_value ?? 0).toFixed(2)}
                    </span>
                  </div>
                )}
                {(invoice.tax_rate ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({invoice.tax_rate}%)</span>
                    <span className="font-medium">${((lineItems.length > 0 ? subtotal : invoice.total) * ((invoice.tax_rate ?? 0) / 100)).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1.5 border-t border-border/50">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-sm font-bold" style={{ color: statusColor }}>${formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </section>

            {/* ── Notes ────────────────────────────────────────────────── */}
            {invoice.notes && (
              <>
                <hr className="border-border" />
                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</h3>
                  <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                </section>
              </>
            )}

            {/* ── Timeline ─────────────────────────────────────────────── */}
            <hr className="border-border" />
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Timeline</h3>
              <p className="text-xs text-muted-foreground">
                Created {formatDisplayDateTime(invoice.created_at)}
              </p>
              {invoice.updated_at !== invoice.created_at && (
                <p className="text-xs text-muted-foreground">
                  Updated {formatDisplayDateTime(invoice.updated_at)}
                </p>
              )}
            </section>

          </div>
        )}
      </SidePanel>

      {/* ── Payment Dialog ────────────────────────────────────────────────────── */}
      <AlertDialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Paid</AlertDialogTitle>
            <AlertDialogDescription>
              Select the payment method to process or record this invoice payment.
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
              disabled={!selectedPayment || isPaymentProcessing}
              style={{ backgroundColor: "hsl(var(--green-vibrant))" }}
            >
              {isPaymentProcessing ? "Processing..." : "Confirm Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Take Payment Confirmation ─────────────────────────────────────────── */}
      <AlertDialog open={isTakePaymentDialogOpen} onOpenChange={setIsTakePaymentDialogOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Take a Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm charging {cardLabel || "the saved card"} for{" "}
              <strong>${formatCurrency(invoice?.total ?? 0)}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border border-green-700/20 bg-green-50 p-3 text-sm text-green-700">
            <div className="flex items-center gap-2 font-medium">
              <CreditCard className="h-4 w-4" />
              {cardLabel || "Card on file"}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTakePayment}
              disabled={!hasCardOnFile || chargeSavedCard.isPending}
              className="bg-green-700 hover:bg-green-800"
            >
              {chargeSavedCard.isPending ? "Processing..." : "Confirm Charge"}
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
