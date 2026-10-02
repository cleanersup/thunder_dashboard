/**
 * Formulario de Job — sigue el kit de formularios (`shared/components/forms`),
 * con `RequestForm` como referencia: cada bloque es un `FormSection` y cada
 * control una molécula del kit.
 */
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  X, User, Users, CalendarClock, Package, DollarSign, FileText,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  FormSection, SelectField, DateField, TimeField, TextareaField,
  LineItemsFields, AddLineItemButton, PricingFields,
} from "@/shared/components/forms";
import { FORM_SECTION_GAP } from "@/shared/constants/formTokens";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import { ContactPicker, EMPTY_CONTACT, type ContactPickerValue } from "@/shared/components/common/ContactPicker";
import { EmployeeSelect } from "@/shared/components/common/EmployeeSelect";
import { useJob } from "../hooks/useJobs";
import { useCreateJob, useUpdateJob, useUpdateJobStatus } from "../hooks/useJobMutations";
import type { JobServiceItem, CreateJobInput, RecurrenceFrequency } from "../types/job.types";
import { SERVICE_TYPE_OPTIONS, defaultRecurrenceEnd } from "../config/jobRecurrence";
import { RecurrenceFields } from "../components/RecurrenceFields";
import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";
import { toast } from "sonner";

/** Tipo y valor del descuento/depósito comparten forma: porcentaje o monto. */
const RATE_TYPE_OPTIONS = [
  { value: "percentage", label: "%" },
  { value: "amount",     label: "$" },
] as const;

function newServiceItem(): JobServiceItem {
  return { id: crypto.randomUUID(), name: "", quantity: 1, unitPrice: 0, total: 0 };
}

interface AddJobPageProps {
  open: boolean;
  onClose: () => void;
  jobId?: string | null;
}

