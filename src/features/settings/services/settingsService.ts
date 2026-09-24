/**
 * @module settingsService
 * CRUD operations for user profile and security settings.
 */

import { supabase } from "@/integrations/supabase/client";
import type { EditProfileFormData, EditCompanyFormData } from "../schemas/settingsSchemas";

// ─── Personal Info ────────────────────────────────────────────────────────────

export async function updatePersonalInfo(
  userId: string,
  data: EditProfileFormData
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      phone_number: data.phoneNumber,
    })
    .eq("user_id", userId);

  if (error) throw error;
}

// ─── Company Info ─────────────────────────────────────────────────────────────

export async function updateCompanyInfo(
  userId: string,
  data: EditCompanyFormData
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      company_name: data.companyName,
      company_email: data.companyEmail,
      company_phone: data.companyPhone,
      company_address: data.address,
      company_apt_suite: data.aptSuite ?? null,
      company_city: data.city,
      company_state: data.state,
      company_zip: data.zip,
    })
    .eq("user_id", userId);

  if (error) throw error;
}

// ─── Password ─────────────────────────────────────────────────────────────────

export async function updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) throw new Error("No authenticated user");

  // Verify current password first
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) throw new Error("Current password is incorrect");

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) throw updateError;
}

// ─── Logo Upload ──────────────────────────────────────────────────────────────
// Same as swift-slate Profile: store data URL on profiles.company_logo (no Storage bucket).

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
/** Encoded data URLs are ~4/3 of file size; cap PATCH body for typical API/proxy limits. */
const MAX_LOGO_DATA_URL_LENGTH = 5 * 1024 * 1024;

export const LOGO_FILE_TOO_LARGE_MESSAGE = "Image must be smaller than 2MB";
export const LOGO_PAYLOAD_TOO_LARGE_MESSAGE =
  "Image is too large to upload. Try a smaller or more compressed image.";

function isOversizedPayloadError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const o = err as Record<string, unknown>;
  const msg = String(o.message ?? "").toLowerCase();
  const details = String(o.details ?? "").toLowerCase();
  const hint = String(o.hint ?? "").toLowerCase();
  const combined = `${msg} ${details} ${hint}`;
  const status = typeof o.status === "number" ? o.status : undefined;
  return (
    status === 413 ||
    combined.includes("413") ||
    combined.includes("request entity too large") ||
    combined.includes("payload too large") ||
    combined.includes("content too large")
  );
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read image"));
      }
    };
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

export async function uploadLogo(userId: string, file: File): Promise<string> {
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error(LOGO_FILE_TOO_LARGE_MESSAGE);
  }

  const logoDataUrl = await readFileAsDataURL(file);

  if (logoDataUrl.length > MAX_LOGO_DATA_URL_LENGTH) {
    throw new Error(LOGO_PAYLOAD_TOO_LARGE_MESSAGE);
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ company_logo: logoDataUrl })
    .eq("user_id", userId);

  if (updateError) {
    if (isOversizedPayloadError(updateError)) {
      throw new Error(LOGO_PAYLOAD_TOO_LARGE_MESSAGE);
    }
    throw updateError;
  }

  return logoDataUrl;
}

// ─── Public Profile ───────────────────────────────────────────────────────────

export async function fetchPublicProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
