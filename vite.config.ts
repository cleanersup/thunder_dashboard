import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-popover",
            "@radix-ui/react-avatar",
            "@radix-ui/react-label",
          ],
          "query-vendor": ["@tanstack/react-query"],
          "supabase-vendor": ["@supabase/supabase-js"],
          "form-vendor": ["react-hook-form", "zod"],
          "date-vendor": ["date-fns"],
          "pdf-vendor": ["jspdf"],
          "map-vendor": ["mapbox-gl"],
          "chart-vendor": ["recharts"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
