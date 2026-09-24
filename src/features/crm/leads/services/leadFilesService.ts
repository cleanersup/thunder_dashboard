/**
 * Upload lead attachments to Supabase Storage (route-files bucket, same pattern as scheduling).
 * Paths: {userId}/leads/{leadId}/{timestamp}-{random}-{safeName}
 */
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "route-files";

export interface LeadFileMeta {
  name: string;
  url: string;
  size: number;
  type: string;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "file";
}

/**
 * Uploads files for a lead after the row exists. Persist with updateLead({ files }).
 */
export async function uploadLeadAttachments(leadId: string, files: File[]): Promise<LeadFileMeta[]> {
  if (files.length === 0) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const out: LeadFileMeta[] = [];

  for (const file of files) {
    const safe = sanitizeFilename(file.name);
    const storagePath = `${user.id}/leads/${leadId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safe}`;

    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw new Error(error.message || "Failed to upload file");

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    out.push({
      name: file.name,
      url: pub.publicUrl,
      size: file.size,
      type: file.type || "application/octet-stream",
    });
  }

  return out;
}
