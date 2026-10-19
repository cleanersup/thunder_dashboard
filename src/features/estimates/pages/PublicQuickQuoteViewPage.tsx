/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { fetchEstimateProfile } from "../services/estimatesService";
import { fetchQuickQuoteByToken } from "../services/quickQuoteService";
import { PDFService, type EstimatePDFData } from "@/shared/services/pdf.service";
import { formatDateOnly } from "@/shared/utils/formatters";
import { EstimateSheetView } from "../components/EstimateSheetView";
import { Button } from "@/shared/components/ui/button";

/**
 * Public quick quote view — no auth.
 * The sheet matches the emailed PDF and stacks on a phone.
 *
 * Route: /public/quick-quote/:token
 */
export function PublicQuickQuoteViewPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<EstimatePDFData | null>(null);

  useEffect(() => {
    if (!token) { setError("Invalid token"); setLoading(false); return; }

    let cancelled = false;

    (async () => {
      try {
        const quote = await fetchQuickQuoteByToken(token);
        if (!quote) { setError("Quote not found"); setLoading(false); return; }

        const profile = await fetchEstimateProfile(quote.user_id);
        if (cancelled) return;

        setSheet({
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
          documentTitle:  "PROFESSIONAL CLEANING QUOTE",
          numberLabel:    "Quote #",
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
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        console.error("Error loading quick quote:", err);
        setError(err.message ?? "Failed to load quote");
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  const download = async () => {
    if (!sheet) return;
    setDownloading(true);
    try {
      const doc = await PDFService.generateEstimatePDF(sheet);
      PDFService.downloadFromDoc(doc, `Quote_${sheet.estimateNumber}.pdf`);
    } catch (err) {
      console.error("Error downloading quote PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading quote...</p>
      </div>
    );
  }

  if (error || !sheet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <h1 className="text-2xl font-bold">Error</h1>
        <p className="text-muted-foreground text-center">{error ?? "Quote not found"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted pb-8">
      <div className="sticky top-0 z-10 flex justify-end border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:px-6">
        <Button size="sm" onClick={download} disabled={downloading}>
          {downloading && <Loader2 className="h-4 w-4 animate-spin" />}
          Download PDF
        </Button>
      </div>
      <EstimateSheetView data={sheet} />
    </div>
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Staging links are `/{quoteId}` — ignore anything that is not a UUID. */
export function PublicQuickQuoteByIdPage() {
  const { token } = useParams<{ token: string }>();
  if (!UUID_RE.test(token ?? "")) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h1 className="text-4xl font-bold text-muted-foreground">404</h1>
        <p className="text-muted-foreground">Page not found</p>
      </div>
    );
  }
  return <PublicQuickQuoteViewPage />;
}

export default PublicQuickQuoteViewPage;
