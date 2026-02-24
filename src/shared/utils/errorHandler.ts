/**
 * Centralized error handling utilities.
 * Maps Supabase and API errors to user-friendly messages.
 */

/** Known Supabase error codes mapped to readable messages */
const SUPABASE_ERROR_MAP: Record<string, string> = {
  "Invalid login credentials": "Invalid email or password.",
  "Email not confirmed": "Please verify your email before logging in.",
  "User already registered": "An account with this email already exists.",
  "Password should be at least 6 characters": "Password must be at least 6 characters.",
  "JWT expired": "Your session has expired. Please log in again.",
};

/**
 * Converts a raw error into a user-friendly message string.
 * @param error - The caught error (any type)
 * @param fallback - Fallback message if no mapping is found
 * @returns User-friendly error message
 */
export function getErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred. Please try again.",
): string {
  if (!error) return fallback;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);

  return SUPABASE_ERROR_MAP[message] ?? message ?? fallback;
}
