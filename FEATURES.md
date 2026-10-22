# Thunder Dashboard — features

Web app for the owner of a cleaning company. Hosted at `dashboard.thunderpro.co` (production) and `staging.thunderpro.co` (staging).

The owner runs the business from here: people, requests, quotes, jobs, invoices, schedule, and crew time. The same company data is shared with the phone app (`swift-slate`), the employee app, and the customer portal.

One owner serves only the country chosen at signup. Forms do not ask for country again.

## Home

Route: `/home`

The landing screen after login. It shows client count, monthly revenue, pending estimates, and today's routes, plus weekly sales, a revenue chart, pending invoices by month, today's route list, and recent activity.

## Clients

Route: `/clients`

The customer book. A client is a person or company the owner already works with.

The owner can add and edit a client, store more than one property, and keep a contact on each property. Opening a client shows their properties, history, and a way to charge a saved card (wallet). `/crm` and `/leads` redirect here. A lead that is not yet a client is still stored, and a public request can be turned into a client from the request.

## Tasks

Route: `/tasks`

The owner's to-do list. A task has a title, due date, priority, and status. It can be tied to a client. It is not a job and it is not on the crew schedule.

## Requests

Routes: `/requests`, `/requests/new`, `/requests/edit`

A request is someone asking for service. It used to be called a booking. Requests come from the public form or are typed in by the owner.

The owner reviews the contact, address, service, and answers to custom questions, then converts the request into an estimate or a walkthrough. The old `/booking` list redirects here.

Public form: `/booking/:userId`. No login. The visitor submits a request for that company. The server creates the request and emails the visitor. The owner gets an in-app notification.

## Estimates

Routes: `/estimates`, `/estimates/new/residential`, `/estimates/new/commercial`

A priced proposal. Residential and commercial are separate wizards because the questions differ (rooms and home size versus a commercial site).

The owner builds line items, a discount, and an optional deposit, saves a draft, and sends the estimate by email or text. The customer receives a PDF. From the estimate the owner can create a job.

Public link: `/public/estimate/:token`. Opening it shows the PDF, not a web form.

## Quick quotes

Built from the estimate flow without a saved client or address. The owner types a recipient, prices the work, and sends a quote by email or text. The PDF title is a quote, not an estimate. The public link is `/public/quick-quote/:token` and opens the PDF.

## Jobs

Routes: `/jobs`, `/jobs/:id`

A job is scheduled work at a property. It has a status (upcoming, today, in progress, completed, cancelled), a crew, a date, and a site. Jobs can repeat. Completing a job can start an invoice. The customer can be notified when the status changes.

## Invoices

Routes: `/invoices`, `/invoices/new`, `/invoices/:id/edit`, `/invoices/:id/preview`

A bill. It has line items, a discount, tax, a due date, a title, and notes. Status moves through draft, pending, and paid.

The owner sends it by email or text. The email has two actions: pay, and view the PDF. The text message opens the PDF. Recording a payment by card, cash, or check marks it paid and can email a receipt.

Public pay page: `/invoice/payment/:token`. The customer pays with a card through Stripe. This page is not the PDF.

## Schedule and routes

Routes: `/schedule`, `/create-route`, `/create-route/:id/edit`

Schedule is a calendar of jobs and tasks. A route is one day's ordered stops for a crew: the owner adds appointments, assigns employees, and can email or text the appointment.

## Smart map

Route: `/smart-map`

A map of employees and jobs so the owner can see who is where.

## Employees

Route: `/employees`

The crew roster. The owner adds a person, sets the role, phone, and pay, and invites them. The employee then signs into the separate employee app with that phone number. This screen does not clock anyone in.

## Walkthroughs

Routes: `/walkthroughs`, `/walkthroughs/new`, `/walkthroughs/:id/edit`

An on-site inspection before a price is final. Residential and commercial forms ask different questions and can take photos. The owner can send the form, remind the customer, and convert a finished walkthrough into an estimate.

On-site forms: `/walkthrough/residential/:id` and `/walkthrough/commercial/:id`.

