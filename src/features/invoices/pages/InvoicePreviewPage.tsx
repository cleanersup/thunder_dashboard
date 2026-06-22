/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module InvoicePreviewPage
 * Read-only preview of an invoice before sending, with delivery method selection.
 * Adapted from thunder-web-version/src/pages/InvoicePreview.tsx + swift-slate logic.
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Mail, Phone, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button }    from "@/shared/components/ui/button";
import { Badge }     from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { toast }     from "sonner";
import { useProfile }             from "@/shared/hooks/useProfile";
import { formatCurrency, formatDateOnly } from "@/shared/utils/formatters";
import { INVOICE_STATUS_COLOR }   from "../utils/invoiceStatusHelpers";
import { DeliveryMethodSelector } from "@/shared/components/DeliveryMethodSelector";
import { useInvoice, useUpdateInvoice } from "../hooks/useInvoices";
import { useSendInvoiceEmail }          from "../hooks/useSendInvoiceEmail";
import { useSendInvoiceSMS }            from "../hooks/useSendInvoiceSMS";
import { useStripeConnect }             from "../hooks/useStripeConnect";
import { safeParseLineItems } from "../utils/invoiceCalculations";
import type { InvoiceStatus } from "../types/invoice.types";

// ─── Component ────────────────────────────────────────────────────────────────

