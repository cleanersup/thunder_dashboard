import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { env } from "@/config/env";

/**
 * Supabase client instance for Thunder Dashboard (web-only).
 * Uses localStorage for session persistence — no Capacitor adapter needed.
 *
 * Import this wherever Supabase access is needed:
 * @example import { supabase } from "@/integrations/supabase/client";
 */
export const supabase = createClient<Database>(env.supabase.url, env.supabase.publishableKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
