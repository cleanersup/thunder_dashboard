export type JobStatus =
  | "Draft"
  | "Scheduled"
  | "Upcoming"
  | "Today"
  | "Ongoing"
  | "Completed"
  | "Missed"
  | "Cancelled";

export type JobStatusDb =
  | "draft"
  | "scheduled"
  | "upcoming"
  | "today"
  | "ongoing"
  | "missed"
  | "completed"
  | "cancelled";

export type PaymentStatus =
  | "no_deposit_required"
  | "pending_deposit"
  | "deposit_paid"
  | "balance_due"
  | "payment_completed";

export type JobContactType = "client" | "lead";
export type ServiceType = "residential" | "commercial";
export type RecurrenceFrequency = "daily" | "weekly" | "every_two_weeks" | "monthly";
export type ServiceDurationUnit = "months" | "years";

export interface JobServiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface DbLineItem {
  name: string;
  quantity: number;
  unit_price: number;
  description: string;
}

export interface DbJob {
  id: string;
  user_id: string;
  job_number: string;
  client_id: string | null;
  lead_id: string | null;
  contact_type: "client" | "lead";
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  property_street: string | null;
  property_apt: string | null;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  assigned_employees: string[];
  service_type: string;
  job_type: "one_time" | "recurring";
  recurring_frequency: string | null;
  recurring_duration: string | null;
  recurring_duration_unit: string | null;
  selected_week_days: string[];
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  line_items: DbLineItem[];
  service_details: string;
  internal_notes: string | null;
  subtotal: number;
  discount_type: "amount" | "percent";
  discount_value: number;
  discount_amount: number;
  tax_type: "amount" | "percent";
  tax_value: number;
  tax_amount: number;
  total_amount: number;
  deposit_required: boolean;
  deposit_type: "amount" | "percent";
  deposit_value: number;
  deposit_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: PaymentStatus;
  status: JobStatusDb;
  deposit_invoice_id: string | null;
  invoice_ids: string[];
  parent_job_id: string | null;
  estimate_id: string | null;
  walkthrough_id: string | null;
  route_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  jobNumber: string;
  userId: string;
  clientId: string | null;
  leadId: string | null;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  contactType: JobContactType;
  employeeIds: string[];
  serviceType: ServiceType;
  isRecurring: boolean;
  recurrenceFrequency: RecurrenceFrequency | null;
  serviceDuration: number | null;
  serviceDurationUnit: ServiceDurationUnit | null;
  jobDate: string;
  propertyStreet?: string | null;
  propertyApt?: string | null;
  propertyCity?: string | null;
  propertyState?: string | null;
  propertyZip?: string | null;
  startTime: string;
  endTime: string;
  services: JobServiceItem[];
  subtotal: number;
  applyDiscount: boolean;
  discountType: "percentage" | "amount" | null;
  discountValue: number | null;
  discountAmount: number;
  applyTax: boolean;
  taxRate: number | null;
  taxAmount: number;
  total: number;
  applyDeposit: boolean;
  depositType: "percentage" | "amount" | null;
  depositValue: number | null;
  depositAmount: number;
  balanceDue: number;
  jobDetails: string | null;
  notes: string | null;
  parentJobId: string | null;
  status: Exclude<JobStatus, "Today">;
  estimateId: string | null;
  walkthroughId: string | null;
  invoiceIds: string[];
  depositInvoiceId: string | null;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export type CreateJobInput = Omit<Job, "id" | "jobNumber" | "userId" | "createdAt" | "updatedAt">;
export type UpdateJobInput = Partial<Omit<Job, "id" | "jobNumber" | "userId" | "createdAt">>;

// ─── Pure helper functions ────────────────────────────────────────────────────

export function recurringFrequencyFromDb(freq: string | null): RecurrenceFrequency | null {
  if (!freq) return null;
  const norm = freq.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (["biweekly", "every2weeks", "everytwoweeks", "fortnightly"].includes(norm)) {
    return "every_two_weeks";
  }
  if (["daily", "weekly", "every_two_weeks", "monthly"].includes(norm)) {
    return norm as RecurrenceFrequency;
  }
  return null;
}

export function jobStatusFromDb(s: string): Exclude<JobStatus, "Today"> {
  const map: Record<string, Exclude<JobStatus, "Today">> = {
    draft:     "Draft",
    scheduled: "Scheduled",
    upcoming:  "Upcoming",
    today:     "Upcoming",
    ongoing:   "Ongoing",
    missed:    "Missed",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return map[s] ?? "Draft";
}

export function jobStatusToDb(s: JobStatus): JobStatusDb {
  return s.toLowerCase() as JobStatusDb;
}

export function dbToJob(row: DbJob): Job {
  const discountType = row.discount_value > 0
    ? (row.discount_type === "percent" ? "percentage" : "amount") as "percentage" | "amount"
    : null;

  const hasDeposit =
    Boolean(row.deposit_required) ||
    Number(row.deposit_amount) > 0 ||
    Number(row.deposit_value) > 0;

  const depositType = hasDeposit
    ? (row.deposit_type === "percent" ? "percentage" : "amount") as "percentage" | "amount"
    : null;

  const resolvedDepositAmount = Number(row.deposit_amount) > 0
    ? row.deposit_amount
    : hasDeposit
      ? (row.deposit_type === "percent"
          ? row.total_amount * Number(row.deposit_value) / 100
          : Number(row.deposit_value))
      : 0;

  const services: JobServiceItem[] = (row.line_items ?? []).map((item, i) => ({
    id:         `item-${i}-${row.id}`,
    name:       item.name,
    quantity:   item.quantity,
    unitPrice:  item.unit_price,
    total:      item.quantity * item.unit_price,
  }));

  const status: Exclude<JobStatus, "Today"> = row.status === "today"
    ? "Upcoming"
    : (jobStatusFromDb(row.status) as Exclude<JobStatus, "Today">);

  const depositAmt = Math.round(resolvedDepositAmount * 100) / 100;

  return {
    id:                   row.id,
    jobNumber:            row.job_number,
    userId:               row.user_id,
    clientId:             row.client_id,
    leadId:               row.lead_id,
    clientName:           row.client_name ?? "",
    clientEmail:          row.client_email ?? null,
    clientPhone:          row.client_phone ?? null,
    contactType:          (row.contact_type as JobContactType) ?? "client",
    employeeIds:          Array.isArray(row.assigned_employees) ? row.assigned_employees : [],
    serviceType:          (row.service_type as ServiceType) ?? "residential",
    isRecurring:          row.job_type === "recurring",
    recurrenceFrequency:  recurringFrequencyFromDb(row.recurring_frequency),
    serviceDuration:      row.recurring_duration ? parseInt(row.recurring_duration) : null,
    serviceDurationUnit:  (row.recurring_duration_unit as ServiceDurationUnit) ?? null,
    jobDate:              row.scheduled_date,
    propertyStreet:       row.property_street,
    propertyApt:          row.property_apt,
    propertyCity:         row.property_city,
    propertyState:        row.property_state,
    propertyZip:          row.property_zip,
    startTime:            row.start_time ?? "",
    endTime:              row.end_time ?? "",
    services,
    subtotal:             row.subtotal,
    applyDiscount:        row.discount_value > 0,
    discountType,
    discountValue:        row.discount_value > 0 ? row.discount_value : null,
    discountAmount:       row.discount_amount,
    applyTax:             row.tax_value > 0,
    taxRate:              row.tax_value > 0 ? row.tax_value : null,
    taxAmount:            row.tax_amount,
    total:                row.total_amount,
    applyDeposit:         hasDeposit,
    depositType,
    depositValue:         hasDeposit ? row.deposit_value : null,
    depositAmount:        depositAmt,
    balanceDue:           row.balance_due,
    jobDetails:           row.service_details ?? null,
    notes:                row.internal_notes ?? null,
    parentJobId:          row.parent_job_id ?? null,
    status,
    estimateId:           row.estimate_id,
    walkthroughId:        row.walkthrough_id,
    invoiceIds:           row.invoice_ids ?? [],
    depositInvoiceId:     row.deposit_invoice_id,
    paymentStatus:        row.payment_status,
    createdAt:            row.created_at,
    updatedAt:            row.updated_at,
  };
}

export function jobHasDeposit(
  job: Pick<Job, "applyDeposit" | "depositAmount" | "depositValue">,
): boolean {
  return Boolean(job.applyDeposit) || job.depositAmount > 0 || (job.depositValue ?? 0) > 0;
}

export function getJobDisplayBalanceDue(job: Job): number {
  if (jobHasDeposit(job) && job.depositAmount > 0) {
    return Math.max(job.total - job.depositAmount, 0);
  }
  return job.balanceDue;
}

export function getEffectiveJobStatus(job: Job): JobStatus {
  if (job.status === "Ongoing") return "Today";
  if (job.status === "Upcoming") {
    const todayStr = new Date().toLocaleDateString("en-CA");
    if (job.jobDate === todayStr) return "Today";
  }
  return job.status;
}
