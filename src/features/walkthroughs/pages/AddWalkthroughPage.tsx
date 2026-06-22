import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/shared/config/queryKeys";
import { format } from "date-fns";
import { formatDisplayDate } from "@/shared/utils/formatters";
import {
  ChevronLeft,
  CalendarIcon,
  Clock,
  Briefcase,
  Users,
  FileText,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button }   from "@/shared/components/ui/button";
import { Input }    from "@/shared/components/ui/input";
import { Label }    from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { EntityPickerField } from "@/shared/components/common/EntityPickerField";
import type { EntityOption } from "@/shared/components/common/EntityPickerField";
import { EmployeeForm } from "@/features/employees/components/EmployeeForm";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { cn } from "@/shared/utils/cn";
import { walkthroughSchema } from "../schemas/walkthroughSchema";
import type { WalkthroughFormData } from "../schemas/walkthroughSchema";
import { useCreateWalkthrough, useUpdateWalkthrough, useWalkthrough } from "../hooks/useWalkthroughs";
import { supabase } from "@/integrations/supabase/client";
import { useAllEmployees } from "@/features/employees/hooks/useEmployees";
import { EstimateClientStep } from "@/features/estimates/components/EstimateClientStep";
import { ServicePropertySelector } from "@/shared/components/common/ServicePropertySelector";
import { useClients } from "@/features/crm/clients/hooks/useClients";
import { useLeads } from "@/features/crm/leads/hooks/useLeads";
import type { ClientEntity, LeadEntity } from "@/shared/types/entities";
import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";
type WalkthroughEntityType = "client" | "lead";

// ─── Component ────────────────────────────────────────────────────────────────

interface AddWalkthroughPageProps {
  open?: boolean;
  onClose?: () => void;
  // Conversion-from-request prefill
  fromRequestId?:      string;          // booking ID → calls finalize after save (no-date case)
  walkthroughEditId?:  string;          // draft ID  → UPDATE instead of INSERT (date case)
  prefillContactType?: "client" | "lead";
  prefillContactId?:   string;
  prefillServiceType?: "residential" | "commercial";
  prefillDate?:        string;          // yyyy-MM-dd
  prefillTime?:        string;          // HH:mm
  prefillNotes?:       string;
  prefillPropertyId?:  string | null;   // client_property_id from request (clients only)
}

