/**
 * @module PublicInvoicePaymentPage
 * Unauthenticated public page for client invoice payment via Stripe.
 * Adapted from swift-slate/src/pages/InvoicePayment.tsx — Capacitor removed.
 */
import { useState, useEffect } from "react";
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
import { fetchInvoiceByIdForPublic } from "../services/invoicesService";
import { QK } from "@/shared/config/queryKeys";

export function PublicInvoicePaymentPage() {
  const { id } = useParams<{ id: string }>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: QK.publicInvoice(id!),
    queryFn: () => fetchInvoiceByIdForPublic(id!),
    enabled: !!id,
  });

  // Mark invoice as viewed — edge fn handles idempotency (only sets viewed_at once)
  useEffect(() => {
    if (!invoice?.id) return;
    supabase.functions.invoke(`mark-viewed?type=invoice&id=${invoice.id}`, {
      method: "GET",
    }).catch(() => {});
  }, [invoice?.id]);

  const { data: profile } = useQuery({
    queryKey: QK.publicProfile(invoice?.user_id ?? ""),
    queryFn: async () => {
      if (!invoice?.user_id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("company_name, company_logo, company_phone, stripe_account_id, stripe_onboarding_completed")
        .eq("user_id", invoice.user_id)
        .single();
      if (error) throw error;
      // Cast to any because stripe_* columns may not be in local type definitions yet
      return data as any as {
        company_name: string | null;
        company_logo: string | null;
        company_phone: string | null;
        stripe_account_id: string | null;
        stripe_onboarding_completed: boolean | null;
      };
    },
    enabled: !!invoice?.user_id,
    staleTime: 5 * 60_000,
  });

  const handlePayment = async () => {
    if (!invoice || !profile) return;
    setIsProcessing(true);

    try {
      if (!profile.stripe_account_id || !profile.stripe_onboarding_completed) {
        throw new Error(
          "Payment processing is not available for this merchant. Please contact them directly."
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
          metadata: {
            invoice_id:       invoice.id,
            invoice_number:   invoice.invoice_number,
            customer_name:    invoice.client_name,
            merchant_user_id: invoice.user_id,
          },
          connectedAccountId: profile.stripe_account_id,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No payment URL returned");

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message ?? "There was an error processing your payment.");
      setIsProcessing(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
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

  // ── Not available for payment ──────────────────────────────────────────────
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

  // ── Already paid ───────────────────────────────────────────────────────────
  if (invoice.status === "Paid" || paymentComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            {profile?.company_logo && (
              <img
                src={profile.company_logo}
                alt={profile.company_name ?? "Company"}
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
              <strong>{profile?.company_name ?? "our company"}</strong>.
              A confirmation will be sent to {invoice.email}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Pending payment ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-5">
          {/* Company header */}
          {profile?.company_logo && (
            <div className="flex justify-center">
              <img
                src={profile.company_logo}
                alt={profile.company_name ?? "Company"}
                className="h-16 w-16 object-contain"
              />
            </div>
          )}
          {profile?.company_name && (
            <h1 className="text-xl font-bold text-center">{profile.company_name}</h1>
          )}

          {/* Invoice details */}
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

          {/* Total amount */}
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

          {/* Notes */}
          {invoice.notes && (
            <p className="text-sm text-muted-foreground text-center">{invoice.notes}</p>
          )}

          {/* Pay button */}
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
            By clicking "Pay", you agree to process this payment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