export function AddJobPage({ open, onClose, jobId }: AddJobPageProps) {
  const isEdit = !!jobId;
  const navigate = useNavigate();

  const { data: existingJob, isLoading } = useJob(jobId ?? undefined);
  const { mutate: createJob, isPending: creating } = useCreateJob();
  const { mutate: updateJob, isPending: updating } = useUpdateJob();
  const { mutate: updateStatus } = useUpdateJobStatus();

  // ─── Contact ──────────────────────────────────────────────────────────
  const [contact, setContact] = useState<ContactPickerValue>(EMPTY_CONTACT);
  const [selectedProperty, setSelectedProperty] = useState<ClientProperty | null>(null);

  // ─── Employees ────────────────────────────────────────────────────────
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);

  // ─── Schedule ─────────────────────────────────────────────────────────
  const [serviceType, setServiceType]   = useState<"residential" | "commercial">("residential");
  const [jobDate, setJobDate]           = useState<Date | undefined>(undefined);
  const [startTime, setStartTime]       = useState("");
  const [endTime, setEndTime]           = useState("");
  const [isRecurring, setIsRecurring]   = useState(false);
  const [frequency, setFrequency]       = useState<RecurrenceFrequency | "">("");
  const [repeatEvery, setRepeatEvery]   = useState("");
  const [weekDays, setWeekDays]         = useState<number[]>([]);
  const [endRepeatOn, setEndRepeatOn]   = useState<Date | undefined>(undefined);

  // ─── Services ─────────────────────────────────────────────────────────
  const [services, setServices]   = useState<JobServiceItem[]>([newServiceItem()]);
  const [jobDetails, setJobDetails] = useState("");
  const [notes, setNotes]           = useState("");

  // ─── Pricing ──────────────────────────────────────────────────────────
  const [applyDiscount, setApplyDiscount]       = useState(false);
  const [discountType, setDiscountType]         = useState<"percentage" | "amount">("percentage");
  const [discountValueStr, setDiscountValueStr] = useState("");
  const [applyTax, setApplyTax]                 = useState(false);
  const [taxRateStr, setTaxRateStr]             = useState("");

  // ─── Deposit ──────────────────────────────────────────────────────────
  const [applyDeposit, setApplyDeposit]         = useState(false);
  const [depositType, setDepositType]           = useState<"percentage" | "amount">("percentage");
  const [depositValueStr, setDepositValueStr]   = useState("");

  /**
   * Al elegir "Weekly" se marca el día de la fecha del job.
   *
   * Si no se marca ninguno, el backend rellena con el día de `scheduled_date`,
   * así que la serie se repetiría ese día sin que nada lo dijera en pantalla.
   * Esto no cambia el resultado: lo hace visible antes de guardar, y se puede
   * cambiar. Solo rellena cuando está vacío — si se desmarcan todos a propósito,
   * la validación lo señala en vez de volver a marcarlo solo.
   */
  useEffect(() => {
    if (!isRecurring || frequency !== "weekly" || !jobDate) return;
    setWeekDays((prev) => (prev.length > 0 ? prev : [jobDate.getDay()]));
  }, [isRecurring, frequency, jobDate]);

  /**
   * Una repetición sin fin se propone acabando dentro de un año.
   *
   * Dejarla abierta hace que el backend genere cientos de ocurrencias de golpe;
   * ver `DEFAULT_RECURRENCE_MONTHS`. Se rellena el campo en vez de mandarlo por
   * detrás al guardar, para que la fecha se vea y se pueda alargar.
   *
   * Solo en jobs nuevos: a una serie que ya existe sin fin no se le pone uno
   * por el hecho de abrir su formulario.
   */
  useEffect(() => {
    if (isEdit || !isRecurring || !frequency || !jobDate) return;
    setEndRepeatOn((prev) => prev ?? defaultRecurrenceEnd(jobDate));
  }, [isEdit, isRecurring, frequency, jobDate]);

  // ─── Pre-fill from existing job (edit mode) ───────────────────────────
  const [prefillDone, setPrefillDone] = useState(false);
  useEffect(() => {
    if (!open) { setPrefillDone(false); return; }
    if (!isEdit || prefillDone || !existingJob) return;

    setServiceType(existingJob.serviceType as "residential" | "commercial");
    setEmployeeIds(existingJob.employeeIds ?? []);
    setJobDate(existingJob.jobDate ? parseISO(existingJob.jobDate) : undefined);
    setStartTime(existingJob.startTime ?? "");
    setEndTime(existingJob.endTime ?? "");
    setIsRecurring(existingJob.isRecurring);
    setFrequency(existingJob.recurrenceFrequency ?? "");
    setRepeatEvery(existingJob.repeatEvery ? String(existingJob.repeatEvery) : "");
    setWeekDays(existingJob.weekDays ?? []);
    setEndRepeatOn(existingJob.recurringEndDate ? parseISO(existingJob.recurringEndDate) : undefined);
    setServices(existingJob.services.length > 0 ? existingJob.services : [newServiceItem()]);
    setJobDetails(existingJob.jobDetails ?? "");
    setNotes(existingJob.notes ?? "");
    setApplyDiscount(existingJob.applyDiscount);
    setDiscountType((existingJob.discountType as "percentage" | "amount") ?? "percentage");
    setDiscountValueStr(existingJob.discountValue ? String(existingJob.discountValue) : "");
    setApplyTax(existingJob.applyTax);
    setTaxRateStr(existingJob.taxRate ? String(existingJob.taxRate) : "");
    setApplyDeposit(existingJob.applyDeposit);
    setDepositType((existingJob.depositType as "percentage" | "amount") ?? "percentage");
    setDepositValueStr(existingJob.depositValue ? String(existingJob.depositValue) : "");
    setPrefillDone(true);
  }, [open, isEdit, existingJob, prefillDone]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setContact(EMPTY_CONTACT);
      setSelectedProperty(null);
      setEmployeeIds([]);
      setServiceType("residential");
      setJobDate(undefined);
      setStartTime("");
      setEndTime("");
      setIsRecurring(false);
      setFrequency("");
      setRepeatEvery("");
      setWeekDays([]);
      setEndRepeatOn(undefined);
      setServices([newServiceItem()]);
      setJobDetails("");
      setNotes("");
      setApplyDiscount(false);
      setDiscountValueStr("");
      setApplyTax(false);
      setTaxRateStr("");
      setApplyDeposit(false);
      setDepositValueStr("");
      setPrefillDone(false);
      setErrors({});
    }
  }, [open]);

  // ─── Computed pricing ─────────────────────────────────────────────────
  const subtotal = useMemo(
    () => services.reduce((s, item) => s + item.quantity * item.unitPrice, 0),
    [services],
  );
  const discountValue  = parseFloat(discountValueStr) || 0;
  const discountAmount = applyDiscount
    ? discountType === "percentage" ? subtotal * discountValue / 100 : discountValue
    : 0;
  const taxRate   = parseFloat(taxRateStr) || 0;
  const taxAmount = applyTax ? (subtotal - discountAmount) * taxRate / 100 : 0;
  const total     = subtotal - discountAmount + taxAmount;
  const depositValue  = parseFloat(depositValueStr) || 0;
  const depositAmount = applyDeposit
    ? depositType === "percentage" ? total * depositValue / 100 : depositValue
    : 0;
  const balanceDue = Math.max(total - depositAmount, 0);

  // ─── Service item helpers ─────────────────────────────────────────────
  const updateService = (idx: number, field: keyof JobServiceItem, raw: string) => {
    setServices((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item };
        if (field === "name")      updated.name      = raw;
        if (field === "quantity")  updated.quantity  = parseInt(raw) || 1;
        if (field === "unitPrice") updated.unitPrice = parseFloat(raw) || 0;
        updated.total = updated.quantity * updated.unitPrice;
        return updated;
      })
    );
  };

  // ─── Validación ───────────────────────────────────────────────────────
  // Todo se valida junto al enviar y cada campo que falta se marca en rojo:
  // así el usuario ve de golpe qué le falta en vez de descubrirlo de a uno,
  // con un toast que no señala dónde está el problema.
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const clientName = contact.client?.full_name || contact.lead?.full_name || "";

  const validate = (): boolean => {
    const errs: Record<string, boolean> = {};
    if (!contact.contactType || !clientName) errs.contact = true;
    if (!jobDate) errs.date = true;

    if (isRecurring) {
      // Sin frecuencia el insert pasa, pero al publicarlo el trigger que genera
      // la serie lanza "Unsupported recurring_frequency" y el job se queda en
      // Draft sin explicación. Se corta aquí.
      if (!frequency) errs.frequency = true;
      // El backend rellenaría con el día de la fecha; se exige elegirlo para que
      // la serie no salga en un día que nadie pidió.
      if (frequency === "weekly" && weekDays.length === 0) errs.weekDays = true;
      // Una repetición que acaba antes de la primera visita no genera nada.
      if (endRepeatOn && jobDate && endRepeatOn < jobDate) errs.endRepeatOn = true;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── Submit ───────────────────────────────────────────────────────────
  const handleSubmit = () => {
    // `validate` ya cubre estos casos; repetirlos aquí es lo que le dice a
    // TypeScript que a partir de este punto no son nulos.
    if (!validate() || !jobDate || !contact.contactType) {
      toast.error("Please complete the required fields");
      return;
    }
    const clientNameResolved = clientName;

    const input: CreateJobInput = {
      contactType:  contact.contactType,
      clientId:     contact.client?.id ?? null,
      leadId:       contact.lead?.id   ?? null,
      clientName:   clientNameResolved,
      clientEmail:  contact.client?.email || contact.lead?.email || null,
      clientPhone:  contact.client?.phone || contact.lead?.phone || null,
      propertyStreet: selectedProperty?.street    ?? null,
      propertyApt:    selectedProperty?.apt_suite ?? null,
      propertyCity:   selectedProperty?.city      ?? null,
      propertyState:  selectedProperty?.state     ?? null,
      propertyZip:    selectedProperty?.zip_code  ?? null,
      employeeIds,
      serviceType,
      isRecurring,
      recurrenceFrequency:  isRecurring ? (frequency || null) : null,
      // La duración en meses/años es del modelo viejo; el nuevo la expresa con
      // "End repeat on", así que se manda vacía.
      serviceDuration:      null,
      serviceDurationUnit:  null,
      repeatEvery:          isRecurring ? Number(repeatEvery) || 1 : null,
      weekDays:             isRecurring && frequency === "weekly" ? weekDays : [],
      recurringEndDate:     isRecurring && endRepeatOn ? format(endRepeatOn, "yyyy-MM-dd") : null,
      jobDate: format(jobDate, "yyyy-MM-dd"),
      startTime,
      endTime,
      services:     services.filter((s) => s.name.trim()),
      jobDetails:   jobDetails || null,
      notes:        notes     || null,
      subtotal,
      applyDiscount,
      discountType:  applyDiscount ? discountType : null,
      discountValue: applyDiscount ? discountValue : null,
      discountAmount,
      applyTax,
      taxRate:      applyTax ? taxRate : null,
      taxAmount,
      total,
      applyDeposit,
      depositType:  applyDeposit ? depositType : null,
      depositValue: applyDeposit ? depositValue : null,
      depositAmount,
      balanceDue,
      estimateId:       null,
      walkthroughId:    null,
      parentJobId:      null,
      paymentStatus:    applyDeposit ? "pending_deposit" : "no_deposit_required",
      status:           "Draft",
      invoiceIds:       [],
      depositInvoiceId: null,
    };

    const propertyId = selectedProperty?.id ?? null;

    if (isEdit && jobId) {
      updateJob({ id: jobId, updates: input, propertyId }, {
        onSuccess: () => {
          onClose();
          navigate("/jobs", { state: { openId: jobId } });
        },
      });
    } else {
      createJob({ input, propertyId }, {
        onSuccess: ({ job }) => {
          updateStatus({ id: job.id, status: "Upcoming" });
          onClose();
          navigate("/jobs", { state: { openId: job.id } });
        },
      });
    }
  };

  return (
    <FullScreenModal open={open} onClose={onClose}>
      {/* Cabecera: sin borde — la banda gris del cuerpo ya marca dónde empieza. */}
      <div className="flex-shrink-0 bg-card">
        <div className="max-w-2xl mx-auto">
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="w-1/3" />
            <div className="w-1/3 text-center">
              <h1 className="font-semibold text-base leading-tight">
                {isEdit ? "Edit Job" : "New Job"}
              </h1>
            </div>
            <div className="flex items-center w-1/3 justify-end">
              <Button variant="ghost" size="icon" className="h-8 w-8" type="button" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-muted/40">
        {isEdit && isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-2.5">
            <div className={FORM_SECTION_GAP}>

              <FormSection
                icon={User}
                title="Client"
                subtitle="Who the job is for and where the service happens"
                invalid={errors.contact}
              >
                <ContactPicker
                  value={contact}
                  onChange={(v) => {
                    setContact(v);
                    setSelectedProperty(v.property);
                    setErrors((e) => ({ ...e, contact: false }));
                  }}
                  error={errors.contact}
                  clientIdFromUrl={isEdit && existingJob?.contactType === "client" ? existingJob.clientId : undefined}
                  leadIdFromUrl={isEdit && existingJob?.contactType === "lead" ? existingJob.leadId : undefined}
                />
                {errors.contact && (
                  <p className="text-xs text-destructive">Please select a client or lead.</p>
                )}
              </FormSection>

              <FormSection
                icon={Users}
                title="Crew"
                subtitle="Employees assigned to this job"
              >
                <EmployeeSelect value={employeeIds} onChange={setEmployeeIds} />
              </FormSection>

              <FormSection
                icon={CalendarClock}
                title="Schedule"
                subtitle="Type of service, when the crew goes and how often it repeats"
                invalid={errors.date || errors.frequency || errors.weekDays || errors.endRepeatOn}
              >
                <SelectField
                  placeholder="Service type"
                  value={serviceType}
                  onChange={(v) => setServiceType(v as "residential" | "commercial")}
                  options={SERVICE_TYPE_OPTIONS}
                />

                <DateField
                  placeholder="Select date"
                  value={jobDate}
                  onChange={(d) => { setJobDate(d); setErrors((e) => ({ ...e, date: false })); }}
                  required
                  error={errors.date && "Date is required"}
                />

                {/* Inicio y fin son una sola decisión y se leen juntos. */}
                <div className="grid grid-cols-2 gap-3">
                  <TimeField id="job-start-time" label="Start Time" value={startTime} onChange={setStartTime} />
                  <TimeField id="job-end-time"   label="End Time"   value={endTime}   onChange={setEndTime} />
                </div>

                <RecurrenceFields
                  isRecurring={isRecurring}
                  onIsRecurring={setIsRecurring}
                  frequency={frequency}
                  onFrequency={(v) => { setFrequency(v); setErrors((e) => ({ ...e, frequency: false })); }}
                  repeatEvery={repeatEvery}
                  onRepeatEvery={setRepeatEvery}
                  weekDays={weekDays}
                  onToggleWeekDay={(day) => {
                    setWeekDays((prev) =>
                      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
                    );
                    setErrors((e) => ({ ...e, weekDays: false }));
                  }}
                  endRepeatOn={endRepeatOn}
                  onEndRepeatOn={(d) => { setEndRepeatOn(d); setErrors((e) => ({ ...e, endRepeatOn: false })); }}
                  jobDate={jobDate}
                  errors={{
                    frequency:   errors.frequency   && "Choose how often it repeats",
                    weekDays:    errors.weekDays    && "Pick at least one day",
                    endRepeatOn: errors.endRepeatOn && "It cannot end before the first visit",
                  }}
                />
              </FormSection>

              <FormSection
                icon={Package}
                title="Services"
                subtitle="What is being charged for"
                action={<AddLineItemButton onClick={() => setServices((p) => [...p, newServiceItem()])} />}
              >
                <LineItemsFields
                  descriptionLabel="Service"
                  items={services.map((it) => ({
                    id: it.id,
                    description: it.name,
                    quantity: String(it.quantity),
                    unitPrice: it.unitPrice ? String(it.unitPrice) : "",
                  }))}
                  onChange={(idx, field, v) => {
                    if (field === "description") updateService(idx, "name", v);
                    else if (field === "quantity") updateService(idx, "quantity", v || "1");
                    else updateService(idx, "unitPrice", v);
                  }}
                  onRemove={(idx) => setServices((p) => p.filter((_, i) => i !== idx))}
                  onAdd={() => setServices((p) => [...p, newServiceItem()])}
                />
              </FormSection>

              <FormSection
                icon={DollarSign}
                title="Pricing"
                subtitle="Discount, tax and deposit applied to the total"
              >
                <PricingFields
                  idPrefix="job"
                  subtotal={subtotal}
                  discount={{
                    enabled: applyDiscount,
                    onEnabledChange: setApplyDiscount,
                    type: discountType,
                    onTypeChange: (v) => setDiscountType(v as "percentage" | "amount"),
                    typeOptions: RATE_TYPE_OPTIONS,
                    value: discountValueStr,
                    onValueChange: setDiscountValueStr,
                    amount: discountAmount,
                  }}
                  tax={{
                    enabled: applyTax,
                    onEnabledChange: setApplyTax,
                    rate: taxRateStr,
                    onRateChange: setTaxRateStr,
                    amount: taxAmount,
                  }}
                  total={total}
                  deposit={{
                    enabled: applyDeposit,
                    onEnabledChange: setApplyDeposit,
                    type: depositType,
                    onTypeChange: (v) => setDepositType(v as "percentage" | "amount"),
                    typeOptions: RATE_TYPE_OPTIONS,
                    value: depositValueStr,
                    onValueChange: setDepositValueStr,
                    amount: depositAmount,
                    balanceDue,
                  }}
                />
              </FormSection>

              <FormSection
                icon={FileText}
                title="Notes"
                subtitle="What the client sees and what stays internal"
              >
                <TextareaField
                  id="job-details"
                  label="Job Details (visible to client)"
                  placeholder="Describe the job scope..."
                  value={jobDetails}
                  onChange={setJobDetails}
                />
                <TextareaField
                  id="job-notes"
                  label="Internal Notes"
                  placeholder="Internal notes (not visible to client)..."
                  value={notes}
                  onChange={setNotes}
                />
              </FormSection>

              {/* Pie dentro del scroll, como el resto de formularios. */}
              <div className="bg-card p-4 flex items-center justify-between gap-3">
                <Button variant="outline" size="sm" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button size="sm" type="button" onClick={handleSubmit} disabled={creating || updating}>
                  {creating || updating ? "Saving..." : isEdit ? "Save Changes" : "Create Job"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </FullScreenModal>
  );
}