## Time clock

Route: `/time-clock`

The owner's view of crew time: who is scheduled, who is clocked in, breaks, and timesheets. The owner can correct a shift. The employee clocks in from the employee app, not from this screen.

## Contracts

Routes: `/contracts` and the public signing page

A service agreement. The owner writes the company description, clauses, and recipient, sends it by email or text, and the customer signs from a public link. Expiring contracts can be renewed.

## Notifications

Route: `/notifications`

In-app alerts for the owner, such as a new request. Unread items can be opened and marked read.

## Settings

| Screen | Route | What it does |
|---|---|---|
| Profile | `/profile` | Account overview and subscription entry |
| Edit profile | `/edit-profile` | The owner's name and contact |
| Company | `/edit-company-info` | Company name, logo, address, phone, and email used on PDFs |
| Security | `/edit-security` | Password |
| Contact card | `/contact-card/:userId` | Public page that downloads the company vCard |
| Privacy | `/privacy` | Privacy text |

## Subscriptions

Route: `/subscription-plans`

Plan tiers are Basic, Essential, and Professional. Each tier includes the previous one. The full menu is always visible. The plan is checked when the owner creates or edits a gated feature. Reading, deleting, sending, and PDFs are not gated. Web billing is not finished. The phone app uses the stores.

## How it works

### Sign up

1. The owner opens `/auth` and enters name, email, password, phone, company, and country. Country is only asked here.
2. The app creates the Supabase Auth user and inserts a `profiles` row.
3. `send-verification-email` sends a code. The owner confirms it on `/verify-email`.
4. `send-signup-welcome` sends the welcome message. An internal notification records the new account.
5. Later visits use email and password. Forgot password calls `send-password-reset-email` and returns through `/reset-password`.

### A visitor asks for service

1. The visitor opens `/booking/:userId` with no account.
2. They submit the form. The app calls `create-booking`. That function saves the request and emails the visitor. The app does not send a second confirmation email.
3. The app inserts an in-app notification for the owner.
4. The owner sees the request on `/requests`.

### The owner types a request and converts it

1. On `/requests/new` the owner fills the same kind of form and can attach files.
2. `create-booking` saves it. The app then uploads files and, if a client was picked, writes `client_id` on the booking.
3. Convert opens `ConvertRequestDialog`. If the person is not a client yet, the dialog resolves or creates the contact.
4. The owner chooses an estimate or a walkthrough. After that record exists, the app calls `finalize_booking_conversion` so the request, contact, and new record stay linked.

### Send an estimate

1. The owner finishes the residential or commercial wizard. A draft is an estimate row with `is_draft` set.
2. Email calls `send-estimate-email` with the estimate id. The server builds the PDF link and the Accept button.
3. Text calls `generate_estimate_share_token`, then `buildEstimatePublicUrl`, then `send-estimate-sms` with that URL. The server pastes the URL into the message. It does not build the estimate link itself.
4. The customer opens the link. `download-estimate-pdf` looks up the share token or the id and returns the PDF inline.
5. Accept calls `accept-estimate`. It does not open the PDF.

### Send a quick quote

1. The owner prices the work without picking a saved client or address.
2. Email calls `send-quick-quote-email`. Text calls `send-quick-quote-sms`.
3. Both links are built on the server and open `download-estimate-pdf`. The sheet title is a quote.
4. Accept calls `accept-quick-quote`.

### Send an invoice and get paid

1. The owner saves the invoice on `/invoices/new` or the edit route, then can preview it.
2. Download inside the dashboard draws the PDF in the browser with `generateInvoicePDF.ts`.
3. Email calls `send-invoice-email`. The message has Pay and Download PDF. Pay goes to `/invoice/payment/:token`. Download goes to `download-invoice-pdf`.
4. Text calls `send-invoice-sms` with a PDF URL. The server also rewrites an older payment URL into that PDF URL. The text does not open the pay page.
5. On the pay page the customer passes reCAPTCHA. The page calls `stripe-create-checkout` with the owner's connected Stripe account and sends the browser to Stripe.
6. `stripe-webhook` marks the invoice paid. A reminder email uses `send-invoice-reminders` and still links to the pay page.

