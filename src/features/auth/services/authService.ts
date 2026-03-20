/**
 * @module authService
 * Authentication service for Thunder Pro web.
 * All calls use the shared Supabase client (localStorage persistence, no Capacitor).
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  companyName?: string;
  companyState: string;
  referralCode?: string;
}

export interface SignUpResult {
  userId: string;
  verificationCode: string;
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Signs in a user with email and password.
 * @param email - User email address
 * @param password - User password
 * @returns Supabase session data
 * @throws {Error} If credentials are invalid or email is not confirmed
 */
export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Registers a new user, creates their profile, and sends a verification email.
 * @param data - User registration data
 * @returns Object with userId and the 6-digit verificationCode (pass to /verify-email)
 * @throws {Error} If signup fails or profile creation fails
 *
 * @example
 * const { verificationCode } = await signUp({ email, password, firstName, ... });
 * navigate("/verify-email", { state: { email, verificationCode } });
 */
export async function signUp(data: SignUpData): Promise<SignUpResult> {
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const redirectUrl = `${window.location.origin}/`;

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        verification_code: verificationCode,
        first_name: data.firstName,
        last_name: data.lastName,
        platform: "web",
      },
    },
  });

  if (error) throw error;
  if (!authData.user) throw new Error("User creation failed");

  // Send verification email via Supabase edge function
  const { error: emailError } = await supabase.functions.invoke("send-verification-email", {
    body: { email: data.email, verificationCode },
  });

  if (emailError) {
    console.error("[authService] Failed to send verification email:", emailError);
  }

  // Create user profile
  const { error: profileError } = await supabase.from("profiles").insert({
    user_id: authData.user.id,
    first_name: data.firstName,
    last_name: data.lastName,
    phone_number: data.phoneNumber,
    company_name: data.companyName ?? null,
    company_state: data.companyState,
    referral_code: data.referralCode ?? null,
    trial_start_date: new Date().toISOString(),
  });

  if (profileError) throw profileError;

  return { userId: authData.user.id, verificationCode };
}

/**
 * Signs out the current user.
 * @throws {Error} If sign-out fails
 */
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Sends a password reset email via the send-password-reset-email edge function.
 * @param email - Email address to send the reset link to
 * @throws {Error} If the edge function returns an error
 */
export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.functions.invoke("send-password-reset-email", {
    body: { email, appUrl: window.location.origin },
  });
  if (error) throw error;
}

/**
 * Updates the authenticated user's password.
 * Requires a valid session (user must have clicked the reset link from email).
 * @param password - New password (minimum 6 characters)
 * @throws {Error} If session is invalid or update fails
 */
export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

/**
 * Generates a new verification code and resends it to the user's email.
 * @param email - Email address to resend to
 * @returns The new 6-digit verification code (update location state with it)
 * @throws {Error} If the edge function fails
 */
export async function resendVerificationEmail(email: string): Promise<string> {
  const newCode = Math.floor(100000 + Math.random() * 900000).toString();
  const { error } = await supabase.functions.invoke("send-verification-email", {
    body: { email, verificationCode: newCode },
  });
  if (error) throw error;
  return newCode;
}
