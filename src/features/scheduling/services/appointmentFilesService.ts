/**
 * @module appointmentFilesService
 * Supabase Storage operations for route appointment files (contracts + photos).
 * Extracted from AddAppointmentPage to respect the architecture rule:
 * pages never call Supabase directly — all storage access goes through services.
 */
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "route-files";

function generatePath(userId: string, ext: string): string {
  return `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

/**
 * Uploads a single contract/estimate file.
 * @returns The storage path of the uploaded file.
 * @throws If the user is not authenticated or the upload fails.
 */
export async function uploadContractFile(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in to upload files");

  const ext  = file.name.split(".").pop() ?? "pdf";
  const path = generatePath(user.id, ext);

  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw new Error("Failed to upload contract");

  return path;
}

/**
 * Uploads multiple photo files in parallel.
 * Silently skips individual files that fail (consistent with previous behaviour).
 * @returns Array of successfully uploaded storage paths.
 * @throws If the user is not authenticated.
 */
export async function uploadAppointmentPhotos(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in to upload files");

  const results = await Promise.all(
    files.map(async (file) => {
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = generatePath(user.id, ext);
      const { error } = await supabase.storage.from(BUCKET).upload(path, file);
      return error ? null : path;
    }),
  );

  return results.filter((p): p is string => p !== null);
}