### A job

1. The owner creates a job from scratch or from an estimate. Estimate conversion calls `finalize_estimate_to_job_conversion`.
2. Saving the job geocodes the site through `geocode-address`. A point outside the owner's country is rejected.
3. A status change can call `send-job-status-emails`. Completing a job can start an invoice.
4. Cancelling a repeating series calls `cancel_recurring_job_series`.

### An employee

1. The owner saves the employee on `/employees` and sends an invite with `resend-employee-invitation`.
2. The employee signs into the crew app with that phone. This dashboard only reviews punches on `/time-clock`.

## Email and SMS

The server in `thunder_supabase` sends these. This app only calls the function. The same list is in `thunder_supabase/FEATURES.md`. If the two files disagree, the function code wins, then that file.

### Account

| When | To | Channel | Subject or text | Function |
|---|---|---|---|---|
| Owner signs up | Owner | Email | Verify Your Thunder Pro Email Address | `send-verification-email` |
| Owner signs up | Owner | Email | Welcome to Thunder Pro — schedule your demo | `send-signup-welcome` |
| Owner signs up | Owner | SMS | Hi {name}, this is Javier from Thunder Pro, with a Calendly demo link | `send-signup-welcome` |
| A profile row is created | Thunder Pro internal inbox | Email | New Thunder Pro user registration | `notify-internal-registration` |
| Owner asks to reset a password | Owner | Email | Reset Your Thunder Pro Password | `send-password-reset-email` |

### Requests

`create-booking` calls `send-booking-status-emails` after the row is saved. The app must not send a second confirmation on that same submit.

| When | To | Channel | Subject or text | Function |
|---|---|---|---|---|
| Request is created | Visitor | Email | Request Confirmation - {company} | `send-booking-status-emails` |
| Request is created | Owner | Email | 🎉 New Request - {name} | `send-booking-status-emails` |
| Request is converted | Visitor | Email | Update — your request with {company} | `send-booking-status-emails` |
| Request is converted | Owner | Email | Request converted — {name} | `send-booking-status-emails` |
| Request is cancelled | Visitor / owner | Email | Request cancelled — {company} / Request cancelled — {name} | `send-booking-status-emails` |
| Request is archived | Visitor / owner | Email | Request archived — {company} / Request archived — {name} | `send-booking-status-emails` |
| Request is restored | Visitor / owner | Email | Request restored — {company} / Request restored — {name} | `send-booking-status-emails` |
| Another status change | Visitor / owner | Email | Request update — {company} / Request status {status} — {name} | `send-booking-status-emails` |
| Older booking mail, including a manual resend | Visitor | Email | Booking Confirmation - {company} | `send-booking-emails` |
| Older booking mail | Owner | Email | 🎉 New Lead Request - {name} requesting {service} | `send-booking-emails` |

### Estimates

The owner sends these from the estimate screen. View opens `download-estimate-pdf`. Accept calls `accept-estimate`.

| When | To | Channel | Subject or text | Function |
|---|---|---|---|---|
| First residential send | Customer | Email | Residential Cleaning Estimate - {company} | `send-estimate-email` |
| First commercial send | Customer | Email | Commercial Cleaning Estimate - {company} | `send-estimate-email` |
| Update | Customer | Email | You have an Updated estimate - {company} | `send-estimate-email` |
| First send or update | Owner | Email | An estimate was sent to {client} / An estimate was updated for {client} | `send-estimate-email` |
| First text | Customer | SMS | Hi {name}, your cleaning estimate{total} is ready. View it here: {pdf url} | `send-estimate-sms` |
| Updated text | Customer | SMS | Hi {name}, your cleaning estimate{total} has been updated. View it here: {pdf url} | `send-estimate-sms` |
| Customer accepts | Owner | Email | Estimate accepted — {number} | `accept-estimate` |

