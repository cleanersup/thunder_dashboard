import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * AuthGuard — wraps protected routes.
 * Checks for an active Supabase session on mount and subscribes to auth state changes.
 * Redirects unauthenticated users to /auth while preserving the intended destination.
 *
 * @param children - Protected content to render when authenticated
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          navigate("/auth", { replace: true, state: { from: location } });
          return;
        }
        setIsAuthenticated(true);
      } catch {
        navigate("/auth", { replace: true, state: { from: location } });
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setIsAuthenticated(false);
        queryClient.clear(); // Clear cache on logout to prevent cross-user data leaks
        navigate("/auth", { replace: true });
      } else {
        if (event === "SIGNED_IN") {
          queryClient.clear(); // Clear stale cache on login so fresh data is always fetched
        }
        setIsAuthenticated(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location, queryClient]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
}
