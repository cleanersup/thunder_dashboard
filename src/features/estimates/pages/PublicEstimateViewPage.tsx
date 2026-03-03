import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { fetchEstimateByToken, fetchEstimateProfile } from "../services/estimatesService";
import { PDFService } from "@/shared/services/pdf.service";
import { format } from "date-fns";

/**
 * Public estimate view page — accessible without authentication.
 * Fetches the estimate by its public share token, generates a PDF, and
 * redirects the browser to the PDF blob URL for immediate viewing/download.
 *
 * Route: /public/estimate/:token
 */
export function PublicEstimateViewPage() {
  const { token }  = useParams<{ token: string }>();
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError("Invalid token"); setLoading(false); return; }

    (async () => {
      try {
        const estimate = await fetchEstimateByToken(token);
        if (!estimate) { setError("Estimate not found"); setLoading(false); return; }

        const profile = await fetchEstimateProfile(estimate.user_id);

        const doc = await PDFService.generateEstimatePDF({
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
          estimateDate:   format(new Date(estimate.estimate_date), "MMMM dd, yyyy"),
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

        // Redirect browser to PDF blob URL
        const blob    = doc.output("blob");
        const blobUrl = URL.createObjectURL(blob);
        window.location.href = blobUrl;

        setLoading(false);
      } catch (err: any) {
        console.error("Error loading estimate:", err);
        setError(err.message ?? "Failed to load estimate");
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading estimate...</p>
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

export default PublicEstimateViewPage;
