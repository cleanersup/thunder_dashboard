import { useEffect, useMemo, useState } from "react";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { CreditCard, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { env } from "@/config/env";
import {
  useCreateClientCardSetupIntent,
  useFinalizeClientCardSetup,
} from "../hooks/useClients";
import type { Client } from "../../types/crm.types";

interface ClientCardSetupDialogProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CardSetupForm({
  client,
  clientSecret,
  onOpenChange,
}: {
  client: Client;
  clientSecret: string;
  onOpenChange: (open: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const finalizeSetup = useFinalizeClientCardSetup();
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    const card = elements.getElement(CardElement);
    if (!card) return;

    const result = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card,
        billing_details: {
          name: client.full_name,
          email: client.email,
          phone: client.phone,
        },
      },
    });

    if (result.error) {
      setCardError(result.error.message ?? "Card setup failed");
      return;
    }

    const setupIntentId = result.setupIntent?.id;
    if (!setupIntentId) {
      setCardError("Card setup completed, but Stripe did not return a setup intent.");
      return;
    }

    finalizeSetup.mutate(
      { clientId: client.id, setupIntentId },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-3">
        <CardElement
          options={{
            hidePostalCode: false,
            style: {
              base: {
                fontSize: "15px",
                color: "hsl(var(--foreground))",
                "::placeholder": { color: "hsl(var(--muted-foreground))" },
              },
              invalid: { color: "hsl(var(--destructive))" },
            },
          }}
          onChange={(event) => {
            setCardComplete(event.complete);
            setCardError(event.error?.message ?? null);
          }}
        />
      </div>

      {cardError && <p className="text-sm text-destructive">{cardError}</p>}

      <p className="text-xs text-muted-foreground">
        Card details are sent directly to Stripe. Thunder Dashboard only stores the tokenized card reference and card
        summary.
      </p>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={finalizeSetup.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!stripe || !cardComplete || finalizeSetup.isPending}
        >
          {finalizeSetup.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" /> Save Card
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function ClientCardSetupDialog({ client, open, onOpenChange }: ClientCardSetupDialogProps) {
  const createSetupIntent = useCreateClientCardSetupIntent();
  const {
    data: setupData,
    error: setupError,
    isPending: isSetupPending,
    mutate: startSetup,
    reset: resetSetup,
  } = createSetupIntent;

  useEffect(() => {
    if (open && !setupData && !setupError && !isSetupPending) {
      startSetup(client.id);
    }
  }, [client.id, isSetupPending, open, setupData, setupError, startSetup]);

  const stripePromise = useMemo(() => {
    if (!env.stripe.publishableKey || !setupData?.connectedAccountId) return null;

    return loadStripe(env.stripe.publishableKey, {
      stripeAccount: setupData.connectedAccountId,
    });
  }, [setupData?.connectedAccountId]);

  const options = useMemo<StripeElementsOptions | undefined>(() => {
    if (!setupData?.clientSecret) return undefined;

    return { clientSecret: setupData.clientSecret };
  }, [setupData?.clientSecret]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) resetSetup();
  };

  const title = client.stripe_default_payment_method_id ? "Update Client Card" : "Add Client Card";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Enter {client.full_name}'s card details to save a default card for future invoice charges.
          </DialogDescription>
        </DialogHeader>

        {isSetupPending && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isSetupPending && setupError && (
          <div className="space-y-4">
            <p className="text-sm text-destructive">{setupError.message}</p>
            <Button variant="outline" onClick={() => startSetup(client.id)}>
              Try Again
            </Button>
          </div>
        )}

        {!isSetupPending && !setupError && stripePromise && options && (
          <Elements stripe={stripePromise} options={options}>
            <CardSetupForm client={client} clientSecret={options.clientSecret!} onOpenChange={handleOpenChange} />
          </Elements>
        )}

        {!env.stripe.publishableKey && (
          <p className="text-sm text-destructive">
            Stripe publishable key is missing. Add VITE_STRIPE_PUBLISHABLE_KEY to enable card setup.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
