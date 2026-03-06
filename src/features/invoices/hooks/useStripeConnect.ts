/**
 * @module useStripeConnect
 * Web-only port of swift-slate useStripeConnect.ts.
 * Removes all Capacitor deps — uses window.open() and navigator.clipboard.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateCheckoutParams {
  lineItems: { name: string; description?: string; amount: number; quantity: number }[];
  customerId?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  applicationFeeAmount?: number;
}

export function useStripeConnect() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function initiateOnboarding() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error("Not authenticated");

      const { data, error: fnError } = await supabase.functions.invoke("stripe-onboard", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (fnError) throw fnError;
      if (!data?.url) throw new Error("No onboarding URL returned");

      window.open(data.url, "_blank");
      toast.success("Abriendo configuración de Stripe...");
      return data;
    } catch (err: any) {
      const msg = err?.message ?? "Error al iniciar Stripe onboarding";
      setError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function openStripeDashboard() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error("Not authenticated");

      const { data, error: fnError } = await supabase.functions.invoke("stripe-dashboard-link", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (fnError) throw fnError;
      if (!data?.url) throw new Error("No dashboard URL returned");

      window.open(data.url, "_blank");
      toast.success("Abriendo panel de Stripe...");
    } catch (err: any) {
      const msg = err?.message ?? "Error al abrir Stripe Dashboard";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function createCheckoutSession(params: CreateCheckoutParams, autoShare = false) {
    setLoading(true);
    setError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error("Not authenticated");

      const { data, error: fnError } = await supabase.functions.invoke("stripe-create-checkout", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: params,
      });
      if (fnError) throw fnError;
      if (!data?.url) throw new Error("No checkout URL returned");

      if (autoShare) await sharePaymentLink(data.url);
      toast.success("Enlace de pago creado exitosamente");
      return data;
    } catch (err: any) {
      const msg = err?.message ?? "Error al crear sesión de pago";
      setError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function sharePaymentLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado al portapapeles");
    } catch (err: any) {
      toast.error("No se pudo compartir el enlace");
      throw err;
    }
  }

  return { loading, error, initiateOnboarding, openStripeDashboard, createCheckoutSession, sharePaymentLink };
}
