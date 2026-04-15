/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module PublicInvoicePaymentPage
 * Unauthenticated public page for client invoice payment via Stripe.
 * Uses `public-invoice-payment-profile` so anon clients can see Stripe flags (RLS hides profiles from anon).
 */
import { useState } from "react";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { useParams } from "react-router-dom";
import {
  CheckCircle, CreditCard, Loader2, Calendar, FileText, DollarSign,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button }            from "@/shared/components/ui/button";
import { toast }             from "sonner";
import { supabase }          from "@/integrations/supabase/client";
import { useQuery }          from "@tanstack/react-query";
import { formatCurrency, formatDateOnly } from "@/shared/utils/formatters";
import {
  fetchInvoiceByIdForPublic,
  fetchPublicInvoicePaymentProfile,
} from "../services/invoicesService";
import { QK } from "@/shared/config/queryKeys";

export function PublicInvoicePaymentPage() {
  const { id } = useParams<{ id: string }>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete] = useState(false);
  const [saveCardForFuture, setSaveCardForFuture] = useState(false);

  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: QK.publicInvoice(id!),
    queryFn: () => fetchInvoiceByIdForPublic(id!),
    enabled: !!id,
  });

  const needsPaymentProfile =
    !!invoice?.id && invoice.status !== "Draft";

  const {
    data: paymentProfile,
    isLoading: profileLoading,
    isError: profileError,
    error: profileErrObj,
  } = useQuery({
    queryKey: QK.publicInvoicePaymentProfile(id!),
    queryFn: () => fetchPublicInvoicePaymentProfile(id!),
    enabled: !!id && needsPaymentProfile,
    staleTime: 5 * 60_000,
  });

  const displayCompanyName = paymentProfile?.company_name ?? invoice?.company_name ?? null;
  const displayLogo = paymentProfile?.company_logo ?? null;

  const handlePayment = async () => {
    if (!invoice || !paymentProfile) {
      toast.error("Payment options are still loading. Please wait a moment and try again.");
      return;
    }
    setIsProcessing(true);

    try {
      if (!paymentProfile.stripe_account_id || !paymentProfile.stripe_onboarding_completed) {
        throw new Error(
          "Payment processing is not available for this merchant. Please contact them directly.",
        );
      }

      const hasDiscount = (invoice.discount_value ?? 0) !== 0;
      const rawItems    = (invoice.line_items ?? []) as any[];

      const lineItems =
        rawItems.length > 0 && !hasDiscount
          ? rawItems.map((item: any) => ({
              name:        item.description ?? "Service",
              description: item.description,
              amount:      Math.round((item.price ?? 0) * 100),
              quantity:    parseInt(item.qty ?? "1") || 1,
            }))
          : [
              {
                name:        invoice.invoice_name ?? invoice.service_type ?? "Invoice Payment",
                description: `Invoice #${invoice.invoice_number}`,
                amount:      Math.round(invoice.total * 100),
                quantity:    1,
              },
            ];

      const { data, error } = await supabase.functions.invoke("stripe-create-checkout", {
        body: {
          lineItems,
          customerEmail: invoice.email,
          savePaymentMethod: saveCardForFuture,
          metadata: {
            invoice_id:       invoice.id,
            invoice_number:   invoice.invoice_number,
            customer_name:    invoice.client_name,
            merchant_user_id: invoice.user_id,
          },
          connectedAccountId: paymentProfile.stripe_account_id,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No payment URL returned");

      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message ?? "There was an error processing your payment.");
      setIsProcessing(false);
    }
  };

  if (invoiceLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Invoice not found</h2>
            <p className="text-muted-foreground">
              This invoice is not available or the link has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invoice.status === "Draft") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Invoice not ready</h2>
            <p className="text-muted-foreground">
              This invoice is not available for payment yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (needsPaymentProfile && profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (needsPaymentProfile && (profileError || !paymentProfile)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-2">
            <h2 className="text-xl font-bold mb-2">Could not load payment page</h2>
            <p className="text-muted-foreground text-sm">
              {(profileErrObj as Error)?.message ?? "Please refresh the page or contact the business."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invoice.status === "Paid" || paymentComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            {displayLogo && (
              <img
                src={displayLogo}
                alt={displayCompanyName ?? "Company"}
                className="h-16 w-16 object-contain mx-auto"
              />
            )}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: "hsl(var(--green-vibrant) / 0.1)" }}
            >
              <CheckCircle className="w-10 h-10" style={{ color: "hsl(var(--green-vibrant))" }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Payment Complete!</h2>
              <p className="text-3xl font-bold text-primary mt-2">
                ${formatCurrency(invoice.total)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Thank you for your payment to{" "}
              <strong>{displayCompanyName ?? "our company"}</strong>.
              A confirmation will be sent to {invoice.email}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canSaveCard =
    !!paymentProfile?.stripe_account_id && !!paymentProfile?.stripe_onboarding_completed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-5">
          {displayLogo && (
            <div className="flex justify-center">
              <img
                src={displayLogo}
                alt={displayCompanyName ?? "Company"}
                className="h-16 w-16 object-contain"
              />
            </div>
          )}
          {displayCompanyName && (
            <h1 className="text-xl font-bold text-center">{displayCompanyName}</h1>
          )}

          <div className="space-y-2 bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Invoice</span>
              <span className="text-sm font-semibold ml-auto">{invoice.invoice_number}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Due Date</span>
              <span className="text-sm font-semibold ml-auto">
                {formatDateOnly(invoice.due_date, "MMMM d, yyyy")}
              </span>
            </div>
            {invoice.service_type && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Service</span>
                <span className="text-sm font-semibold ml-auto">{invoice.service_type}</span>
              </div>
            )}
          </div>

          <Card
            className="border-2"
            style={{ borderColor: "hsl(var(--primary))" }}
          >
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total Amount</span>
              </div>
              <p className="text-4xl font-bold text-primary mt-1">
                ${formatCurrency(invoice.total)}
              </p>
            </CardContent>
          </Card>

          {invoice.notes && (
            <p className="text-sm text-muted-foreground text-center">{invoice.notes}</p>
          )}

          {canSaveCard && (
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
              <Checkbox
                id="save-card-future"
                checked={saveCardForFuture}
                onCheckedChange={(v) => setSaveCardForFuture(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="save-card-future" className="text-sm font-normal leading-snug cursor-pointer">
                Save this card for future payments
              </Label>
            </div>
          )}

          <Button
            className="w-full h-12 text-base"
            onClick={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay ${formatCurrency(invoice.total)}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By clicking &quot;Pay&quot;, you agree to process this payment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
