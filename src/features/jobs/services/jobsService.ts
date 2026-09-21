/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";
import { geocodeAddress, type GeoCoords } from "@/shared/services/googleMaps.service";

// jobs table is not in local Supabase types — use supabase as any for all jobs queries
const db = supabase as any;

function isMissingSiteCoordColumn(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "PGRST204" && /site_latitude|site_longitude/.test(error.message ?? "");
}

function withoutSiteCoords(payload: Record<string, unknown>): Record<string, unknown> {
  const next = { ...payload };
  delete next.site_latitude;
  delete next.site_longitude;
  return next;
}
import {
  type Job,
  type DbJob,
  type DbLineItem,
  type JobServiceItem,
  type JobStatus,
  type CreateJobInput,
  type UpdateJobInput,
  type RecurringScope,
  dbToJob,
  jobStatusToDb,
  normalizeJobEmployeeIds,
} from "../types/job.types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function discountTypeToDb(t: string | null): "amount" | "percent" {
  if (t === "percentage") return "percent";
  if (t === "amount") return "amount";
  return "amount";
}

type DepositInput = {
  applyDeposit?: boolean;
  depositType?: string | null;
  depositValue?: number | null;
  depositAmount?: number;
};

function mapDepositFieldsToDb(target: Record<string, unknown>, input: DepositInput): void {
  const hasDeposit =
    input.applyDeposit === true ||
    (input.depositValue != null && input.depositValue > 0) ||
    (input.depositAmount != null && input.depositAmount > 0);

  target.deposit_required = hasDeposit;
  target.deposit_type = discountTypeToDb(hasDeposit ? (input.depositType ?? "amount") : null);
  target.deposit_value = hasDeposit ? (input.depositValue ?? input.depositAmount ?? 0) : 0;
}

function lineItemsToDb(items: JobServiceItem[]): DbLineItem[] {
  return items.map((item) => ({
    name:        item.name,
    quantity:    item.quantity,
    unit_price:  item.unitPrice,
    description: "",
  }));
}

async function fetchPropertyAddress(propertyId: string) {
  const { data } = await (supabase as any)
    .from("client_properties")
    .select("street, apt_suite, city, state, zip_code")
    .eq("id", propertyId)
    .single();
  if (!data) return {};
  return {
    propertyStreet: data.street,
    propertyApt:    data.apt_suite ?? null,
    propertyCity:   data.city,
    propertyState:  data.state,
    propertyZip:    data.zip_code,
  };
}

interface SiteAddress {
  propertyStreet?: string | null;
  propertyCity?:   string | null;
  propertyState?:  string | null;
  propertyZip?:    string | null;
}

/**
 * Resolves the job-site coordinates the employee app geofences against on clock-in.
 * Without them the app has no site to fence and blocks clock-in ("Couldn't verify
 * the job site location"), and the backend skips its own geofence check. The apt/
 * suite is left out on purpose — unit numbers degrade geocoding accuracy.
 *
 * @param addr - Property address fields resolved for the job
 * @returns Coordinates, or `null` when there is no address or it can't be resolved
 */
async function resolveSiteCoords(addr: SiteAddress): Promise<GeoCoords | null> {
  const cityLine = [addr.propertyCity, addr.propertyState].filter(Boolean).join(", ");
  const address  = [addr.propertyStreet, cityLine, addr.propertyZip].filter(Boolean).join(", ");
  if (!address) return null;

  const coords = await geocodeAddress(address);
  if (!coords) console.warn(`Could not geocode job site address: "${address}"`);
  return coords;
}

