/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { fetchEstimateProfile } from "../services/estimatesService";
import { fetchQuickQuoteByToken } from "../services/quickQuoteService";
import { PDFService } from "@/shared/services/pdf.service";
import { formatDateOnly } from "@/shared/utils/formatters";

/**
 * Public quick quote view — no auth. Same PDF viewer as estimates, but loaded
 * via `get_public_quick_quote` so `/public/estimate/:token` is untouched.
 *
 * Route: /public/quick-quote/:token
 */
export function PublicQuickQuoteViewPage() {
  const { token }  = useParams<{ token: string }>();
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError("Invalid token"); setLoading(false); return; }

    (async () => {
      try {
        const quote = await fetchQuickQuoteByToken(token);
        if (!quote) { setError("Quote not found"); setLoading(false); return; }

        const profile = await fetchEstimateProfile(quote.user_id);

        const doc = await PDFService.generateEstimatePDF({
          companyLogo:    profile?.company_logo    ?? undefined,
          companyName:    profile?.company_name    ?? "",
          companyPhone:   profile?.company_phone   ?? "",
          companyEmail:   profile?.company_email   ?? "",
          companyAddress: profile?.company_address ?? "",
          companyCity:    profile?.company_city    ?? "",
          companyState:   profile?.company_state   ?? "",
          companyZip:     profile?.company_zip     ?? "",
          clientName:     quote.recipient_name     ?? "",
          clientPhone:    quote.recipient_phone    ?? "",
          clientEmail:    quote.recipient_email    ?? "",
          clientAddress:  "",
          clientCity:     "",
          clientState:    "",
          clientZip:      "",
          estimateNumber: quote.id.substring(0, 8).toUpperCase(),
          estimateDate:   formatDateOnly(quote.quote_date, "MMMM dd, yyyy"),
          serviceType:    quote.service_type,
          serviceSubType: quote.service_sub_type ?? undefined,
          serviceScope:   quote.service_scope   ?? undefined,
          mainData:       (quote.main_data       as Record<string, any>) ?? undefined,
          additionalData: (quote.additional_data as Record<string, any>) ?? undefined,
          extraServices:  (quote.extra_services  as Record<string, boolean>) ?? undefined,
          subtotal:       quote.subtotal,
          discountType:   quote.discount_type   ?? undefined,
          discountValue:  quote.discount_value  ?? undefined,
          total:          quote.total,
        });

        const blob    = doc.output("blob");
        const blobUrl = URL.createObjectURL(blob);
        window.location.href = blobUrl;

        setLoading(false);
      } catch (err: any) {
        console.error("Error loading quick quote:", err);
        setError(err.message ?? "Failed to load quote");
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading quote...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <h1 className="text-2xl font-bold">Error</h1>
        <p className="text-muted-foreground text-center">{error}</p>
      </div>
    );
  }

  return null;
}

export default PublicQuickQuoteViewPage;