export function InvoicePreviewPage() {
  const navigate = useNavigate();
  const { id }   = useParams<{ id: string }>();
  const { data: profile }  = useProfile();
  const { sendInvoiceEmail, isSending } = useSendInvoiceEmail();
  const { sendInvoiceSMS }              = useSendInvoiceSMS();
  const updateInvoice                   = useUpdateInvoice();
  const { initiateOnboarding }          = useStripeConnect();

  const { data: invoice, isLoading } = useInvoice(id);

  const [deliveryMethod, setDeliveryMethod] = useState<string | null>(null);
  const [deliveryError,  setDeliveryError]  = useState(false);

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h2 className="text-xl font-bold">Invoice not found</h2>
        <Button onClick={() => navigate("/invoices")}>Back to Invoices</Button>
      </div>
    );
  }

  // ── Calculations ───────────────────────────────────────────────────────────

  const { items: lineItems, error: lineItemsError } = safeParseLineItems(invoice.line_items);
  const subtotal  = lineItems.reduce((s, i) => s + i.total, 0);
  const taxRate   = invoice.tax_rate ?? 0;
  const discAmt   = invoice.discount_type === "percentage"
    ? subtotal * ((invoice.discount_value ?? 0) / 100)
    : (invoice.discount_value ?? 0);
  const taxAmt    = (subtotal - discAmt) * (taxRate / 100);
  const total     = subtotal - discAmt + taxAmt;

  const statusColor = INVOICE_STATUS_COLOR[(invoice.status as InvoiceStatus) ?? "Draft"];
  const isBusy      = isSending || updateInvoice.isPending;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!deliveryMethod) { setDeliveryError(true); return; }
    setDeliveryError(false);

    if (invoice.status === "Draft") {
      updateInvoice.mutate({ id: invoice.id, updates: { status: "Pending" } });
    }

    if (deliveryMethod === "email" || deliveryMethod === "both") {
      const result = await sendInvoiceEmail(invoice.id);
      if (!result.success) return;
    }

    if ((deliveryMethod === "sms" || deliveryMethod === "both") && invoice.phone) {
      await sendInvoiceSMS({
        phoneNumber:   invoice.phone,
        clientName:    invoice.client_name,
        paymentToken:  invoice.payment_token ?? invoice.id,
        invoiceTotal:  total,
      });
    }

    toast.success("Invoice sent successfully");
    navigate("/invoices");

    // Post-send Stripe setup reminder (500ms delay, matching swift-slate)
    setTimeout(() => {
      const p = profile as any;
      const isConfigured = !!(p?.stripe_account_id && p?.stripe_onboarding_completed);
      if (!isConfigured) {
        toast("Set up Stripe to receive online payments", {
          description: "Your clients will be able to pay directly from the invoice link.",
          duration: 7000,
          action: { label: "Set up", onClick: () => initiateOnboarding() },
        });
      }
    }, 500);
  };

  // ── Delivery options ────────────────────────────────────────────────────────

  const deliveryOptions = [
    {
      value: "email",
      title: <><Mail className="w-4 h-4" /> Email Delivery</>,
      description: <>Send PDF to{" "}<span className="font-medium text-foreground">{invoice.email}</span></>,
      detail: "PDF Attachment • Professional Format",
    },
    {
      value: "sms",
      title: <><Phone className="w-4 h-4" /> SMS Delivery</>,
      description: <>Send invoice link to{" "}<span className="font-medium text-foreground">{invoice.phone}</span></>,
      detail: "Invoice Link • Quick Access",
    },
    {
      value: "both",
      title: <><Mail className="w-4 h-4" /><Phone className="w-4 h-4" /> Email + SMS</>,
      description: "Send via both email and SMS for maximum reach",
      detail: "Maximum Reach • Dual Delivery",
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">

      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold flex-1">Invoice Preview</h1>
        <Badge
          style={{
            backgroundColor: `${statusColor}22`,
            color: statusColor,
            borderColor: `${statusColor}55`,
          }}
          className="font-semibold text-xs border"
        >
          {invoice.status}
        </Badge>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-6">

        {/* ── Delivery method ──────────────────────────────────────────── */}
        <DeliveryMethodSelector
          options={deliveryOptions}
          value={deliveryMethod}
          onChange={setDeliveryMethod}
          error={deliveryError}
        />

        {/* ── Invoice preview card ──────────────────────────────────────── */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">

            {/* Header band */}
            <div className="bg-primary px-6 py-5 flex items-start justify-between">
              <div>
                {profile?.company_logo && (
                  <img
                    src={profile.company_logo}
                    alt="Logo"
                    className="h-10 w-10 object-contain mb-2 rounded"
                  />
                )}
                <p className="text-primary-foreground font-bold text-sm">
                  {profile?.company_name ?? ""}
                </p>
                <p className="text-primary-foreground/70 text-xs mt-0.5">
                  {profile?.company_phone ?? ""}
                </p>
                <p className="text-primary-foreground/70 text-xs">
                  {profile?.company_email ?? ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-primary-foreground text-2xl font-extrabold tracking-widest">
                  INVOICE
                </p>
                <p className="text-primary-foreground/80 text-xs mt-1">
                  {invoice.invoice_number}
                </p>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* Dates + title row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Issue Date</p>
                  <p className="text-sm font-medium">
                    {formatDateOnly(invoice.invoice_date, "MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Due Date</p>
                  <p className="text-sm font-medium">
                    {formatDateOnly(invoice.due_date, "MMM d, yyyy")}
                  </p>
                </div>
                {invoice.invoice_name && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Invoice Title</p>
                    <p className="text-sm font-medium">{invoice.invoice_name}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Bill To */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Bill To
                </p>
                <p className="text-sm font-semibold">{invoice.client_name}</p>
                {invoice.company_name && (
                  <p className="text-xs text-muted-foreground">{invoice.company_name}</p>
                )}
                <p className="text-xs text-muted-foreground">{invoice.email}</p>
                <p className="text-xs text-muted-foreground">{invoice.phone}</p>
              </div>

              <Separator />

              {/* Line items */}
              <div>
                <div className="grid grid-cols-12 gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-2 border-b border-border">
                  <span className="col-span-6">Description</span>
                  <span className="col-span-2 text-right">Price</span>
                  <span className="col-span-1 text-right">Qty</span>
                  <span className="col-span-3 text-right">Total</span>
                </div>
                {lineItemsError ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 col-span-12">
                    <p className="text-sm font-medium text-destructive">Unable to load line items</p>
                    <p className="text-xs text-muted-foreground mt-1">{lineItemsError}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {lineItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-1 py-2.5 text-sm">
                        <span className="col-span-6">{item.description}</span>
                        <span className="col-span-2 text-right text-muted-foreground">
                          ${item.price.toFixed(2)}
                        </span>
                        <span className="col-span-1 text-right text-muted-foreground">
                          {item.qty}
                        </span>
                        <span className="col-span-3 text-right font-medium">
                          ${item.total.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-1.5 ml-auto max-w-[220px]">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {discAmt > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Discount</span>
                    <span>-${discAmt.toFixed(2)}</span>
                  </div>
                )}
                {taxAmt > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                    <span>${taxAmt.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center bg-primary text-primary-foreground rounded-md px-3 py-2 mt-2">
                  <span className="text-sm font-bold">Total Due</span>
                  <span className="text-base font-bold">${formatCurrency(total)}</span>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Notes
                    </p>
                    <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="border-t border-border pt-4 text-center space-y-0.5">
                <p className="text-xs font-semibold text-primary">
                  Thank you for your business!
                </p>
                <p className="text-xs text-muted-foreground">{profile?.company_phone ?? ""}</p>
                <p className="text-xs text-muted-foreground">{profile?.company_email ?? ""}</p>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Footer — match CreateInvoicePage (sm buttons, card bar, max-w-2xl) ─ */}
      <div className="sticky bottom-0 w-full max-w-2xl mx-auto px-4 pb-6">
        <div className="bg-white rounded-lg border p-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
            disabled={isBusy}
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSend} disabled={isBusy}>
              {isBusy ? "Sending..." : "Send Invoice"}
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