Estimate SMS pastes the URL the app already built. The email builds its own PDF link.

### Quick quotes

| When | To | Channel | Subject or text | Function |
|---|---|---|---|---|
| First send | Recipient | Email | Cleaning Quote - {company} | `send-quick-quote-email` |
| Update | Recipient | Email | You have an Updated quote - {company} | `send-quick-quote-email` |
| First send or update | Owner | Email | A quote was sent to {name} / A quote was updated for {name} | `send-quick-quote-email` |
| Text | Recipient | SMS | Hi {name}, your cleaning estimate{total} is ready. View it here: {pdf url} | `send-quick-quote-sms` |
| Updated text | Recipient | SMS | Hi {name}, your cleaning estimate{total} has been updated. View it here: {pdf url} | `send-quick-quote-sms` |
| Recipient accepts | Owner | Email | Quote accepted — {number} | `accept-quick-quote` |

The quote text still says "cleaning estimate". The email subject says Quote. The link is `download-estimate-pdf`. The server ignores a URL sent by the app.

### Invoices

| When | To | Channel | Subject or text | Function |
|---|---|---|---|---|
| Owner sends the invoice | Customer | Email | {company} sent you an invoice | `send-invoice-email` |
| Owner sends an update | Customer | Email | You have an Updated invoice - {company} | `send-invoice-email` |
| Those sends | Owner | Email | Invoice sent to {client} / Invoice updated for {client} | `send-invoice-email` |
| Owner texts the invoice | Customer | SMS | Hi {name}, your invoice{total} is ready. View it here: {pdf url} | `send-invoice-sms` |
| Owner texts an update | Customer | SMS | Hi {name}, your invoice{total} has updates and is ready. View it here: {pdf url} | `send-invoice-sms` |
| Invoice is paid (Stripe checkout, saved card, or `process-invoice-payment`) | Customer | Email | Payment received — Invoice {number} | `send-invoice-email` with `isPaymentConfirmation` |
| Invoice is paid | Owner | Email | Invoice paid: {number} — {client} | `send-invoice-email` with `isPaymentConfirmation` |
| Due today, once a day at 9:00 UTC, or the owner taps Remind | Customer | Email | {company} sent you a invoice reminder | `send-invoice-reminders` |
| That reminder | Owner | Email | A reminder invoice was sent to {client} | `send-invoice-reminders` |

The invoice email has Pay (`/invoice/payment/:token`) and Download PDF (`download-invoice-pdf`). The text opens the PDF. The reminder email keeps Pay Now on the payment page. There is no invoice reminder SMS.

### Jobs

| When | To | Channel | Subject or text | Function |
|---|---|---|---|---|
| Status becomes upcoming, first time | Customer | Email | Your job has been confirmed — {company} | `send-job-status-emails` |
| Status becomes upcoming again | Customer | Email | Your job has been rescheduled — {company} | `send-job-status-emails` |
| Completed | Customer | Email | Your job has been completed — {company}. May include View invoice and pay | `send-job-status-emails` |
| Cancelled | Customer | Email | Your job has been cancelled — {company} | `send-job-status-emails` |
| Any status change | Owner | Email | Job {number} status {status} — {company}, or Job {number} completed | `send-job-status-emails` |
| Assigned, or cancelled | Employee | Email | Job assigned — {number} / Job cancelled — {number} | `send-job-status-emails` |
| Confirmed | Customer | SMS | {company}: Hi {name}, your job is confirmed for {date}. Address: {address} | `send-job-status-sms` |
| Rescheduled | Customer | SMS | {company}: Hi {name}, your job has been rescheduled to {date}. Address: {address} | `send-job-status-sms` |
| Completed | Customer | SMS | {company}: Hi {name}, your job has been completed. Thank you! Payment link when an invoice exists | `send-job-status-sms` |
| Cancelled | Customer | SMS | {company}: Hi {name}, your job scheduled for {date} has been cancelled. | `send-job-status-sms` |
| Estimate or walkthrough becomes a job | Owner | Email | Job created from {source} — {number} | `send-job-conversion-emails` |
| That conversion | Customer | Email | Your {source} was moved to a job with {company} | `send-job-conversion-emails` |
| Day before and day of, 9:00 UTC | Customer | Email | Recordatorio: tu trabajo es mañana/hoy — {company} | `send-job-reminders` |
| Day before and day of, 9:00 UTC | Employee | Email | Recordatorio de trabajo — mañana/hoy — {number} | `send-job-reminders` |
| Assigned, rescheduled, or cancelled | Employee | Email | Job assigned / Job rescheduled / Job cancelled — {number} | `notify-job-employees` |
| Those events, if push is unavailable | Employee | SMS | {company}: You've been assigned {job} / rescheduled / cancelled | `notify-job-employees` |

