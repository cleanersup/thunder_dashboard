# Thunder Dashboard — where to work

Owner web app for cleaning companies. Production host: `https://dashboard.thunderpro.co`. Staging host: `https://staging.thunderpro.co`.

This is the app to change for owner workflows on the web. Business rules and visible copy come from `swift-slate`. Layout patterns already used here win over copying the phone screens. Shared data and email/SMS/PDF links live in `thunder_supabase`. Do not edit that repo unless the task is a server link, a PDF the customer opens, or a schema change the user asked for.

Longer implementation rules are in `CLAUDE.md`. This file is the map. Step-by-step behavior, and every email and SMS, are in `FEATURES.md`. Read that file before changing a flow or a message. The function that sends the message is in `thunder_supabase`.

## How a change is split

| Kind of change | Edit here | Also edit |
|---|---|---|
| Screen, form, list, button the owner uses on the web | Yes | `swift-slate` only if the phone app must match |
| Wording | Match the string already in `swift-slate` | Do not invent a new label |
| Download PDF inside the dashboard | Yes. The browser draws the PDF | The edge function, or the phone download stays old |
| Email button or quick-quote SMS | No. The server builds that link | `thunder_supabase` |
| Estimate SMS | Yes. `buildEstimatePublicUrl` in `estimatesService.ts` | `send-estimate-sms` only pastes the URL the app sends |
| Invoice SMS | Yes. `useSendInvoiceSMS.ts` | `send-invoice-sms` rewrites a payment URL into the PDF URL |
| Customer payment page | `PublicInvoicePaymentPage` | Do not turn this page into a PDF. Pay stays here |

## Layers

| Layer | Path | Put here |
|---|---|---|
| Route | `src/app/routes/index.tsx` | Which page opens |
| Page | `src/features/<feature>/pages/` | State, hooks, layout. No Supabase calls |
| UI | `src/features/<feature>/components/` | Props in, callbacks out |
| Hook | `src/features/<feature>/hooks/` | React Query and edge-function calls |
| Service | `src/features/<feature>/services/` | Supabase and RPC |
| Shared UI | `src/shared/components/` | Used by more than one feature |
| Query keys | `src/shared/config/queryKeys.ts` | `QK.*` only |

Typecheck with `npx tsc --noEmit -p tsconfig.app.json`. A bare `npx tsc --noEmit` checks nothing.

## Features

| Feature | Routes | Code |
|---|---|---|
| Auth | `/auth`, `/forgot-password`, `/reset-password`, `/verify-email` | `src/features/auth/` |
| Home | `/home` | `src/features/dashboard/` |
| Clients and properties | `/clients` | `src/features/crm/clients/` |
| Leads | `/leads` | `src/features/crm/leads/` |
| Tasks | `/tasks` | `src/features/tasks/` |
| Requests (bookings) | `/requests`, `/requests/new`, `/requests/edit` | `src/features/requests/` |
| Public booking form | `/booking/:userId` | `src/features/booking/` |
| Estimates | `/estimates`, `/estimates/new/residential`, `/estimates/new/commercial` | `src/features/estimates/` |
| Quick quotes | Same estimates area | `quickQuoteService.ts`, quote panels |
| Public estimate / quote links | `/public/estimate/:token`, `/public/quick-quote/:token` | Redirect to `download-estimate-pdf`. Do not rebuild the HTML sheet here |
| Dev sheet preview | `/preview/estimate-sheet` (dev only) | `EstimateSheetPreviewPage.tsx`, `EstimateSheetView.tsx` |
| Jobs | `/jobs`, `/jobs/new`, `/jobs/:id` | `src/features/jobs/` |
| Invoices | `/invoices`, `/invoices/new`, `/invoices/:id/edit`, `/invoices/:id/preview` | `src/features/invoices/` |
| Public pay | `/invoice/payment/:token` | Payment page. PDF is a different URL |
| Invoice PDF download | Download button | `src/features/invoices/services/generateInvoicePDF.ts` |
| Estimate / quote PDF download | Download button | `src/shared/services/pdf.service.ts` |
| Schedule and routes | `/create-route`, `/smart-map` | `src/features/scheduling/` |
| Employees | `/employees` | `src/features/employees/` |
| Walkthroughs | `/walkthroughs` and public forms | `src/features/walkthroughs/` |
| Time clock (owner view) | `/time-clock` | `src/features/time-clock/` |
| Contracts | `/contracts` | `src/features/contracts/` |
| Settings | `/profile`, company, security, public contact card | `src/features/settings/` |
| Notifications | `/notifications` | `src/features/notifications/` |
| Subscriptions | Profile tab | `src/features/subscriptions/` — partial, business decisions still open |

## Documents the customer receives

Estimate and quick-quote sheet, and the invoice sheet, share one layout: navy banner, company block with a pipe between street and city, customer column, number block aligned to the right edge of the table, thin table, totals, footer `Service Provide By Thunder Pro Inc` and `www.thunderpro.co`.

- In-app Download uses the generators above.
- Email and SMS open `thunder_supabase` `download-estimate-pdf` or `download-invoice-pdf` with `Content-Disposition: inline`.
- A dashboard-only PDF edit does not change the file a customer opens from a link until that edge function is deployed.

## Do not

- Send the owner country on create/update. Read it with `useOwnerCountry()`.
- Use `<Input type="number">`. Use text plus `numericInput.ts`.
- Call Supabase from a page.
- Put a create form in a centered dialog. Use `FormSheet`, `SectionModal`, or `FullScreenModal` as `CLAUDE.md` specifies.
- Treat `thunder-web-version` as the live app. It is an older UI reference.