async function fetchContactForJob(
  clientId: string | null,
  leadId: string | null,
  fallbackName: string,
) {
  if (clientId) {
    const { data } = await supabase
      .from("clients")
      .select("full_name, email, phone, service_street, service_apt, service_city, service_state, service_zip")
      .eq("id", clientId)
      .single();
    if (data) {
      return {
        clientName:    data.full_name,
        clientEmail:   data.email,
        clientPhone:   data.phone,
        propertyStreet: data.service_street,
        propertyApt:    data.service_apt ?? null,
        propertyCity:   data.service_city,
        propertyState:  data.service_state,
        propertyZip:    data.service_zip,
      };
    }
  }
  if (leadId) {
    const { data } = await supabase
      .from("leads")
      .select("full_name, email, phone, address, apt_suite, city, state, zip_code")
      .eq("id", leadId)
      .single();
    if (data) {
      return {
        clientName:    data.full_name,
        clientEmail:   data.email,
        clientPhone:   data.phone,
        propertyStreet: data.address,
        propertyApt:    data.apt_suite ?? null,
        propertyCity:   data.city,
        propertyState:  data.state,
        propertyZip:    data.zip_code,
      };
    }
  }
  return {
    clientName: fallbackName, clientEmail: "", clientPhone: "",
    propertyStreet: "", propertyApt: null,
    propertyCity: "", propertyState: "", propertyZip: "",
  };
}

/**
 * Arma el payload DB (snake_case) con solo los campos presentes en `updates`.
 * Compartido por update() (job suelto) y updateRecurring() (serie vía RPC).
 *
 * Devuelve también `newSiteAddress` cuando la propiedad cambió, para que quien
 * llame re-geocodifique: si la dirección se mueve y las coordenadas no, la app de
 * empleados haría geofence contra la propiedad anterior.
 */
