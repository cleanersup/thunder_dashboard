import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

/**
 * Subscribes to Supabase auth state changes and exposes the current user/session.
 * Handles token refresh automatically via Supabase's autoRefreshToken.
 *
 * @returns Current auth state (user, session, isLoading)
 * @example
 * const { user, isLoading } = useAuth();
 * if (!isLoading && !user) redirect('/auth');
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
  });

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ user: session?.user ?? null, session, isLoading: false });
    });

    // Subscribe to subsequent auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, session, isLoading: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
