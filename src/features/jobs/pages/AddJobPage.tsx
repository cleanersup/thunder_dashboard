/**
 * Formulario de Job — sigue el kit de formularios (`shared/components/forms`),
 * con `RequestForm` como referencia: cada bloque es un `FormSection` y cada
 * control una molécula del kit.
 */
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  Plus, Trash2, X, User, Users, CalendarClock, Package, DollarSign, FileText,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import {
  FormSection, FloatingInput, SelectField, DateField, TimeField,
} from "@/shared/components/forms";
import { FORM_SECTION_GAP } from "@/shared/constants/formTokens";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import { ContactPicker, EMPTY_CONTACT, type ContactPickerValue } from "@/shared/components/common/ContactPicker";
import { EmployeeSelect } from "@/shared/components/common/EmployeeSelect";
import { useJob } from "../hooks/useJobs";
import { useCreateJob, useUpdateJob, useUpdateJobStatus } from "../hooks/useJobMutations";
import type { JobServiceItem, CreateJobInput } from "../types/job.types";
import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";
import { toast } from "sonner";

const SERVICE_TYPE_OPTIONS = [
  { value: "residential", label: "Residential" },
  { value: "commercial",  label: "Commercial"  },
] as const;

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
      isRecurring:  false,
      recurrenceFrequency:  null,
      serviceDuration:      null,
      serviceDurationUnit:  null,
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
        onSuccess: (job) => {
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
                subtitle="Type of service and when the crew goes"
                invalid={errors.date}
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
              </FormSection>

              <FormSection
                icon={Package}
                title="Services"
                subtitle="What is being charged for"
                action={
                  <Button size="sm" variant="outline" type="button" onClick={() => setServices((p) => [...p, newServiceItem()])}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                }
              >
                {services.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-start">
                    <FloatingInput
                      id={`service-name-${item.id}`}
                      label="Service"
                      value={item.name}
                      onChange={(v) => updateService(idx, "name", v)}
                    />
                    <FloatingInput
                      id={`service-qty-${item.id}`}
                      label="Qty"
                      type="integer"
                      value={String(item.quantity)}
                      onChange={(v) => updateService(idx, "quantity", v || "1")}
                    />
                    <FloatingInput
                      id={`service-price-${item.id}`}
                      label="Price"
                      type="decimal"
                      value={item.unitPrice ? String(item.unitPrice) : ""}
                      onChange={(v) => updateService(idx, "unitPrice", v)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="h-12 w-8 text-destructive hover:text-destructive"
                      onClick={() => setServices((p) => p.filter((_, i) => i !== idx))}
                      disabled={services.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </FormSection>

              <FormSection
                icon={DollarSign}
                title="Pricing"
                subtitle="Discount, tax and deposit applied to the total"
              >
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Discount</Label>
                  <Switch checked={applyDiscount} onCheckedChange={setApplyDiscount} />
                </div>
                {applyDiscount && (
                  <>
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <SelectField
                        placeholder="Type"
                        value={discountType}
                        onChange={(v) => setDiscountType(v as "percentage" | "amount")}
                        options={RATE_TYPE_OPTIONS}
                      />
                      <FloatingInput
                        id="job-discount-value"
                        label="Discount value"
                        type="decimal"
                        value={discountValueStr}
                        onChange={setDiscountValueStr}
                      />
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-destructive">
                        <span>Discount</span><span>-${discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Tax</Label>
                  <Switch checked={applyTax} onCheckedChange={setApplyTax} />
                </div>
                {applyTax && (
                  <>
                    <FloatingInput
                      id="job-tax-rate"
                      label="Tax rate (%)"
                      type="decimal"
                      value={taxRateStr}
                      onChange={setTaxRateStr}
                    />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">${taxAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between text-sm font-bold border-t pt-2">
                  <span>Total</span><span>${total.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Deposit Required</Label>
                  <Switch checked={applyDeposit} onCheckedChange={setApplyDeposit} />
                </div>
                {applyDeposit && (
                  <>
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <SelectField
                        placeholder="Type"
                        value={depositType}
                        onChange={(v) => setDepositType(v as "percentage" | "amount")}
                        options={RATE_TYPE_OPTIONS}
                      />
                      <FloatingInput
                        id="job-deposit-value"
                        label="Deposit value"
                        type="decimal"
                        value={depositValueStr}
                        onChange={setDepositValueStr}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Deposit</span>
                      <span className="font-medium">${depositAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Balance Due</span>
                      <span className="font-medium">${balanceDue.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </FormSection>

              <FormSection
                icon={FileText}
                title="Notes"
                subtitle="What the client sees and what stays internal"
              >
                <div>
                  <Label className="text-sm font-medium mb-2 block">Job Details (visible to client)</Label>
                  <Textarea
                    value={jobDetails}
                    onChange={(e) => setJobDetails(e.target.value)}
                    placeholder="Describe the job scope..."
                    className="min-h-[100px] rounded-md"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Internal Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal notes (not visible to client)..."
                    className="min-h-[100px] rounded-md"
                  />
                </div>
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
