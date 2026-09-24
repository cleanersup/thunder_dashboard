# Thunder Dashboard

Responsive web application for **Thunder Pro** — a SaaS platform for cleaning service businesses. Manages CRM, estimates, invoices, route scheduling, employee time tracking, and client-facing public forms.

This project is a web migration of the original mobile app ([swift-slate](https://github.com/cleanersup/swift-slate)), using the same Supabase backend (staging + production) with no functional changes.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Routing | React Router v6 (lazy loading) |
| Server state | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| UI components | shadcn/ui + Radix UI |
| Styling | Tailwind CSS v3 |
| Auth / Backend | Supabase (PostgreSQL + Edge Functions) |
| Maps | Mapbox GL |
| Charts | Recharts |
| PDF generation | jsPDF (Blob download) |
| Payments | Stripe (Connect + Billing) |
| Testing | Vitest + React Testing Library |
| CI/CD | GitHub Actions → AWS |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
git clone https://github.com/cleanersup/thunder_dashboard.git
cd thunder_dashboard
npm install
```

### Environment variables

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

```env
VITE_SUPABASE_URL=           # Supabase project URL
VITE_SUPABASE_PUBLISHABLE_KEY=  # Supabase anon/publishable key
VITE_SUPABASE_PROJECT_ID=    # Supabase project ID

VITE_STRIPE_PUBLISHABLE_KEY= # Stripe publishable key (test or live)
VITE_MAPBOX_TOKEN=           # Mapbox GL access token
VITE_GOOGLE_MAPS_API_KEY=    # Google Maps API key
VITE_RECAPTCHA_SITE_KEY=     # reCAPTCHA v2 site key

# Set to true to bypass subscription checks during development
VITE_DISABLE_SUBSCRIPTIONS=true
```

### Development

```bash
npm run dev        # Start dev server at http://localhost:8080
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (port 8080) |
| `npm run build` | Production build |
| `npm run build:staging` | Staging build |
| `npm run preview` | Preview production build locally |
| `npm run typecheck` | TypeScript type check (no emit) |
| `npm run lint` | ESLint — max 0 warnings |
| `npm run format` | Prettier format `src/**/*.{ts,tsx,css}` |
| `npm run test` | Run Vitest test suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run tests with V8 coverage report |

---

## Project Architecture

Feature-based (vertical slices) following SOLID principles. Each feature module owns its components, hooks, services, schemas, and pages.

```
src/
├── app/
│   ├── App.tsx                    # Root component
│   ├── providers.tsx              # All providers composed here
│   └── routes/
│       ├── index.tsx              # Central route definitions (lazy)
│       ├── ProtectedRoute.tsx     # Auth-required + MainLayout wrapper
│       └── PublicRoute.tsx        # Public route wrapper
│
├── features/                      # Business modules (vertical slices)
│   ├── auth/                      # Login, signup, password reset, onboarding
│   ├── dashboard/                 # Home stats, charts, activity feed
│   ├── crm/
│   │   ├── clients/               # Client CRUD
│   │   └── leads/                 # Lead CRUD + pipeline
│   ├── estimates/                 # Residential & commercial estimates
│   ├── invoices/                  # Invoices + Stripe payment
│   ├── scheduling/                # Routes, appointments, Smart Map
│   ├── employees/                 # Employee management + time clock
│   ├── employee-portal/           # Employee-facing self-service portal
│   ├── tasks/                     # Task management
│   ├── booking/                   # Public booking forms
│   ├── walkthroughs/              # Residential & commercial site visits
│   ├── subscriptions/             # Plans, Stripe Billing, paywall context
│   ├── notifications/             # Real-time notification feed
│   └── settings/                  # Profile, company info, security
│
├── shared/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui primitives (do not modify directly)
│   │   ├── layout/                # MainLayout, Sidebar, Header, BottomNav
│   │   └── common/                # PageHeader, DataTable, ConfirmDialog,
│   │                              #   EmptyState, LoadingSpinner, SkeletonCard,
│   │                              #   AuthGuard, FeaturePaywall
│   ├── hooks/                     # useAuth, useProfile, useIsMobile
│   ├── services/                  # Web API abstractions (no Capacitor)
│   │   ├── storage.service.ts     # localStorage wrapper
│   │   ├── geolocation.service.ts # navigator.geolocation wrapper
│   │   ├── pdf.service.ts         # jsPDF → Blob download
│   │   ├── share.service.ts       # Web Share API + clipboard fallback
│   │   └── file.service.ts        # Blob/dataURL download helper
│   ├── types/                     # Shared TypeScript types
│   └── utils/
│       ├── cn.ts                  # Tailwind class merger (clsx + twMerge)
│       └── errorHandler.ts        # Supabase error → user-friendly message
│
├── integrations/
│   └── supabase/
│       ├── client.ts              # Supabase client (web-only, localStorage)
│       └── types.ts               # Auto-generated DB types
│
└── config/
    ├── env.ts                     # Type-safe environment variables
    ├── subscription.config.ts     # Plan tiers, features, pricing
    └── maps.config.ts             # Mapbox constants
```

### Feature module structure

Every feature follows the same internal layout:

```
feature/
├── components/   # Feature-specific UI components
├── hooks/        # Custom hooks (e.g. useClients, useCreateClient)
├── services/     # Business logic + Supabase queries
├── schemas/      # Zod validation schemas
├── types/        # TypeScript types scoped to this feature
└── pages/        # Thin page components (composition only)
```

---

## Responsive Layout

| Viewport | Layout |
|----------|--------|
| Mobile / tablet (< 1024px) | Full-width content + fixed bottom nav with FAB |
| Desktop (≥ 1024px) | Collapsible left sidebar + top header |

---

## Subscription Architecture

Web subscriptions use **Stripe Billing**. Mobile subscriptions continue to use **RevenueCat** (iOS/Android). Both update the same Supabase `profiles` table, which is the **single source of truth** for subscription state across all platforms.

```
Mobile purchase  → RevenueCat webhook  → Supabase (profiles table)
Web purchase     → Stripe webhook      → Supabase (profiles table)
All clients      ←── read from Supabase ───────────────────────────
```

Subscription access is controlled via `FeaturePaywall` and `useSubscription()` (reads from `SubscriptionContext`).

**Plans:**

| Plan | Monthly | Yearly |
|------|---------|--------|
| Basic | $29 | $290 |
| Essential | $79 | $790 |
| Professional | $129 | $1,290 |

New users receive a **14-day Professional trial** (30 days for accounts created before Dec 2025).

---

## Authentication

Handled by **Supabase Auth** with `localStorage` session persistence (web-only — no Capacitor adapter).

- Session checked on mount via `AuthGuard`
- Token auto-refresh enabled
- `onAuthStateChange` subscription active throughout the session
- Unauthenticated access redirects to `/auth` preserving the intended route

---

## CI/CD

Three GitHub Actions workflows:

| Workflow | Trigger | Action |
|----------|---------|--------|
| `ci.yml` | Push / PR to `main` or `develop` | Typecheck + Lint + Test |
| `deploy-staging.yml` | Push to `develop` | Build + Deploy to AWS Staging |
| `deploy-production.yml` | Push to `main` | Build + Deploy to AWS Production |

Environment variables per environment are stored in **GitHub Secrets** (scoped to `staging` and `production` GitHub Environments).

> AWS deploy steps (S3 sync + CloudFront invalidation) are commented in the workflow files pending AWS hosting type confirmation.

---

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — protected, requires PR + CI pass |
| `develop` | Staging — integration branch, all features merge here first |
| `feature/*` | Feature branches off `develop` |
| `fix/*` | Bug fix branches off `develop` (or `main` for hotfixes) |

---

## Related Projects

| Project | Description |
|---------|-------------|
| `swift-slate` | Original mobile app (React + Capacitor). Source of business logic. |
| `thunder-web-version` | Previous web UI version. Source of UX/UI design and components. |

---

## Implementation Progress

See [PLAN.md](./PLAN.md) for the full implementation roadmap and per-phase checklists.

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Project setup, CI/CD, folder structure | ✅ Complete |
| 1 | Core infrastructure (auth, layout, subscription context) | ✅ Complete |
| 2 | Design system (shadcn, common components) | ✅ Complete |
| 3 | Authentication flows | Pending |
| 4 | Dashboard | Pending |
| 5 | CRM (clients, leads, tasks, notifications) | Pending |
| 6 | Booking | Pending |
| 7 | Estimates | Pending |
| 8 | Invoices | Pending |
| 9 | Scheduling (routes, appointments, Smart Map) | Pending |
| 10 | Employees + Employee Portal | Pending |
| 11 | Walkthroughs | Pending |
| 12 | Settings (profile, company, security) | Pending |
| 13 | Subscriptions (Stripe Billing) | Pending |
| 14 | Cross-cutting web services audit | Pending |
| 15 | SOLID / code quality audit | Pending |
| 16 | Testing | Pending |
| 17 | CI/CD + deployment finalization | Pending |
