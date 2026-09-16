import posthog from "posthog-js";
import type { User } from "@supabase/supabase-js";
import { env } from "@/config/env";
import { supabase } from "@/integrations/supabase/client";

export const isPostHogEnabled = Boolean(env.posthog.key);

if (isPostHogEnabled) {
  posthog.init(env.posthog.key, {
    api_host: env.posthog.host,
    capture_pageview: "history_change",
    capture_pageleave: true,
    person_profiles: "identified_only",
  });

  posthog.register({
    app: "thunder-dashboard",
    environment: import.meta.env.MODE,
  });
}

function identifyUser(user: User): void {
  if (!isPostHogEnabled) return;

  posthog.identify(user.id, {
    email: user.email,
    role: "owner",
  });
}

/**
 * Keeps the analytics identity aligned with the active Supabase session.
 * Returns an unsubscribe callback for application teardown.
 */
export function setupPostHogAuth(): () => void {
  if (!isPostHogEnabled) return () => undefined;

  void supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) identifyUser(session.user);
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      identifyUser(session.user);
    } else {
      posthog.reset();
      posthog.register({
        app: "thunder-dashboard",
        environment: import.meta.env.MODE,
      });
    }
  });

  return () => subscription.unsubscribe();
}

export { posthog };
