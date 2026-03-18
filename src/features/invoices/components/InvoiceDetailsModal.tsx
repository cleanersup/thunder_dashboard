/**
 * @module InvoiceDetailsModal
 * Modal dialog showing full invoice details with quick actions.
 * Adapted from thunder-web-version/src/components/InvoiceDetailsModal.tsx.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { formatDateOnly } from "@/shared/utils/formatters";
import {
  CheckCircle, Clock, Mail, Phone, MapPin, Building2, Calendar,
  FileText, Download, DollarSign, XCircle, Loader2, Pencil,
} from "lucide-react";
import {
  Dialog, DialogContent,
} from "@/shared/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button }     from "@/shared/components/ui/button";
import { Badge }      from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input }      from "@/shared/components/ui/input";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { toast }      from "sonner";
import { formatCurrency } from "@/shared/utils/formatters";
import { useInvoice, useMarkInvoiceAsPaid, useCancelInvoice } from "../hooks/useInvoices";
import { useSendInvoiceEmail }        from "../hooks/useSendInvoiceEmail";
import { useInvoiceDetailRealtime }   from "../hooks/useInvoiceRealtime";
import { useInvoicePDFDownload }      from "../hooks/useInvoicePDFDownload";
import { INVOICE_STATUS_COLOR, INVOICE_STATUS_BG } from "../utils/invoiceStatusHelpers";
import type { InvoiceStatus, LineItem } from "../types/invoice.types";

// ─── Component ────────────────────────────────────────────────────────────────

interface InvoiceDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
  onEdit?: (invoiceId: string) => void;
}

export function InvoiceDetailsModal({
  open, onOpenChange, invoiceId, onEdit,
}: InvoiceDetailsModalProps) {
  const navigate = useNavigate();
  const { downloadPDF } = useInvoicePDFDownload();
  const { sendInvoiceEmail, isSending } = useSendInvoiceEmail();
  const markPaid   = useMarkInvoiceAsPaid();
  const cancelInv  = useCancelInvoice();

  const { data: invoice, isLoading } = useInvoice(open && invoiceId ? invoiceId : undefined);

  useInvoiceDetailRealtime(invoiceId, open);

  // local dialog state
  const [isPaymentDialogOpen,    setIsPaymentDialogOpen]    = useState(false);
  const [isCancelDialogOpen,     setIsCancelDialogOpen]     = useState(false);
  const [selectedPayment,        setSelectedPayment]        = useState<"Cash" | "Cheque" | null>(null);
  const [showChequeInput,        setShowChequeInput]        = useState(false);
  const [chequeNumber,           setChequeNumber]           = useState("");
  const [showSuccessDialog,      setShowSuccessDialog]      = useState(false);
  const [paymentDetails,         setPaymentDetails]         = useState({ method: "", amount: 0 });
  const [isEmailSuccessDialogOpen, setIsEmailSuccessDialogOpen] = useState(false);

  // ── Handlers ────────────────────────────────────────────────────────────────

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
      }
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


  // ── Render states ────────────────────────────────────────────────────────────

  if (!open) return null;

  const statusColor = INVOICE_STATUS_COLOR[(invoice?.status as InvoiceStatus) ?? "Draft"];
  const statusBg    = INVOICE_STATUS_BG[(invoice?.status as InvoiceStatus) ?? "Draft"];

  const lineItems: LineItem[] = (invoice?.line_items ?? []);
  const subtotal = lineItems.reduce((s, i) => s + i.total, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl lg:max-w-[580px] h-[85vh] p-0 gap-0 overflow-hidden lg:bg-gray-100">
          {/* Header */}
          <div className="flex items-center gap-2 px-6 pr-12 py-2.5 border-b border-border/50 bg-white dark:bg-card lg:bg-[#202B3D]">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : invoice ? (
              <>
                <h2 className="text-lg font-bold text-foreground lg:text-white">
                  {invoice.invoice_number}
                </h2>
                <Badge
                  style={{
                    backgroundColor: statusBg,
                    color: statusColor,
                    borderColor: statusColor,
                  }}
                  className="font-semibold"
                >
                  {invoice.status}
                </Badge>
              </>
            ) : (
              <h2 className="text-lg font-bold text-foreground lg:text-white">Invoice</h2>
            )}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center flex-1 h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Not found */}
          {!isLoading && !invoice && (
            <div className="flex items-center justify-center flex-1 h-full">
              <div className="text-center">
                <h2 className="text-xl font-bold mb-2">Invoice not found</h2>
                <p className="text-muted-foreground mb-4">
                  The invoice you're looking for doesn't exist.
                </p>
                <Button onClick={() => onOpenChange(false)}>Close</Button>
              </div>
            </div>
          )}

          {/* Content */}
          {!isLoading && invoice && (
            <ScrollArea className="flex-1 h-[calc(85vh-52px)]">
              <div className="p-4 lg:p-[5px]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-[5px]">
                  {/* ── Left column ─────────────────────────────────── */}
                  <div className="space-y-4 lg:space-y-[5px]">
                    {/* Client Info */}
                    <Card className="border border-border/50">
                      <CardContent className="p-5">
                        <h3 className="text-lg font-semibold mb-4">{invoice.client_name}</h3>
                        <div className="space-y-3">
                          {invoice.company_name && (
                            <div className="flex items-center gap-3">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{invoice.company_name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{invoice.phone}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{invoice.email}</span>
                          </div>
                          <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <span className="text-sm">
                              {invoice.address}
                              {invoice.apt && `, ${invoice.apt}`}
                              <br />
                              {invoice.city}, {invoice.state} {invoice.zip}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Invoice Details */}
                    <Card className="border border-border/50">
                      <CardContent className="p-5">
                        <h4 className="text-sm font-semibold mb-4">Invoice Details</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Service Type</p>
                              <p className="text-sm font-medium">{invoice.service_type}</p>
                            </div>
                          </div>
                          {invoice.invoice_name && (
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 text-primary" />
                              <div>
                                <p className="text-xs text-muted-foreground">Invoice Title</p>
                                <p className="text-sm font-medium">{invoice.invoice_name}</p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-purple-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Invoice Date</p>
                              <p className="text-sm font-medium">
                                {formatDateOnly(invoice.invoice_date, "MMMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Due Date</p>
                              <p className="text-sm font-medium">
                                {formatDateOnly(invoice.due_date, "MMMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          {invoice.status === "Paid" && invoice.paid_date && (
                            <div className="flex items-center gap-3">
                              <CheckCircle className="w-4 h-4" style={{ color: "hsl(var(--green-vibrant))" }} />
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
                              <XCircle className="w-4 h-4 text-destructive" />
                              <div>
                                <p className="text-xs text-muted-foreground">Status</p>
                                <p className="text-sm font-medium text-destructive">Cancelled</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Notes */}
                    <Card className="border border-border/50">
                      <CardContent className="p-5">
                        <h4 className="text-sm font-semibold mb-2">Notes</h4>
                        <p className="text-sm text-muted-foreground">
                          {invoice.notes || "No additional notes"}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="border border-border/50">
                      <CardContent className="p-5">
                        <h4 className="text-sm font-semibold mb-4">Quick Actions</h4>
                        <div className="grid grid-cols-1 gap-2">

                          {/* Draft: Edit, Send Invoice, Download PDF, Cancel */}
                          {invoice.status === "Draft" && (
                            <>
                              <Button
                                variant="outline" size="sm"
                                className="justify-start h-10"
                                onClick={() => {
                                  onOpenChange(false);
                                  if (onEdit && invoiceId) onEdit(invoiceId);
                                  else if (invoiceId) navigate(`/invoices/${invoiceId}/edit`);
                                }}
                              >
                                <Pencil className="w-4 h-4 mr-2 text-primary" />
                                Edit Invoice
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                className="justify-start h-10"
                                onClick={handleSendEmail}
                                disabled={isSending}
                              >
                                <Mail className="w-4 h-4 mr-2 text-primary" />
                                {isSending ? "Sending..." : "Send Invoice"}
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                className="justify-start h-10"
                                onClick={() => invoice && downloadPDF(invoice)}
                              >
                                <Download className="w-4 h-4 mr-2 text-primary" />
                                Download PDF
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                className="justify-start h-10 text-orange-600 hover:text-orange-600"
                                onClick={() => setIsCancelDialogOpen(true)}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancel Invoice
                              </Button>
                            </>
                          )}

                          {/* Pending: Edit, Send Reminder, Mark as Paid, Download PDF, Cancel */}
                          {invoice.status === "Pending" && (
                            <>
                              <Button
                                variant="outline" size="sm"
                                className="justify-start h-10"
                                onClick={() => {
                                  onOpenChange(false);
                                  if (onEdit && invoiceId) onEdit(invoiceId);
                                  else if (invoiceId) navigate(`/invoices/${invoiceId}/edit`);
                                }}
                              >
                                <Pencil className="w-4 h-4 mr-2 text-primary" />
                                Edit Invoice
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                className="justify-start h-10"
                                onClick={handleSendEmail}
                                disabled={isSending}
                              >
                                <Mail className="w-4 h-4 mr-2 text-primary" />
                                {isSending ? "Sending..." : "Send Reminder"}
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                className="justify-start h-10 text-green-600 hover:text-green-600"
                                onClick={() => setIsPaymentDialogOpen(true)}
                              >
                                <DollarSign className="w-4 h-4 mr-2" />
                                Mark as Paid
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                className="justify-start h-10"
                                onClick={() => invoice && downloadPDF(invoice)}
                              >
                                <Download className="w-4 h-4 mr-2 text-primary" />
                                Download PDF
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                className="justify-start h-10 text-orange-600 hover:text-orange-600"
                                onClick={() => setIsCancelDialogOpen(true)}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancel Invoice
                              </Button>
                            </>
                          )}

                          {/* Paid: Download PDF only */}
                          {invoice.status === "Paid" && (
                            <Button
                              variant="outline" size="sm"
                              className="justify-start h-10"
                              onClick={() => invoice && downloadPDF(invoice)}
                            >
                              <Download className="w-4 h-4 mr-2 text-primary" />
                              Download PDF
                            </Button>
                          )}

                          {/* Cancelled: Download PDF only */}
                          {invoice.status === "Cancelled" && (
                            <Button
                              variant="outline" size="sm"
                              className="justify-start h-10"
                              onClick={() => invoice && downloadPDF(invoice)}
                            >
                              <Download className="w-4 h-4 mr-2 text-primary" />
                              Download PDF
                            </Button>
                          )}

                        </div>
                      </CardContent>
                    </Card>

                    {/* Attachments */}
                    {invoice.attachments && invoice.attachments.length > 0 && (
                      <Card className="border border-border/50">
                        <CardContent className="p-5">
                          <h4 className="text-sm font-semibold mb-3">Attachments</h4>
                          <div className="space-y-2">
                            {invoice.attachments.map((file, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 p-2 bg-secondary/30 rounded-md"
                              >
                                <FileText className="w-4 h-4 text-muted-foreground" />
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

                  {/* ── Right column ─────────────────────────────────── */}
                  <div className="space-y-4 lg:space-y-[5px]">
                    {/* Total Amount */}
                    <Card className="border border-border/50">
                      <CardContent className="p-5">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                          <p className="text-4xl font-bold" style={{ color: statusColor }}>
                            ${formatCurrency(invoice.total)}
                          </p>
                        </div>
                        {invoice.status === "Paid" && invoice.payment_method && (
                          <div
                            className="mt-4 p-3 rounded-lg flex justify-between items-center"
                            style={{ backgroundColor: "hsl(var(--green-vibrant) / 0.05)" }}
                          >
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-5 w-5" style={{ color: "hsl(var(--green-vibrant))" }} />
                              <span className="font-semibold" style={{ color: "hsl(var(--green-vibrant))" }}>
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

                    {/* Line Items */}
                    <Card className="border border-border/50">
                      <CardContent className="p-5">
                        <h4 className="text-sm font-semibold mb-4">Line Items</h4>
                        <div className="space-y-3">
                          {lineItems.length > 0 ? (
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
                                <span className="text-sm font-semibold">
                                  ${item.total.toFixed(2)}
                                </span>
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
                              <span className="text-sm font-semibold">
                                ${formatCurrency(invoice.total)}
                              </span>
                            </div>
                          )}

                          <div className="border-t border-border/50 pt-3 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Subtotal</span>
                              <span className="text-sm font-semibold">
                                ${lineItems.length > 0 ? subtotal.toFixed(2) : formatCurrency(invoice.total)}
                              </span>
                            </div>
                            {(invoice.discount_value ?? 0) > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">
                                  Discount
                                  {invoice.discount_type === "percentage"
                                    ? ` (${invoice.discount_value}%)`
                                    : ""}
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
                                <span className="text-sm text-muted-foreground">
                                  Tax ({invoice.tax_rate}%)
                                </span>
                                <span className="text-sm font-semibold">
                                  ${((lineItems.length > 0 ? subtotal : invoice.total) * ((invoice.tax_rate ?? 0) / 100)).toFixed(2)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t border-border/50">
                              <span className="text-sm font-bold">Total</span>
                              <span className="text-sm font-bold text-primary">
                                ${formatCurrency(invoice.total)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Payment Dialog ────────────────────────────────────────────────── */}
      <AlertDialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <AlertDialogContent className="lg:max-w-sm">
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
              <DollarSign className="w-4 h-4 mr-2" />
              Cash
            </Button>
            <Button
              variant={selectedPayment === "Cheque" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => { setSelectedPayment("Cheque"); setShowChequeInput(true); }}
            >
              <FileText className="w-4 h-4 mr-2" />
              Cheque
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
                setSelectedPayment(null);
                setShowChequeInput(false);
                setChequeNumber("");
              }}
            >
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

      {/* ── Cancel Dialog ─────────────────────────────────────────────────── */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent className="lg:max-w-sm">
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

      {/* ── Payment Success Dialog ─────────────────────────────────────────── */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="lg:max-w-sm">
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

      {/* ── Email Success Dialog ───────────────────────────────────────────── */}
      <AlertDialog open={isEmailSuccessDialogOpen} onOpenChange={setIsEmailSuccessDialogOpen}>
        <AlertDialogContent className="lg:max-w-sm">
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
