import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { env } from "@/config/env";

/**
 * Public estimate link from SMS and email.
 * Opens the PDF immediately. The file is served inline by download-estimate-pdf.
 *
 * Route: /public/estimate/:token
 */
export function PublicEstimateViewPage() {
  const { token } = useParams<{ token: string }>();

  useEffect(() => {
    if (!token) return;
    const base = env.supabase.url.replace(/\/$/, "");
    window.location.replace(
      `${base}/functions/v1/download-estimate-pdf?token=${encodeURIComponent(token)}`,
    );
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <h1 className="text-2xl font-bold">Error</h1>
        <p className="text-muted-foreground text-center">Invalid token</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-muted-foreground">Opening estimate...</p>
    </div>
  );
}

export default PublicEstimateViewPage;
