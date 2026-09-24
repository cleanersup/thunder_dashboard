/**
 * @module dashboard.types
 * TypeScript types scoped to the Dashboard feature.
 */

export type ActivityType =
  | "estimate_created" | "estimate_sent" | "estimate_accepted" | "estimate_canceled"
  | "invoice_created" | "invoice_sent" | "invoice_paid" | "invoice_canceled"
  | "route_created" | "appointment_created" | "appointment_updated"
  | "booking_received" | "booking_updated"
  | "lead_created" | "lead_updated" | "client_created" | "client_updated"
  | "task_created" | "task_completed";

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  timestamp: string;
  estimateNumber?: string;
  invoiceNumber?: string;
  clientName?: string;
  amount?: number;
}

export interface TodayRoute {
  id: string;
  name: string;
  serviceCount: number;
}

export interface SparklinePoint {
  name: string;
  value: number;
  weekSales: number;
  label: string;
}

export interface WeeklySalesPoint {
  name: string;
  sales: number;
  label: string;
}

export interface PendingByMonthPoint {
  name: string;
  count: number;
  total: number;
  fullDate: string;
}
