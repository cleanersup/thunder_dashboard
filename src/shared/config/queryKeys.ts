/**
 * @module queryKeys
 * Single source of truth for all React Query cache keys.
 *
 * Usage:
 *   import { QK } from "@/shared/config/queryKeys";
 *   useQuery({ queryKey: QK.employees, queryFn: ... })
 *   useQuery({ queryKey: QK.employee(id), queryFn: ... })
 *   qc.invalidateQueries({ queryKey: QK.employees })
 */

export const QK = {
  // ── Entity lists ────────────────────────────────────────────────────────────
  profile:       ["profile"]        as const,
  activities:    ["activities"]     as const,
  notifications: ["notifications"]  as const,
  clients:       ["clients"]        as const,
  leads:         ["leads"]          as const,
  employees:     ["employees"]      as const,
  employeesAll:  ["employees-all"]  as const,
  estimates:     ["estimates"]      as const,
  invoices:      ["invoices"]       as const,
  bookings:      ["bookings"]       as const,
  bookingForms:  ["booking-forms"]  as const,
  routes:        ["routes"]         as const,
  appointments:  ["appointments"]   as const,
  walkthroughs:  ["walkthroughs"]   as const,
  tasks:         ["tasks"]          as const,

  // ── Entity details ───────────────────────────────────────────────────────────
  employee:    (id: string) => ["employee", id]    as const,
  invoice:     (id: string) => ["invoice", id]     as const,
  estimate:    (id: string) => ["estimate", id]    as const,
  appointment: (id: string) => ["appointment", id] as const,
  walkthrough: (id: string) => ["walkthrough", id] as const,
  client:      (id: string) => ["client", id]      as const,
  lead:        (id: string) => ["lead", id]        as const,

  // ── Public / contextual ──────────────────────────────────────────────────────
  publicProfile: (userId: string) => ["public-profile", userId]       as const,
  publicBooking: (userId: string) => ["public-booking-forms", userId] as const,
  publicInvoice: (id: string)     => ["public-invoice", id]           as const,

  // ── Misc ────────────────────────────────────────────────────────────────────
  todayRoutes:               (date: string) => ["today-routes", date] as const,
  routeAppointmentsByDate:   (routeId: string, date: string) => ["route-appointments-by-date", routeId, date] as const,
  currentUserId:             ["current-user-id"]               as const,
  smartMapLeads:             ["smart-map-leads"]               as const,
  smartMapClients:           ["smart-map-clients"]             as const,
  smartMapEmployees:         ["smart-map-employees"]           as const,
  walkthroughEmployees:      ["walkthrough-employees"]         as const,
  walkthroughForm:           (id: string) => ["walkthrough-form", id]            as const,
  walkthroughFormCommercial: (id: string) => ["walkthrough-form-commercial", id] as const,
  employeesForAppointment:   ["employees-for-appointment"]     as const,
  appointmentEmployees:      (ids: string[]) => ["appointment-employees", ids] as const,
  employeesForWalkthrough:   ["employees-for-walkthrough"]     as const,
  clientsForInvoice:         ["clients-for-invoice"]           as const,
  clientsForEstimate:        ["clients-for-estimate"]          as const,
  leadsForEstimate:          ["leads-for-estimate"]            as const,
  clientsCount:              ["clients-count"]                 as const,
  employeesCount:            ["employees-count"]               as const,
  leadsCount:                ["leads-count"]                   as const,
  bookingsCount:             ["bookings-count"]                as const,

  // ── Contracts (CON) ──────────────────────────────────────────────────────────
  contracts:   ["contracts"] as const,
  contract:    (id: string) => ["contract", id] as const,

  // ── Time Clock (F19) ─────────────────────────────────────────────────────────
  timeEntriesToday:     (date: string) => ["time-entries-today", date]                             as const,
  timeEntriesScheduled: ["time-entries-scheduled"]                                                 as const,
  timeEntriesAll:       (from: string, to: string) => ["time-entries-all", from, to]               as const,
  timeEntriesEmployee:  (id: string, from: string, to: string) => ["time-entries-employee", id, from, to] as const,
  paidPeriods:          (empId: string) => ["paid-periods", empId]                                 as const,
} as const;
