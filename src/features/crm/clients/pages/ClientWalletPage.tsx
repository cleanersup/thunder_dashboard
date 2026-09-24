import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, CreditCard, Loader2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WalletCard {
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
}

interface ClientWallet {
  companyName: string | null;
  companyLogo: string | null;
  client: {
    fullName: string;
    company: string | null;
    email: string;
  };
  cards: WalletCard[];
  stripeReady: boolean;
}

async function fetchClientWallet(token: string): Promise<ClientWallet> {
  const { data, error } = await supabase.functions.invoke("client-wallet-get", {
    body: { token },
  });

  if (error) throw error;
  if (!data?.client) throw new Error("Wallet link is invalid or expired");

  return data as ClientWallet;
}

export function ClientWalletPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [isStartingSetup, setIsStartingSetup] = useState(false);

  const setupStatus = searchParams.get("setup");

  const { data, isLoading, error } = useQuery({
    queryKey: ["client-wallet", token],
    queryFn: () => fetchClientWallet(token!),
    enabled: !!token,
  });

  const handleSetupCard = async () => {
    if (!token) return;
    setIsStartingSetup(true);

    try {
      const { data: setupData, error: setupError } = await supabase.functions.invoke(
        "client-wallet-setup-checkout",
        { body: { token } },
      );

      if (setupError) throw setupError;
      if (!setupData?.url) throw new Error("No Stripe setup URL returned");

      window.location.href = setupData.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start card setup";
      toast.error(message);
      setIsStartingSetup(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-3">
            <XCircle className="h-10 w-10 mx-auto text-destructive" />
            <h1 className="text-xl font-bold">Wallet link unavailable</h1>
            <p className="text-sm text-muted-foreground">
              This payment setup link is invalid or expired. Please contact the business for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const savedCard = data.cards[0];
  const expiry = savedCard?.expMonth && savedCard.expYear
    ? `${String(savedCard.expMonth).padStart(2, "0")}/${String(savedCard.expYear).slice(-2)}`
    : "—";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-5">
          <div className="text-center space-y-3">
            {data.companyLogo && (
              <img
                src={data.companyLogo}
                alt={data.companyName ?? "Company"}
                className="h-16 w-16 object-contain mx-auto"
              />
            )}
            <div>
              <h1 className="text-xl font-bold">{data.companyName ?? "Payment Method"}</h1>
              <p className="text-sm text-muted-foreground">
                Save a card for {data.client.fullName}
              </p>
            </div>
          </div>

          {setupStatus === "complete" && (
            <div className="rounded-lg border border-green-600/30 bg-green-600/10 p-3 flex gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Your card setup is complete. It may take a moment to appear here.</span>
            </div>
          )}

          {setupStatus === "cancel" && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              Card setup was cancelled. You can try again when you are ready.
            </div>
          )}

          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {savedCard
                    ? `${savedCard.brand?.toUpperCase() ?? "CARD"} ending in ${savedCard.last4 ?? "••••"}`
                    : "No card saved yet"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {savedCard ? `Default card · Expires ${expiry}` : data.client.email}
                </p>
              </div>
            </div>
          </div>

          <Button
            className="w-full h-11"
            onClick={handleSetupCard}
            disabled={!data.stripeReady || isStartingSetup}
          >
            {isStartingSetup ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening Stripe...
              </>
            ) : savedCard ? (
              "Update Card"
            ) : (
              "Add Card"
            )}
          </Button>

          {!data.stripeReady && (
            <p className="text-xs text-center text-muted-foreground">
              Online card setup is not available for this business yet.
            </p>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Card details are handled securely by Stripe. Thunder Dashboard never stores your full card number.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
