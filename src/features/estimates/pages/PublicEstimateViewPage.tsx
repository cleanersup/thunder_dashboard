/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { fetchEstimateByToken, fetchEstimateProfile } from "../services/estimatesService";
import { PDFService, type EstimatePDFData } from "@/shared/services/pdf.service";
import { formatDateOnly } from "@/shared/utils/formatters";
import { EstimateSheetView } from "../components/EstimateSheetView";
import { Button } from "@/shared/components/ui/button";

/**
 * Public estimate view — no auth.
 * Same sheet as the emailed PDF, readable on a phone.
 *
 * Route: /public/estimate/:token
 */
export function PublicEstimateViewPage() {
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
        const estimate = await fetchEstimateByToken(token);
        if (!estimate) { setError("Estimate not found"); setLoading(false); return; }

        const profile = await fetchEstimateProfile(estimate.user_id);
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
          clientName:     estimate.client_name,
          clientPhone:    estimate.phone,
          clientEmail:    estimate.email,
          clientAddress:  estimate.address,
          clientApt:      estimate.apt             ?? undefined,
          clientCity:     estimate.city,
          clientState:    estimate.state,
          clientZip:      estimate.zip,
          estimateNumber: estimate.id.substring(0, 8).toUpperCase(),
          estimateDate:   formatDateOnly(estimate.estimate_date, "MMMM dd, yyyy"),
          serviceType:    estimate.service_type,
          serviceSubType: estimate.service_sub_type ?? undefined,
          serviceScope:   estimate.service_scope   ?? undefined,
          mainData:       (estimate.main_data       as Record<string, any>) ?? undefined,
          additionalData: (estimate.additional_data as Record<string, any>) ?? undefined,
          extraServices:  (estimate.extra_services  as Record<string, boolean>) ?? undefined,
          subtotal:       estimate.subtotal,
          discountType:   estimate.discount_type   ?? undefined,
          discountValue:  estimate.discount_value  ?? undefined,
          total:          estimate.total,
        });
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        console.error("Error loading estimate:", err);
        setError(err.message ?? "Failed to load estimate");
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
      PDFService.downloadFromDoc(doc, `Estimate_${sheet.estimateNumber}.pdf`);
    } catch (err) {
      console.error("Error downloading estimate PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading estimate...</p>
      </div>
    );
  }

  if (error || !sheet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <h1 className="text-2xl font-bold">Error</h1>
        <p className="text-muted-foreground text-center">{error ?? "Estimate not found"}</p>
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

export default PublicEstimateViewPage;
