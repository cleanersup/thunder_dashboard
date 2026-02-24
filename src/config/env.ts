/**
 * Type-safe environment configuration.
 * All env vars are validated at startup. Missing required vars throw at runtime.
 */

/**
 * Reads and validates a required environment variable.
 * @param key - The environment variable key
 * @returns The environment variable value
 * @throws Error if the variable is not defined
 */
function requireEnv(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  supabase: {
    url: requireEnv("VITE_SUPABASE_URL"),
    publishableKey: requireEnv("VITE_SUPABASE_PUBLISHABLE_KEY"),
    projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "",
  },
  app: {
    url: import.meta.env.VITE_PUBLIC_APP_URL ?? window.location.origin,
  },
  stripe: {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
  },
  maps: {
    googleApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "",
    mapboxToken: import.meta.env.VITE_MAPBOX_TOKEN ?? "",
  },
  recaptcha: {
    siteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? "",
  },
  features: {
    disableSubscriptions: import.meta.env.VITE_DISABLE_SUBSCRIPTIONS === "true",
  },
} as const;
