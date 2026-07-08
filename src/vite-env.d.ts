/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID: string;
  readonly VITE_PUBLIC_APP_URL: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_RECAPTCHA_SITE_KEY: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  readonly VITE_MAPBOX_TOKEN: string;
  readonly VITE_DISABLE_SUBSCRIPTIONS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
