import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Trash2, ChevronLeft } from "lucide-react";
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

export function AddJobPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const { isLoading } = useJob(id);
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
  const [services, setServices] = useState<JobServiceItem[]>([newServiceItem()]);
  const [jobDetails, setJobDetails] = useState("");
  const [notes, setNotes]           = useState("");

  // ─── Pricing ──────────────────────────────────────────────────────────
  const [applyDiscount, setApplyDiscount]     = useState(false);
  const [discountType, setDiscountType]       = useState<"percentage" | "amount">("percentage");
  const [discountValueStr, setDiscountValueStr] = useState("0");
  const [applyTax, setApplyTax]               = useState(false);
  const [taxRateStr, setTaxRateStr]           = useState("0");

  // ─── Deposit ──────────────────────────────────────────────────────────
  const [applyDeposit, setApplyDeposit]       = useState(false);
  const [depositType, setDepositType]         = useState<"percentage" | "amount">("percentage");
  const [depositValueStr, setDepositValueStr] = useState("0");

  // ─── Computed pricing ────────────────────────────────────────────────
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
  const depositValue   = parseFloat(depositValueStr) || 0;
  const depositAmount  = applyDeposit
    ? depositType === "percentage" ? total * depositValue / 100 : depositValue
    : 0;
  const balanceDue = Math.max(total - depositAmount, 0);

  // ─── Service item helpers ─────────────────────────────────────────────
  const updateService = (idx: number, field: keyof JobServiceItem, raw: string) => {
    setServices((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item };
        if (field === "name") updated.name = raw;
        if (field === "quantity") updated.quantity = parseInt(raw) || 1;
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
      leadId:       contact.lead?.id ?? null,
      clientName:   clientNameResolved,
      clientEmail:  contact.client?.email || contact.lead?.email || null,
      clientPhone:  contact.client?.phone || contact.lead?.phone || null,
      propertyStreet: selectedProperty?.street ?? null,
      propertyApt:    selectedProperty?.apt_suite ?? null,
      propertyCity:   selectedProperty?.city ?? null,
      propertyState:  selectedProperty?.state ?? null,
      propertyZip:    selectedProperty?.zip_code ?? null,
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
      notes:        notes || null,
      subtotal,
      applyDiscount,
      discountType: applyDiscount ? discountType : null,
      discountValue: applyDiscount ? discountValue : null,
      discountAmount,
      applyTax,
      taxRate: applyTax ? taxRate : null,
      taxAmount,
      total,
      applyDeposit,
      depositType: applyDeposit ? depositType : null,
      depositValue: applyDeposit ? depositValue : null,
      depositAmount,
      balanceDue,
      estimateId:    null,
      walkthroughId: null,
      parentJobId:   null,
      paymentStatus: applyDeposit ? "pending_deposit" : "no_deposit_required",
      status:        "Draft",
      invoiceIds:    [],
      depositInvoiceId: null,
    };

    const propertyId = selectedProperty?.id ?? null;

    if (isEdit && id) {
      updateJob({ id, updates: input, propertyId }, { onSuccess: () => navigate(`/jobs/${id}`) });
    } else {
      createJob(
        { input, propertyId },
        {
          onSuccess: (job) => {
            updateStatus({ id: job.id, status: "Upcoming" });
            navigate(`/jobs/${job.id}`);
          },
        },
      );
    }
  };

  if (isEdit && isLoading) return <LoadingSpinner fullScreen />;

  return (
    <div className="p-2.5 space-y-2.5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{isEdit ? "Edit Job" : "New Job"}</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-2.5">
        {/* Left column */}
        <div className="space-y-2.5">

          {/* Contact */}
          <Card className="border border-border/50 shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-base">Client / Lead</CardTitle></CardHeader>
            <CardContent>
              <ContactPicker
                value={contact}
                onChange={(v) => {
                  setContact(v);
                  setSelectedProperty(v.property);
                }}
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
                    <Button
                      variant="outline"
                      className={cn("w-full mt-1 justify-start text-left font-normal", !jobDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {jobDate ? format(jobDate, "PPP") : "Select date"}
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
                <Textarea
                  value={jobDetails}
                  onChange={(e) => setJobDetails(e.target.value)}
                  placeholder="Describe the job scope..."
                  className="mt-1 min-h-[80px]"
                />
              </div>
              <div>
                <Label>Internal Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes (not visible to client)..."
                  className="mt-1 min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-2.5">

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
                    <Input
                      value={item.name}
                      onChange={(e) => updateService(idx, "name", e.target.value)}
                      placeholder="e.g. Deep Clean"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    {idx === 0 && <Label className="text-xs">Qty</Label>}
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={item.quantity}
                      onChange={(e) => updateService(idx, "quantity", toIntegerString(e.target.value) || "1")}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    {idx === 0 && <Label className="text-xs">Unit Price</Label>}
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={item.unitPrice || ""}
                      onChange={(e) => updateService(idx, "unitPrice", toDecimalString(e.target.value))}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-8 text-destructive hover:text-destructive"
                    onClick={() => setServices((p) => p.filter((_, i) => i !== idx))}
                    disabled={services.length === 1}
                  >
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
              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>

              {/* Discount */}
              <div className="flex items-center justify-between">
                <Label className="text-sm">Discount</Label>
                <Switch checked={applyDiscount} onCheckedChange={setApplyDiscount} />
              </div>
              {applyDiscount && (
                <div className="grid grid-cols-2 gap-2">
                  <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percentage" | "amount")}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="amount">$</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={discountValueStr}
                    onChange={(e) => setDiscountValueStr(toDecimalString(e.target.value))}
                    className="h-9"
                  />
                </div>
              )}
              {applyDiscount && discountAmount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}

              {/* Tax */}
              <div className="flex items-center justify-between">
                <Label className="text-sm">Tax</Label>
                <Switch checked={applyTax} onCheckedChange={setApplyTax} />
              </div>
              {applyTax && (
                <div className="flex gap-2 items-center">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={taxRateStr}
                    onChange={(e) => setTaxRateStr(toDecimalString(e.target.value))}
                    className="h-9 w-24"
                    placeholder="0"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <span className="text-sm ml-auto">${taxAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold border-t pt-2">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>

              {/* Deposit */}
              <div className="flex items-center justify-between">
                <Label className="text-sm">Deposit Required</Label>
                <Switch checked={applyDeposit} onCheckedChange={setApplyDeposit} />
              </div>
              {applyDeposit && (
                <div className="grid grid-cols-2 gap-2">
                  <Select value={depositType} onValueChange={(v) => setDepositType(v as "percentage" | "amount")}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="amount">$</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={depositValueStr}
                    onChange={(e) => setDepositValueStr(toDecimalString(e.target.value))}
                    className="h-9"
                  />
                </div>
              )}
              {applyDeposit && (
                <>
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
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 max-w-2xl mx-auto">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={creating || updating}>
          {creating || updating ? "Saving..." : isEdit ? "Save Changes" : "Create Job"}
        </Button>
      </div>
    </div>
  );
}
