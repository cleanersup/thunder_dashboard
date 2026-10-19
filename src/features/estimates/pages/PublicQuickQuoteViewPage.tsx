import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { env } from "@/config/env";

/**
 * Public quick quote link from SMS and email.
 * Opens the PDF immediately. The file is served inline by download-estimate-pdf.
 *
 * Route: /public/quick-quote/:token
 */
export function PublicQuickQuoteViewPage() {
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
      <p className="text-muted-foreground">Opening quote...</p>
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
