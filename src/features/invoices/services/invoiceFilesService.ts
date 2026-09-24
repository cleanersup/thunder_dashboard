/**
 * Upload invoice attachments to Supabase Storage (route-files bucket).
 * Paths: {userId}/invoices/{invoiceId}/{timestamp}-{random}-{safeName}
 */
import { supabase } from "@/integrations/supabase/client";
import type { InvoiceAttachment } from "../types/invoice.types";

const BUCKET = "route-files";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "file";
}

/**
 * Uploads new attachment files for an invoice.
 * Call after the invoice row exists, then persist with updateInvoice({ attachments }).
 */
export async function uploadInvoiceAttachments(
  invoiceId: string,
  files: File[],
): Promise<InvoiceAttachment[]> {
  if (files.length === 0) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const out: InvoiceAttachment[] = [];

  for (const file of files) {
    const safe = sanitizeFilename(file.name);
    const storagePath = `${user.id}/invoices/${invoiceId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safe}`;

    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw new Error(error.message || "Failed to upload file");

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    out.push({
      name: file.name,
      url:  pub.publicUrl,
      size: file.size,
      type: file.type || "application/octet-stream",
    });
  }

  return out;
}