export function AddWalkthroughPage({
  open, onClose,
  fromRequestId:      fromRequestIdProp,
  walkthroughEditId,
  prefillContactType, prefillContactId,
  prefillServiceType, prefillDate, prefillTime, prefillNotes, prefillPropertyId,
}: AddWalkthroughPageProps = {}) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const qc        = useQueryClient();
  const { id: urlWalkthroughId } = useParams<{ id: string }>();
  // walkthroughEditId prop (modal conversion) takes precedence over URL param
  const walkthroughId = walkthroughEditId ?? urlWalkthroughId;
  const locationState = (location.state as Record<string, unknown>) || {};
  const fromRequestId = fromRequestIdProp ?? (locationState.fromRequestId as string | undefined);
  const isEdit  = Boolean(walkthroughId);
  const isModal = onClose !== undefined;

  const handleClose = useCallback(() => {
    if (isModal) onClose?.();
    else navigate("/walkthroughs");
  }, [isModal, onClose, navigate]);

  const { data: existing }                                     = useWalkthrough(walkthroughId);
  const { data: employees = [], isLoading: isLoadingEmployees } = useAllEmployees();
  const { data: allClients = [] } = useClients();
  const { data: allLeads   = [] } = useLeads();

  const { mutate: create, isPending: isCreating } = useCreateWalkthrough();
  const { mutate: update, isPending: isUpdating } = useUpdateWalkthrough();
  const isPending = isCreating || isUpdating;

  // ── Client/Lead picker state ──────────────────────────────────────────────
  // Use prefillContactType as initial value so the picker shows the right type immediately
  const [walkthroughType, setWalkthroughType] = useState<WalkthroughEntityType | null>(
    prefillContactType ?? "client"
  );
  const [selectedClient,  setSelectedClient]  = useState<ClientEntity | null>(null);
  const [selectedLead,    setSelectedLead]    = useState<LeadEntity | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<ClientProperty | null>(null);
  const [pickerErrors,    setPickerErrors]    = useState<{ type?: string; entity?: string }>({});

  // ── Local UI state ────────────────────────────────────────────────────────
  const [datePickerOpen,     setDatePickerOpen]     = useState(false);
  const [selectedDate,       setSelectedDate]       = useState<Date | undefined>();
  const [selectedEmployees,  setSelectedEmployees]  = useState<string[]>([]);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [confirmOpen, setConfirmOpen]               = useState(false);
  const [pendingPayload, setPendingPayload]          = useState<WalkthroughFormData | null>(null);

  // ── Form ──────────────────────────────────────────────────────────────────
  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors },
  } = useForm<WalkthroughFormData>({
    resolver: zodResolver(walkthroughSchema),
    defaultValues: {
      walkthrough_type:   "client",
      service_type:       "residential",
      scheduled_date:     "",
      scheduled_time:     "",
      duration:           "",
      assigned_employees: [],
      notes:              "",
    },
  });

  // ── Prefill on edit ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isEdit && existing) {
      const type = existing.walkthrough_type as WalkthroughEntityType;
      setWalkthroughType(type);
      reset({
        walkthrough_type:   type,
        client_id:          existing.client_id  ?? undefined,
        lead_id:            existing.lead_id    ?? undefined,
        property_id:        existing.property_id ?? undefined,
        service_type:       existing.service_type as "residential" | "commercial",
        scheduled_date:     existing.scheduled_date,
        scheduled_time:     existing.scheduled_time,
        duration:           existing.duration ? String(existing.duration) : "",
        assigned_employees: existing.assigned_employees ?? [],
        notes:              existing.notes ?? "",
      });
      if (existing.scheduled_date) {
        const [y, m, d] = existing.scheduled_date.split("-").map(Number);
        setSelectedDate(new Date(y, m - 1, d));
      }
      setSelectedEmployees(existing.assigned_employees ?? []);
    }
  }, [isEdit, existing, reset]);

  // ── Auto-select contact from existing walkthrough (edit mode) ────────────
  const [editContactDone, setEditContactDone] = useState(false);
  useEffect(() => {
    if (!isEdit || editContactDone || !existing) return;
    if (existing.client_id && allClients.length > 0) {
      const c = allClients.find((x) => x.id === existing.client_id);
      if (c) { handleClientSelect(c as ClientEntity); setEditContactDone(true); }
    } else if (existing.lead_id && allLeads.length > 0) {
      const l = allLeads.find((x) => x.id === existing.lead_id);
      if (l) { handleLeadSelect(l as LeadEntity); setEditContactDone(true); }
    }
  }, [isEdit, editContactDone, existing, allClients, allLeads]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Prefill from request conversion (create mode) ─────────────────────────
  const [conversionPrefillDone, setConversionPrefillDone] = useState(false);
  useEffect(() => {
    if (isEdit || conversionPrefillDone || !prefillContactId) return;
    if (prefillServiceType) {
      setValue("service_type", prefillServiceType, { shouldValidate: true });
    }
    if (prefillNotes) setValue("notes", prefillNotes);
    if (prefillDate) {
      const [y, m, d] = prefillDate.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      setSelectedDate(date);
      setValue("scheduled_date", prefillDate, { shouldValidate: true });
    }
    if (prefillTime) setValue("scheduled_time", prefillTime);
    setConversionPrefillDone(true);
  }, [isEdit, conversionPrefillDone, prefillContactId, prefillServiceType, prefillDate, prefillTime, prefillNotes, setValue]);

  // ── Auto-select contact from prefill props (when clients/leads list loads) ─
  const [contactPrefillDone, setContactPrefillDone] = useState(false);
  useEffect(() => {
    if (isEdit || contactPrefillDone || !prefillContactId) return;
    if (prefillContactType === "client" && allClients.length > 0) {
      const c = allClients.find((x) => x.id === prefillContactId);
      if (c) { handleClientSelect(c as ClientEntity); setContactPrefillDone(true); }
    } else if (prefillContactType === "lead" && allLeads.length > 0) {
      const l = allLeads.find((x) => x.id === prefillContactId);
      if (l) { handleLeadSelect(l as LeadEntity); setContactPrefillDone(true); }
    }
  }, [isEdit, contactPrefillDone, prefillContactId, prefillContactType, allClients, allLeads]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync employees → form ──────────────────────────────────────────────────
  useEffect(() => {
    setValue("assigned_employees", selectedEmployees);
  }, [selectedEmployees, setValue]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function toggleEmployee(empId: string) {
    setSelectedEmployees((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  }

  function onDateSelect(date: Date | undefined) {
    setSelectedDate(date);
    setValue("scheduled_date", date ? format(date, "yyyy-MM-dd") : "", { shouldValidate: true });
    setDatePickerOpen(false);
  }

  function handleTypeChange(type: WalkthroughEntityType) {
    setWalkthroughType(type);
    setValue("walkthrough_type", type);
    if (type === "client") { setSelectedLead(null);   setValue("lead_id",   null); }
    else {
      setSelectedClient(null);   setValue("client_id", null);
      setSelectedProperty(null); setValue("property_id", null);
    }
    setPickerErrors({});
  }

  function handleClientSelect(client: ClientEntity) {
    setSelectedClient(client);
    setValue("client_id", client.id, { shouldValidate: true });
    // Reset property — ServicePropertySelector re-resolves the primary for the new client
    setSelectedProperty(null);
    setValue("property_id", null);
    setPickerErrors({});
  }

  function handlePropertyChange(property: ClientProperty | null) {
    setSelectedProperty(property);
    setValue("property_id", property?.id ?? null);
  }

  function handleLeadSelect(lead: LeadEntity) {
    setSelectedLead(lead);
    setValue("lead_id", lead.id, { shouldValidate: true });
    setPickerErrors({});
  }

  // Employee picker helpers
  const employeeOptions: EntityOption[] = employees.map((e) => ({
    id: e.id,
    label: `${e.first_name} ${e.last_name}`,
  }));

  const selectedEmployeeOptions: EntityOption[] = employeeOptions.filter((o) =>
    selectedEmployees.includes(o.id)
  );

  function handleEmployeeSelectionChange(next: EntityOption[]) {
    const nextIds    = new Set(next.map((o) => o.id));
    const currentIds = new Set(selectedEmployees);
    [...nextIds].filter((id) => !currentIds.has(id)).forEach(toggleEmployee);
    [...currentIds].filter((id) => !nextIds.has(id)).forEach(toggleEmployee);
  }

  const assignedEmployeeDetails = employees.filter((e) => selectedEmployees.includes(e.id));

  // ── Submit ─────────────────────────────────────────────────────────────────
  function onSubmit(data: WalkthroughFormData) {
    if (!walkthroughType) {
      setPickerErrors({ type: "Please select Client or Lead" });
      return;
    }
    const hasEntity = walkthroughType === "client" ? Boolean(data.client_id) : Boolean(data.lead_id);
    if (!hasEntity) {
      setPickerErrors({ entity: `Please select a ${walkthroughType}` });
      return;
    }

    const payload: WalkthroughFormData = {
      ...data,
      client_id:   data.walkthrough_type === "client" ? data.client_id   : null,
      lead_id:     data.walkthrough_type === "lead"   ? data.lead_id     : null,
      property_id: data.walkthrough_type === "client" ? data.property_id : null,
    };

    // Both create and edit show Confirm dialog before saving
    setPendingPayload(payload);
    setConfirmOpen(true);
  }

  // ── Confirm save (create and edit) ────────────────────────────────────────

  function handleConfirm() {
    if (!pendingPayload) return;

    if (isEdit && walkthroughId) {
      // Edit: Draft or Cancelled → promote to Scheduled
      const currentStatus = existing?.status ?? "";
      const newStatus = (currentStatus === "Draft" || currentStatus === "Cancelled")
        ? "Scheduled"
        : undefined;

      update({ id: walkthroughId, data: pendingPayload, newStatus }, {
        onSuccess: () => { setConfirmOpen(false); setPendingPayload(null); handleClose(); },
      });
    } else {
      // Create: always Scheduled (all required fields were filled)
      create(pendingPayload, {
        onSuccess: async (newWalkthrough) => {
          setConfirmOpen(false);
          setPendingPayload(null);
          if (fromRequestId && newWalkthrough?.id) {
            const contactType = pendingPayload.walkthrough_type as "client" | "lead";
            const contactId   = contactType === "client" ? pendingPayload.client_id : pendingPayload.lead_id;
            if (contactId) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase as any).rpc("finalize_booking_conversion", {
                p_booking_id:     fromRequestId,
                p_estimate_id:    null,
                p_walkthrough_id: newWalkthrough.id,
              });
              qc.invalidateQueries({ queryKey: QK.requests });
            }
          }
          handleClose();
        },
      });
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const submitLabel = isPending
    ? (isEdit ? "Saving..." : "Scheduling...")
    : (isEdit ? "Save Changes" : "Schedule now");

  // Form cards — shared between modal and page layouts
  const formCards = (
    <>
      {/* ── Client / Lead ────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-5">
          <EstimateClientStep
            estimateType={walkthroughType}
            onEstimateTypeChange={handleTypeChange}
            selectedClient={selectedClient}
            selectedLead={selectedLead}
            onClientSelect={handleClientSelect}
            onLeadSelect={handleLeadSelect}
            errors={pickerErrors}
            infoText="Verify the email and phone number — they will be used to send the walkthrough confirmation."
          />

          {/* Service property — clients only */}
          {walkthroughType === "client" && selectedClient && (
            <div className="mt-4">
              <ServicePropertySelector
                clientId={selectedClient.id}
                value={selectedProperty}
                onChange={handlePropertyChange}
                preferredPropertyId={existing?.property_id ?? prefillPropertyId}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Service Type ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Service Type
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Service Type <span className="text-destructive">*</span></Label>
              <Select
                value={watch("service_type")}
                onValueChange={(v) => setValue("service_type", v as "residential" | "commercial", { shouldValidate: true })}
              >
                <SelectTrigger className={cn(errors.service_type && "border-destructive")}>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
              {errors.service_type && <p className="text-xs text-destructive">Required</p>}
            </div>

            <div className="space-y-1">
              <Label>Walkthrough Duration</Label>
              <Select
                value={watch("duration") ?? ""}
                onValueChange={(v) => setValue("duration", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Schedule ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground",
                      errors.scheduled_date && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? formatDisplayDate(selectedDate) : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={selectedDate} onSelect={onDateSelect} initialFocus />
                </PopoverContent>
              </Popover>
              {errors.scheduled_date && <p className="text-xs text-destructive">Required</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="scheduled_time">Time <span className="text-destructive">*</span></Label>
              <Input
                id="scheduled_time"
                type="time"
                {...register("scheduled_time")}
                className={cn(errors.scheduled_time && "border-destructive")}
              />
              {errors.scheduled_time && <p className="text-xs text-destructive">Required</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Crew ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Crew
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <EntityPickerField
            multiple
            options={employeeOptions}
            selected={selectedEmployeeOptions}
            onChange={handleEmployeeSelectionChange}
            onCreateNew={() => setShowCreateEmployee(true)}
            createNewLabel="Add New Employee"
            placeholder="Select employees"
            emptyMessage="No employee found."
            isLoading={isLoadingEmployees}
          />

          {assignedEmployeeDetails.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3 dark:bg-blue-950/30 dark:border-blue-800">
              <p className="text-sm font-medium text-foreground">
                {assignedEmployeeDetails.length} employee{assignedEmployeeDetails.length > 1 ? "s" : ""} selected
              </p>
              <div className="space-y-2">
                {assignedEmployeeDetails.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                    {emp.position && (
                      <span className="text-muted-foreground">— {emp.position}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Notes ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register("notes")}
            rows={3}
            placeholder="Enter notes here..."
          />
        </CardContent>
      </Card>
    </>
  );

  const employeeModal = (
    <EmployeeForm
      open={showCreateEmployee}
      onClose={() => setShowCreateEmployee(false)}
      onCreated={(emp) => {
        toggleEmployee(emp.id);
        qc.invalidateQueries({ queryKey: QK.employeesAll });
        setShowCreateEmployee(false);
      }}
    />
  );

  // ── Confirm Changes dialog (edit mode) ────────────────────────────────────
  const currentStatus  = existing?.status ?? "";
  const willSchedule   = currentStatus === "Draft" || currentStatus === "Cancelled";
  const contactName    = selectedClient?.full_name ?? selectedLead?.full_name ?? "—";
  const confirmDialog = (
    <Dialog open={confirmOpen} onOpenChange={(v) => { if (!v) { setConfirmOpen(false); setPendingPayload(null); } }}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="text-xl font-bold">
            {isEdit ? "Confirm Changes" : "Schedule Walkthrough"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">Please review the walkthrough details</p>
        </DialogHeader>
        <div className="px-6 py-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Client / Lead</span>
            <span className="text-sm font-semibold">{contactName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Date</span>
            <span className="text-sm font-semibold">
              {selectedDate ? formatDisplayDate(selectedDate) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Time</span>
            <span className="text-sm font-semibold">{watch("scheduled_time") || "—"}</span>
          </div>
          {isEdit && willSchedule && (
            <div className="mt-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
              This walkthrough will be marked as <strong>Scheduled</strong>
            </div>
          )}
        </div>
        <div className="px-6 pb-6 grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => { setConfirmOpen(false); setPendingPayload(null); }} disabled={isPending}>
            Go Back
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Saving…" : (isEdit ? "Confirm" : "Schedule now")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ── Modal mode — invoice-style layout ─────────────────────────────────────
  if (isModal) {
    return (
      <FullScreenModal open={open ?? false} onClose={handleClose}>
        {/* Header — 3-col: empty | centered title | X */}
        <div className="border-b flex-shrink-0 bg-white">
          <div className="max-w-2xl mx-auto">
            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="w-1/3" />
              <div className="w-1/3 text-center">
                <h1 className="font-semibold text-base leading-tight">
                  {isEdit ? "Edit Walkthrough" : "Schedule Walkthrough"}
                </h1>
              </div>
              <div className="flex items-center w-1/3 justify-end">
                <Button variant="ghost" size="icon" className="h-8 w-8" type="button" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable body — form + footer buttons inside */}
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="max-w-2xl mx-auto px-4 space-y-4 py-6 pb-4">
            <form id="walkthrough-form" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-4">{formCards}</div>
            </form>
            {/* Footer buttons — same card style as invoice */}
            <div className="bg-white rounded-lg border p-4 flex items-center justify-between gap-3">
              <Button variant="outline" size="sm" type="button" onClick={handleClose}>
                Cancel
              </Button>
              <Button size="sm" type="submit" form="walkthrough-form" disabled={isPending}>
                {submitLabel}
              </Button>
            </div>
          </div>
        </div>

        {employeeModal}
        {confirmDialog}
      </FullScreenModal>
    );
  }

  // ── Page mode ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background">
        <Button variant="ghost" size="icon" type="button" onClick={handleClose}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold flex-1">
          {isEdit ? "Edit Walkthrough" : "Schedule Walkthrough"}
        </h1>
      </div>

      <form id="walkthrough-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="max-w-2xl mx-auto p-4 space-y-4 pb-6">
          {formCards}
        </div>
      </form>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-background border-t px-4 py-3">
        <div className="max-w-2xl mx-auto grid grid-cols-2 gap-3">
          <Button variant="outline" type="button" className="h-12" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="walkthrough-form" className="h-12" disabled={isPending}>
            {submitLabel}
          </Button>
        </div>
      </div>

      {employeeModal}
      {confirmDialog}
    </div>
  );
}