Job reminder subjects are in Spanish. Other job mail is in English.

### Schedule

| When | To | Channel | Subject or text | Function |
|---|---|---|---|---|
| Owner saves or updates an appointment | Owner | Email | New Service Appointment - {client} / Service Appointment Updated - {client} | `send-appointment-emails` |
| Same | Customer | Email | Service Appointment Confirmation - {date} / Service Appointment Updated - {date} | `send-appointment-emails` |
| Same | Employee | Email | New Service Assignment - {date} / Service Assignment Updated - {date} | `send-appointment-emails` |
| Same | Customer | SMS | Update from {company}: Your job scheduled for {date} has been assigned and is on route… / has been updated. Link is the appointment PDF | `send-appointment-sms` |
| Same | Employee | SMS | New job assigned for {date}! / Job updated for {date}! Plus client, address, service, and the employee app link | `send-appointment-sms` |
| Every day at 8:00 UTC, for today's appointments | Customer | Email | Service Appointment Confirmation - {date} | `send-scheduled-appointment-emails` |
| When the reminder function runs, 24 hours before | Owner | Email | 24-Hour Reminder - Service Tomorrow | `send-appointment-reminders` |
| 24 hours before | Customer | Email | Reminder: Your Service is Tomorrow | `send-appointment-reminders` |
| 24 hours before | Employee | Email | Service Reminder - Tomorrow | `send-appointment-reminders` |
| 1 hour before | Owner | Email | Service Starting Soon - 1 Hour | `send-appointment-reminders` |
| 1 hour before | Customer | Email | We're On Our Way! | `send-appointment-reminders` |

### Walkthroughs

| When | To | Channel | Subject or text | Function |
|---|---|---|---|---|
| Scheduled | Owner and customer | Email | Walkthrough confirmed | `send-walkthrough-confirmation` |
| Scheduled | Customer | SMS | A New walkthrough is scheduled with {employee} on {date} at {time} | `send-walkthrough-confirmation-sms` |
| Rescheduled | Owner and customer | Email | Walkthrough Appointment Updated | `send-walkthrough-update` |
| Rescheduled | Customer | SMS | Update from {company}: Your walkthrough appointment has been rescheduled to {date} at {time} | `send-walkthrough-update-sms` |
| Started | Owner and customer | Email | Good news, the walkthrough has started !! | `send-walkthrough-start` |
| Started | Customer | SMS | Good news! The walkthrough with {employee} has started on {date} at {time} | `send-walkthrough-start-sms` |
| Completed | Owner | Email | Congratulations! Walkthrough Completed | `send-walkthrough-completion` |
| Completed | Customer | Email | Your Estimate is Being Prepared | `send-walkthrough-completion` |
| Completed | Customer | SMS | Thank you! Your walkthrough with {company} has been completed… | `send-walkthrough-completion-sms` |
| Cancelled | Owner and customer | Email | Walkthrough Successfully Cancelled | `send-walkthrough-cancellation` |
| Cancelled | Customer | SMS | We're sorry, but your walkthrough appointment with {company} has been cancelled… | `send-walkthrough-cancellation-sms` |
| Converted to an estimate | Owner | Email | Walkthrough converted — estimate linked | `send-walkthrough-converted` |
| Converted | Customer | Email | Your estimate is on the way | `send-walkthrough-converted` |
| Day before, 9:00 UTC | Owner and customer | Email | Walkthrough reminder - Tomorrow | `send-walkthrough-day-before-reminders` |
| Day before | Owner | SMS | Reminder: Walkthrough with {name} scheduled for tomorrow ({date}) at {time} | `send-walkthrough-day-before-reminders` |
| Day before | Customer | SMS | A New walkthrough is schedule with {employee} on {date} at {time} | `send-walkthrough-day-before-reminders` |
| About 1 hour before (checked every 5 minutes) | Owner and customer | Email | The walkthrough starts in 1 hour. | `send-walkthrough-reminders` |

