import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { formatDisplayDate } from "@/shared/utils/formatters";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import { ContactPicker, EMPTY_CONTACT, type ContactPickerValue } from "@/shared/components/common/ContactPicker";
import { useJob } from "../hooks/useJobs";
import { useCreateJob, useUpdateJob, useUpdateJobStatus } from "../hooks/useJobMutations";
import { toDecimalString, toIntegerString } from "@/shared/utils/numericInput";
import type { JobServiceItem, CreateJobInput } from "../types/job.types";
import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";
import { toast } from "sonner";

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

  // ─── Submit ───────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!jobDate) { toast.error("Please select a date"); return; }
    if (!contact.contactType) { toast.error("Please select a client or lead"); return; }
    const clientNameResolved = contact.client?.full_name || contact.lead?.full_name || "";
    if (!clientNameResolved) { toast.error("Please select a contact"); return; }

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
      employeeIds:  [],
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
      {/* Header */}
      <div className="border-b flex-shrink-0 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="w-1/3" />
            <div className="w-1/3 text-center">
              <h1 className="font-semibold text-base leading-tight">
                {isEdit ? "Edit Job" : "New Job"}
              </h1>
            </div>
            <div className="flex items-center w-1/3 justify-end">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-background">
        {isEdit && isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Left column */}
              <div className="space-y-4">

                {/* Contact */}
                <Card className="border border-border/50 shadow-none">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Client / Lead</CardTitle></CardHeader>
                  <CardContent>
                    <ContactPicker
                      value={contact}
                      onChange={(v) => { setContact(v); setSelectedProperty(v.property); }}
                      clientIdFromUrl={isEdit && existingJob?.contactType === "client" ? existingJob.clientId : undefined}
                      leadIdFromUrl={isEdit && existingJob?.contactType === "lead" ? existingJob.leadId : undefined}
                    />
                  </CardContent>
                </Card>

                {/* Schedule */}
                <Card className="border border-border/50 shadow-none">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Schedule</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Service Type</Label>
                      <Select value={serviceType} onValueChange={(v) => setServiceType(v as "residential" | "commercial")}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="residential">Residential</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full mt-1 justify-start text-left font-normal", !jobDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {jobDate ? formatDisplayDate(jobDate) : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={jobDate} onSelect={setJobDate} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Start Time</Label>
                        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label>End Time</Label>
                        <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card className="border border-border/50 shadow-none">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Job Details (visible to client)</Label>
                      <Textarea value={jobDetails} onChange={(e) => setJobDetails(e.target.value)} placeholder="Describe the job scope..." className="mt-1 min-h-[80px]" />
                    </div>
                    <div>
                      <Label>Internal Notes</Label>
                      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes (not visible to client)..." className="mt-1 min-h-[80px]" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right column */}
              <div className="space-y-4">

                {/* Services */}
                <Card className="border border-border/50 shadow-none">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Services</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setServices((p) => [...p, newServiceItem()])}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {services.map((item, idx) => (
                      <div key={item.id} className="grid grid-cols-[1fr_60px_80px_32px] gap-2 items-end">
                        <div>
                          {idx === 0 && <Label className="text-xs">Service</Label>}
                          <Input value={item.name} onChange={(e) => updateService(idx, "name", e.target.value)} placeholder="e.g. Deep Clean" className="mt-1" />
                        </div>
                        <div>
                          {idx === 0 && <Label className="text-xs">Qty</Label>}
                          <Input type="text" inputMode="numeric" value={item.quantity} onChange={(e) => updateService(idx, "quantity", toIntegerString(e.target.value) || "1")} className="mt-1" />
                        </div>
                        <div>
                          {idx === 0 && <Label className="text-xs">Unit Price</Label>}
                          <Input type="text" inputMode="decimal" value={item.unitPrice || ""} onChange={(e) => updateService(idx, "unitPrice", toDecimalString(e.target.value))} placeholder="0.00" className="mt-1" />
                        </div>
                        <Button variant="ghost" size="icon" className="h-9 w-8 text-destructive hover:text-destructive" onClick={() => setServices((p) => p.filter((_, i) => i !== idx))} disabled={services.length === 1}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Pricing */}
                <Card className="border border-border/50 shadow-none">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
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
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percentage" | "amount")}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">%</SelectItem>
                              <SelectItem value="amount">$</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input type="text" inputMode="decimal" value={discountValueStr} onChange={(e) => setDiscountValueStr(toDecimalString(e.target.value))} className="h-9" placeholder="0" />
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
                      <div className="flex gap-2 items-center">
                        <Input type="text" inputMode="decimal" value={taxRateStr} onChange={(e) => setTaxRateStr(toDecimalString(e.target.value))} className="h-9 w-24" placeholder="0" />
                        <span className="text-sm text-muted-foreground">%</span>
                        <span className="text-sm ml-auto">${taxAmount.toFixed(2)}</span>
                      </div>
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
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={depositType} onValueChange={(v) => setDepositType(v as "percentage" | "amount")}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">%</SelectItem>
                              <SelectItem value="amount">$</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input type="text" inputMode="decimal" value={depositValueStr} onChange={(e) => setDepositValueStr(toDecimalString(e.target.value))} className="h-9" placeholder="0" />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Deposit</span><span className="font-medium">${depositAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Balance Due</span><span className="font-medium">${balanceDue.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={creating || updating}>
                {creating || updating ? "Saving..." : isEdit ? "Save Changes" : "Create Job"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </FullScreenModal>
  );
}
