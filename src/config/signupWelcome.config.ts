/**
 * Signup welcome SMS/email are sent by the `send-signup-welcome` edge function.
 * Edit marketing copy and links in:
 * `thunder_supabase/supabase/functions/send-signup-welcome/welcomeCopy.ts`
 */
export const SIGNUP_WELCOME_EDGE_FUNCTION = "send-signup-welcome" as const;