`send-walkthrough-status-emails` is the switch: it calls the confirmation, completion, cancellation, or converted function for that status.

### Contracts

| When | To | Channel | Subject or text | Function |
|---|---|---|---|---|
| Owner sends the agreement | Customer | Email | Service Agreement - {company} | `send-contract-email` |
| Owner texts it | Customer | SMS | Hi {name}, your service agreement{total} is ready. View and download here: {url} | `send-contract-sms` |
| Owner texts an update | Customer | SMS | Hi {name}, your service agreement{total} has been updated. View and download here: {url} | `send-contract-sms` |
| Customer accepts | Owner | Email | Contract accepted — {number} | `accept-contract` |
| One month before the end date, daily at 9:00 UTC | Owner | Email | Contract {number} expires in one month ({date}) | `process-contract-expirations` |

### Employees and time clock

| When | To | Channel | Subject or text | Function |
|---|---|---|---|---|
| Employee asks for a login code | Employee | SMS | Your verification code is: {code}. This code will expire in 10 minutes. | `send-employee-otp` |
| Owner invites or resends | Employee | SMS | Hi {name}! Welcome to the {company} team. Download the Thunder Pro employee app… | `send-employee-sms` |
| Owner invites or resends | Employee | Email | Welcome to the {company} team | `send-employee-welcome-email` |
| A timesheet is sent | Employee | Email | Your Timesheet - {dates} | `send-timesheet-email` |
| A timesheet is texted | Employee | SMS | Hi {name}, your timesheet is ready. View it here: {pdf url} | `send-timesheet-sms` |
| Clock in on an assigned service | Owner | Email | Service Started | `send-clock-notifications` |
| Clock in on an assigned service | Customer | Email | Your Service Has Started | `send-clock-notifications` |
| Clock out on an assigned service | Owner | Email | Service Completed | `send-clock-notifications` |
| Clock out on an assigned service | Customer | Email | Service Completed - Thank You! | `send-clock-notifications` |
| Clock in with no service | Owner | Email | Employee Clock In - {name} | `send-clock-notifications` |
| Clock out with no service | Owner | Email | Employee Clock Out - {name} | `send-clock-notifications` |

`employee-clock-action` calls `send-clock-notifications`. `resend-employee-invitation` calls the welcome SMS and the welcome email.

### Client portal

| When | To | Channel | Subject or text | Function |
|---|---|---|---|---|
| Customer asks for a login link | Customer | Email | Your Thunder Pro client portal link | `request-client-portal-magic-link` |

The page always answers that a registered email will receive a link. There is no portal SMS.

### Daily sales

| When | To | Channel | Subject or text | Function |
|---|---|---|---|---|
| The report function runs and there are paid invoices that day | Owner | Email | {company} —Your Daily Sales Summary Report | `send-daily-sales-report` |

### Samples

`send-sample-emails`, `send-payment-sample-emails`, `send-sample-walkthrough-emails`, `send-start-walkthrough-samples`, `send-completion-walkthrough-samples`, and `send-cancellation-samples` send preview copies to a test address. They are not a customer flow.

## Documents

Estimates, quick quotes, and invoices share one PDF layout: a navy title bar, the company block, customer details, a number on the right, an item table, totals, and the Thunder Pro footer. Download inside the dashboard draws that file in the browser. The file opened from email or text is drawn by the server.