async function buildJobUpdatePayload(
  updates: UpdateJobInput,
  propertyId?: string | null,
): Promise<{ partial: Record<string, unknown>; newSiteAddress: SiteAddress | null }> {
  const partial: Record<string, unknown> = {};
  let newSiteAddress: SiteAddress | null = null;

  if (propertyId) {
    const propAddr = await fetchPropertyAddress(propertyId);
    if (propAddr.propertyStreet !== undefined) partial.property_street = propAddr.propertyStreet;
    if (propAddr.propertyApt !== undefined)    partial.property_apt    = propAddr.propertyApt;
    if (propAddr.propertyCity !== undefined)   partial.property_city   = propAddr.propertyCity;
    if (propAddr.propertyState !== undefined)  partial.property_state  = propAddr.propertyState;
    if (propAddr.propertyZip !== undefined)    partial.property_zip    = propAddr.propertyZip;
    newSiteAddress = propAddr;
  }

  if (updates.clientId !== undefined)    partial.client_id      = updates.clientId;
  if (updates.leadId !== undefined)      partial.lead_id        = updates.leadId;
  if (updates.contactType !== undefined) partial.contact_type   = updates.contactType;
  if (updates.serviceType !== undefined) partial.service_type   = updates.serviceType;
  if (updates.isRecurring !== undefined) {
    partial.job_type = updates.isRecurring ? "recurring" : "one_time";
    partial.selected_week_days =
      updates.isRecurring && updates.recurrenceFrequency === "weekly" ? (updates.weekDays ?? []) : [];
    if (updates.isRecurring) {
      partial.recurring_interval = updates.repeatEvery ?? null;
      partial.recurring_end_date = updates.recurringEndDate ?? null;
    }
  }
  if (updates.recurrenceFrequency !== undefined) partial.recurring_frequency = updates.recurrenceFrequency;
  if (updates.serviceDuration !== undefined)
    partial.recurring_duration = updates.serviceDuration != null ? String(updates.serviceDuration) : null;
  if (updates.serviceDurationUnit !== undefined) partial.recurring_duration_unit = updates.serviceDurationUnit;
  if (updates.jobDate !== undefined)      partial.scheduled_date  = updates.jobDate;
  if (updates.startTime !== undefined)    partial.start_time      = updates.startTime || null;
  if (updates.endTime !== undefined)      partial.end_time        = updates.endTime || null;
  if (updates.services !== undefined)     partial.line_items      = lineItemsToDb(updates.services);
  if (updates.jobDetails !== undefined)   partial.service_details = updates.jobDetails ?? "";
  if (updates.notes !== undefined)        partial.internal_notes  = updates.notes;
  if (updates.employeeIds !== undefined)  partial.assigned_employees = normalizeJobEmployeeIds(updates.employeeIds);
  if (updates.subtotal !== undefined)     partial.subtotal        = updates.subtotal;

  if (updates.applyDiscount !== undefined || updates.discountType !== undefined || updates.discountValue !== undefined) {
    const apply = updates.applyDiscount ?? false;
    partial.discount_type  = discountTypeToDb(apply ? (updates.discountType ?? null) : null);
    partial.discount_value = apply ? (updates.discountValue ?? 0) : 0;
  }
  if (updates.applyTax !== undefined || updates.taxRate !== undefined) {
    partial.tax_type  = "percent";
    partial.tax_value = (updates.applyTax ?? false) ? (updates.taxRate ?? 0) : 0;
  }

  const depositTouched =
    updates.applyDeposit !== undefined ||
    updates.depositType !== undefined ||
    updates.depositValue !== undefined ||
    updates.depositAmount !== undefined;
  if (depositTouched) {
    mapDepositFieldsToDb(partial, {
      applyDeposit:  updates.applyDeposit,
      depositType:   updates.depositType,
      depositValue:  updates.depositValue,
      depositAmount: updates.depositAmount,
    });
  }

  return { partial, newSiteAddress };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const jobsService = {
  /**
   * Fetches all jobs for the authenticated user, ordered by date and start time.
   */
  async fetchAll(): Promise<Job[]> {
    const { data, error } = await db
      .from("jobs")
      .select("*")
      .order("scheduled_date", { ascending: true })
      .order("start_time",     { ascending: true });
    if (error) throw error;
    return (data as DbJob[]).map(dbToJob);
  },

  /**
   * Fetches a single job by ID.
   * @param id - The job UUID
   */
  async fetchById(id: string): Promise<Job | null> {
    const { data, error } = await db
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return dbToJob(data as DbJob);
  },

  /**
   * Creates a new job as draft. Call updateStatus() to publish it.
   * @param input - Job creation data
   * @param propertyId - Optional client property ID (overrides default service address)
   */
  async create(input: CreateJobInput, propertyId?: string | null): Promise<Job> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const contact = await fetchContactForJob(input.clientId, input.leadId, input.clientName);
    if (propertyId) {
      const propAddr = await fetchPropertyAddress(propertyId);
      Object.assign(contact, propAddr);
    }
    if (input.propertyStreet) {
      contact.propertyStreet = input.propertyStreet;
      contact.propertyApt    = input.propertyApt ?? null;
      contact.propertyCity   = input.propertyCity ?? "";
      contact.propertyState  = input.propertyState ?? "";
      contact.propertyZip    = input.propertyZip ?? "";
    }

    const payload: Record<string, unknown> = {
      user_id:               user.id,
      client_id:             input.clientId ?? null,
      lead_id:               input.contactType === "lead" ? (input.leadId ?? null) : null,
      contact_type:          input.contactType ?? "client",
      client_name:           contact.clientName,
      client_email:          contact.clientEmail || null,
      client_phone:          contact.clientPhone || null,
      property_street:       contact.propertyStreet || null,
      property_apt:          contact.propertyApt,
      property_city:         contact.propertyCity || null,
      property_state:        contact.propertyState || null,
      property_zip:          contact.propertyZip || null,
      assigned_employees:    normalizeJobEmployeeIds(input.employeeIds),
      service_type:          input.serviceType,
      job_type:              input.isRecurring ? "recurring" : "one_time",
      recurring_frequency:   input.isRecurring ? input.recurrenceFrequency : null,
      recurring_duration:    input.isRecurring && input.serviceDuration != null
                               ? String(input.serviceDuration)
                               : null,
      recurring_duration_unit: input.isRecurring ? input.serviceDurationUnit : null,
      selected_week_days:    input.isRecurring && input.recurrenceFrequency === "weekly"
                               ? (input.weekDays ?? [])
                               : [],
      // Columnas del modelo nuevo — solo se envían en recurrentes (evita romper one-time antes de la migración).
      ...(input.isRecurring
        ? { recurring_interval: input.repeatEvery ?? null, recurring_end_date: input.recurringEndDate ?? null }
        : {}),
      scheduled_date:        input.jobDate,
      start_time:            input.startTime || null,
      end_time:              input.endTime || null,
      line_items:            lineItemsToDb(input.services),
      service_details:       input.jobDetails ?? "",
      internal_notes:        input.notes ?? null,
      subtotal:              input.subtotal,
      discount_type:         discountTypeToDb(input.applyDiscount ? input.discountType : null),
      discount_value:        input.applyDiscount ? (input.discountValue ?? 0) : 0,
      tax_type:              "percent" as const,
      tax_value:             input.applyTax ? (input.taxRate ?? 0) : 0,
      amount_paid:           0,
      status:                "draft" as const,
      estimate_id:           input.estimateId ?? null,
      walkthrough_id:        input.walkthroughId ?? null,
    };
    mapDepositFieldsToDb(payload, input);

    const coords = await resolveSiteCoords(contact);
    if (coords) {
      payload.site_latitude  = coords.lat;
      payload.site_longitude = coords.lng;
    }

    const { data, error } = await db
      .from("jobs")
      .insert(payload)
      .select()
      .single();
    if (error && isMissingSiteCoordColumn(error) && ("site_latitude" in payload || "site_longitude" in payload)) {
      const { data: retryData, error: retryError } = await db
        .from("jobs")
        .insert(withoutSiteCoords(payload))
        .select()
        .single();
      if (retryError) throw retryError;
      return dbToJob(retryData as DbJob);
    }
    if (error) throw error;
    return dbToJob(data as DbJob);
  },

  /**
   * Updates status of a job and triggers status-change email when cancelled.
   * @param id - Job UUID
   * @param status - New status
   */
  async updateStatus(id: string, status: JobStatus): Promise<Job> {
    const { data: current, error: fetchErr } = await db
      .from("jobs")
      .select("status")
      .eq("id", id)
      .single();
    if (fetchErr) throw fetchErr;

    const previousStatus = (current as { status: string }).status;
    const newStatusDb = jobStatusToDb(status);

    const { data, error } = await db
      .from("jobs")
      .update({ status: newStatusDb })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    if (newStatusDb === "cancelled") {
      const { error: emailErr } = await supabase.functions.invoke("send-job-status-emails", {
        body: { jobId: id, newStatus: newStatusDb, previousStatus, clientChannel: "email" },
      });
      if (emailErr) console.error("send-job-status-emails failed:", emailErr);
    }

    return dbToJob(data as DbJob);
  },

  /**
   * Updates editable fields of a job (excluding status).
   * @param id - Job UUID
   * @param updates - Partial update payload
   * @param propertyId - Optional property to override service address
   */
  async update(id: string, updates: UpdateJobInput, propertyId?: string | null): Promise<Job> {
    const { partial, newSiteAddress } = await buildJobUpdatePayload(updates, propertyId);

    if (newSiteAddress) {
      // Address changed: re-geocode. On failure the old coordinates must go too,
      // or the employee app would geofence against the previous property.
      const coords = await resolveSiteCoords(newSiteAddress);
      partial.site_latitude  = coords?.lat ?? null;
      partial.site_longitude = coords?.lng ?? null;
    } else {
      // Same address: fill in coordinates for jobs saved before geocoding existed.
      const { data: current, error: currentErr } = await db
        .from("jobs")
        .select("property_street, property_city, property_state, property_zip, site_latitude")
        .eq("id", id)
        .single();
      if (!currentErr && current && current.site_latitude == null) {
        const coords = await resolveSiteCoords({
          propertyStreet: current.property_street,
          propertyCity:   current.property_city,
          propertyState:  current.property_state,
          propertyZip:    current.property_zip,
        });
        if (coords) {
          partial.site_latitude  = coords.lat;
          partial.site_longitude = coords.lng;
        }
      }
    }

    const { data, error } = await db
      .from("jobs")
      .update(partial)
      .eq("id", id)
      .select()
      .single();
    if (error && isMissingSiteCoordColumn(error) && ("site_latitude" in partial || "site_longitude" in partial)) {
      const { data: retryData, error: retryError } = await db
        .from("jobs")
        .update(withoutSiteCoords(partial))
        .eq("id", id)
        .select()
        .single();
      if (retryError) throw retryError;
      return dbToJob(retryData as DbJob);
    }
    if (error) throw error;
    return dbToJob(data as DbJob);
  },

  /**
   * Permanently deletes a job.
   * @param id - Job UUID
   */
  async delete(id: string): Promise<void> {
    const { error } = await db.from("jobs").delete().eq("id", id);
    if (error) throw error;
  },

  /**
   * Cancels a recurring job group via the DB function.
   * @param jobId - The parent or child job UUID
   */
  async cancelGroup(jobId: string): Promise<void> {
    const { error } = await (supabase as any).rpc("cancel_recurring_job_series", { p_job_id: jobId });
    if (error) throw error;

    const { error: emailErr } = await supabase.functions.invoke("send-job-status-emails", {
      body: { jobId, newStatus: "cancelled", previousStatus: "upcoming", clientChannel: "email" },
    });
    if (emailErr) console.error("send-job-status-emails failed:", emailErr);
  },

  // ─── Recurrentes por alcance — RPC única `manage_recurring_job` ──────────────
  // Nunca hacer update/delete directo sobre una serie: siempre vía esta RPC, que
  // el backend usa para editar/borrar/cancelar según el scope y regenerar futuras.

  /** Edita una serie recurrente según el alcance (backend regenera futuras si cambia el patrón). */
  async updateRecurring(
    id: string,
    updates: UpdateJobInput,
    propertyId: string | null | undefined,
    scope: RecurringScope,
  ): Promise<void> {
    const { partial: payload, newSiteAddress } = await buildJobUpdatePayload(updates, propertyId);
    if (newSiteAddress) {
      // Misma regla que update(): si la dirección cambia, las coordenadas viejas no
      // pueden quedarse o el geofence de la app de empleados apuntaría a la anterior.
      const coords = await resolveSiteCoords(newSiteAddress);
      payload.site_latitude  = coords?.lat ?? null;
      payload.site_longitude = coords?.lng ?? null;
    }
    // Campos no soportados por el payload de la RPC (obsoletos / no editables por scope).
    delete payload.job_type;
    delete payload.recurring_duration;
    delete payload.recurring_duration_unit;
    const { error } = await db.rpc("manage_recurring_job", {
      p_job_id: id,
      p_action: "update",
      p_scope:  scope,
      p_payload: payload,
    });
    if (error) throw error;
  },

  /** Elimina una serie recurrente según el alcance. */
  async deleteRecurring(jobId: string, scope: RecurringScope): Promise<void> {
    const { error } = await db.rpc("manage_recurring_job", {
      p_job_id: jobId,
      p_action: "delete",
      p_scope:  scope,
      p_payload: {},
    });
    if (error) throw error;
  },

  /** Cancela una serie recurrente según el alcance. */
  async cancelRecurring(jobId: string, scope: RecurringScope): Promise<void> {
    const { error } = await db.rpc("manage_recurring_job", {
      p_job_id: jobId,
      p_action: "cancel",
      p_scope:  scope,
      p_payload: {},
    });
    if (error) throw error;
  },
};
