import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontSize: {
        sm: ["1rem", { lineHeight: "1.5rem" }],
        base: ["1.125rem", { lineHeight: "1.75rem" }],
        lg: ["1.25rem", { lineHeight: "1.75rem" }],
        xl: ["1.5rem", { lineHeight: "2rem" }],
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // ── Semantic priority tokens ───────────────────────────────────────
        priority: {
          low: {
            DEFAULT: "hsl(var(--priority-low) / <alpha-value>)",
            foreground: "hsl(var(--priority-low-foreground))",
          },
          medium: {
            DEFAULT: "hsl(var(--priority-medium) / <alpha-value>)",
            foreground: "hsl(var(--priority-medium-foreground))",
          },
          high: {
            DEFAULT: "hsl(var(--priority-high) / <alpha-value>)",
            foreground: "hsl(var(--priority-high-foreground))",
          },
        },
        // ── Semantic task-status tokens ────────────────────────────────────
        "task-status": {
          todo: {
            DEFAULT: "hsl(var(--task-status-todo) / <alpha-value>)",
            foreground: "hsl(var(--task-status-todo-foreground))",
          },
          progress: {
            DEFAULT: "hsl(var(--task-status-progress) / <alpha-value>)",
            foreground: "hsl(var(--task-status-progress-foreground))",
          },
          completed: {
            DEFAULT: "hsl(var(--task-status-completed) / <alpha-value>)",
            foreground: "hsl(var(--task-status-completed-foreground))",
          },
        },
        // ── Semantic lead-status tokens ────────────────────────────────────
        "lead-status": {
          new: {
            DEFAULT: "hsl(var(--lead-status-new) / <alpha-value>)",
            foreground: "hsl(var(--lead-status-new-foreground))",
          },
          contacted: {
            DEFAULT: "hsl(var(--lead-status-contacted) / <alpha-value>)",
            foreground: "hsl(var(--lead-status-contacted-foreground))",
          },
          walkthrough: {
            DEFAULT: "hsl(var(--lead-status-walkthrough) / <alpha-value>)",
            foreground: "hsl(var(--lead-status-walkthrough-foreground))",
          },
          estimate: {
            DEFAULT: "hsl(var(--lead-status-estimate) / <alpha-value>)",
            foreground: "hsl(var(--lead-status-estimate-foreground))",
          },
          decision: {
            DEFAULT: "hsl(var(--lead-status-decision) / <alpha-value>)",
            foreground: "hsl(var(--lead-status-decision-foreground))",
          },
        },
        // ── Semantic client-status tokens ──────────────────────────────────
        "client-status": {
          active: {
            DEFAULT: "hsl(var(--client-status-active) / <alpha-value>)",
            foreground: "hsl(var(--client-status-active-foreground))",
          },
          inactive: {
            DEFAULT: "hsl(var(--client-status-inactive) / <alpha-value>)",
            foreground: "hsl(var(--client-status-inactive-foreground))",
          },
        },
        // ── Semantic success (accepted, completed, active states) ──────────
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground))",
          subtle: "hsl(var(--success-subtle) / <alpha-value>)",
          "subtle-foreground": "hsl(var(--success-subtle-foreground))",
          "subtle-border": "hsl(var(--success-subtle-border))",
        },
        // ── Semantic info (notice cards, draft, invoiced states) ───────────
        info: {
          DEFAULT: "hsl(var(--info) / <alpha-value>)",
          foreground: "hsl(var(--info-foreground))",
          subtle: "hsl(var(--info-subtle) / <alpha-value>)",
          "subtle-foreground": "hsl(var(--info-subtle-foreground))",
          "subtle-border": "hsl(var(--info-subtle-border))",
        },
        // ── Semantic warning (pending, in-progress states) ─────────────────
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          foreground: "hsl(var(--warning-foreground))",
          subtle: "hsl(var(--warning-subtle) / <alpha-value>)",
          "subtle-foreground": "hsl(var(--warning-subtle-foreground))",
          "subtle-border": "hsl(var(--warning-subtle-border))",
        },
        // ── Vibrant accent tokens (as Tailwind classes) ────────────────────
        "green-vibrant":  "hsl(var(--green-vibrant) / <alpha-value>)",
        "blue-vibrant":   "hsl(var(--blue-vibrant) / <alpha-value>)",
        "purple-vibrant": "hsl(var(--purple-vibrant) / <alpha-value>)",
        "orange-vibrant": "hsl(var(--orange-vibrant) / <alpha-value>)",
        "yellow-vibrant": "hsl(var(--yellow-vibrant) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
