/**
 * @module StripeReturnPage
 * OAuth return page after Stripe Connect onboarding.
 * Syncs account status via stripe-check-account edge fn, then redirects to /invoices.
 * Ported from swift-slate StripeReturn.tsx — replaces window.close() with navigate().
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function StripeReturnPage() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [countdown, setCountdown] = useState(5);

  // ── Sync account status on mount ──────────────────────────────────────────
  useEffect(() => {
    supabase.functions.invoke("stripe-check-account")
      .finally(() => setIsChecking(false));
  }, []);

  // ── Countdown + redirect once checking is done ────────────────────────────
  useEffect(() => {
    if (isChecking) return;
    if (countdown <= 0) { navigate("/invoices"); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [isChecking, countdown, navigate]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full text-center space-y-6">
        {isChecking ? (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <div>
              <h1 className="text-xl font-semibold">Verificando cuenta...</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Estamos sincronizando tu cuenta de Stripe.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">¡Configuración completa!</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Tu cuenta de Stripe ha sido conectada exitosamente.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Redirigiendo en {countdown} segundo{countdown !== 1 ? "s" : ""}…
            </p>
          </>
        )}
      </div>
    </div>
  );
}
