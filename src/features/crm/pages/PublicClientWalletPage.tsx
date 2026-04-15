/**
 * @module PublicClientWalletPage
 * Public route: client views saved card (masked) and can add/replace via Stripe Setup Checkout.
 */
import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CreditCard, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { toast } from "sonner";
import { usePublicClientWallet, useClientWalletSetupCheckout } from "../clients/hooks/useClientWallet";

function formatCard(c: { brand: string | null; last4: string | null; expMonth: number | null; expYear: number | null }) {
  const brand = c.brand ? c.brand.toUpperCase() : "Card";
  const last4 = c.last4 ?? "••••";
  const exp =
    c.expMonth != null && c.expYear != null
      ? `${String(c.expMonth).padStart(2, "0")}/${String(c.expYear).slice(-2)}`
      : "—";
  return { line: `${brand} ···· ${last4}`, exp };
}

export default function PublicClientWalletPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, isError, error, refetch } = usePublicClientWallet(token);
  const setupCheckout = useClientWalletSetupCheckout();

  useEffect(() => {
    const s = searchParams.get("setup");
    if (s === "complete") {
      toast.success("Card saved", { description: "Your payment method on file was updated." });
      void refetch();
      setSearchParams({}, { replace: true });
    } else if (s === "cancel") {
      toast.message("Card setup canceled");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, refetch]);

  if (!token || token.length < 32) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 shadow-none">
          <CardContent className="p-6 text-center text-muted-foreground">
            Invalid wallet link.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 shadow-none">
          <CardContent className="p-6 text-center space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Wallet unavailable</h2>
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message ?? "This link is invalid or has expired. Ask your service provider for a new link."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { companyName, companyLogo, client, cards, stripeReady } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex flex-col items-center p-4 py-10">
      <Card className="w-full max-w-md border-border/50 shadow-none overflow-hidden">
        <div className="bg-primary/90 text-primary-foreground px-6 py-5 text-center">
          {companyLogo ? (
            <img src={companyLogo} alt="" className="h-14 w-auto mx-auto mb-2 object-contain rounded" />
          ) : null}
          <h1 className="text-lg font-semibold">{companyName ?? "Your service provider"}</h1>
          <p className="text-sm text-primary-foreground/90 mt-1">Saved payment methods</p>
        </div>
        <CardContent className="p-6 space-y-5">
          <div className="text-sm text-muted-foreground border-b border-border pb-4">
            <p>
              <span className="text-foreground font-medium">{client.fullName}</span>
              {client.company ? ` · ${client.company}` : ""}
            </p>
            <p className="mt-1">{client.email}</p>
          </div>

          {!stripeReady ? (
            <p className="text-sm text-muted-foreground text-center">
              Online card management is not available for this business yet. Please contact them directly.
            </p>
          ) : (
            <>
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Card on file
                </h2>
                {cards.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No card saved yet. Add a card so future invoices can be paid more easily.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {cards.map((c, i) => {
                      const { line, exp } = formatCard(c);
                      return (
                        <li
                          key={i}
                          className="rounded-lg border border-border bg-muted/20 px-4 py-3 flex justify-between items-center"
                        >
                          <span className="text-sm font-medium text-foreground">{line}</span>
                          <span className="text-xs text-muted-foreground">Exp {exp}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <Button
                className="w-full"
                disabled={setupCheckout.isPending}
                onClick={() => setupCheckout.mutate({ token })}
              >
                {setupCheckout.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening secure form…
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {cards.length === 0 ? "Add card" : "Add or replace card"}
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                You will complete card entry on Stripe&apos;s secure page. Your full card number is never stored on
                Thunder Pro.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
