import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/shared/config/queryKeys";
import { format } from "date-fns";
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
import { cn } from "@/shared/utils/cn";
import { toast } from "sonner";
import { walkthroughSchema } from "../schemas/walkthroughSchema";
import type { WalkthroughFormData } from "../schemas/walkthroughSchema";
import { useCreateWalkthrough, useUpdateWalkthrough, useWalkthrough } from "../hooks/useWalkthroughs";
import { supabase } from "@/integrations/supabase/client";
import { useAllEmployees } from "@/features/employees/hooks/useEmployees";
import { EstimateClientStep } from "@/features/estimates/components/EstimateClientStep";
import type { ClientEntity, LeadEntity } from "@/shared/types/entities";
type WalkthroughEntityType = "client" | "lead";

// ─── Component ────────────────────────────────────────────────────────────────

interface AddWalkthroughPageProps {
  /** When provided, renders as a full-screen Dialog. Omit for standalone page mode. */
  open?: boolean;
  onClose?: () => void;
}

export function AddWalkthroughPage({ open, onClose }: AddWalkthroughPageProps = {}) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const qc        = useQueryClient();
  const { id: walkthroughId } = useParams<{ id: string }>();
  const locationState  = (location.state as Record<string, unknown>) || {};
  const fromRequestId  = locationState.fromRequestId as string | undefined;
  const isEdit = Boolean(walkthroughId);
  const isModal = onClose !== undefined;

  const handleClose = useCallback(() => {
    if (isModal) onClose?.();
    else navigate("/walkthroughs");
  }, [isModal, onClose, navigate]);

  const { data: existing }                                     = useWalkthrough(walkthroughId);
  const { data: employees = [], isLoading: isLoadingEmployees } = useAllEmployees();

  const { mutate: create, isPending: isCreating } = useCreateWalkthrough();
  const { mutate: update, isPending: isUpdating } = useUpdateWalkthrough();
  const isPending = isCreating || isUpdating;

  // ── Client/Lead picker state ──────────────────────────────────────────────
  const [walkthroughType, setWalkthroughType] = useState<WalkthroughEntityType | null>("client");
  const [selectedClient,  setSelectedClient]  = useState<ClientEntity | null>(null);
  const [selectedLead,    setSelectedLead]    = useState<LeadEntity | null>(null);
  const [pickerErrors,    setPickerErrors]    = useState<{ type?: string; entity?: string }>({});

  // ── Local UI state ────────────────────────────────────────────────────────
  const [datePickerOpen,     setDatePickerOpen]     = useState(false);
  const [selectedDate,       setSelectedDate]       = useState<Date | undefined>();
  const [selectedEmployees,  setSelectedEmployees]  = useState<string[]>([]);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);

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
    else                   { setSelectedClient(null); setValue("client_id", null); }
    setPickerErrors({});
  }

  function handleClientSelect(client: ClientEntity) {
    setSelectedClient(client);
    setValue("client_id", client.id, { shouldValidate: true });
    setPickerErrors({});
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
      client_id: data.walkthrough_type === "client" ? data.client_id : null,
      lead_id:   data.walkthrough_type === "lead"   ? data.lead_id   : null,
    };

    if (isEdit && walkthroughId) {
      update({ id: walkthroughId, data: payload }, {
        onSuccess: () => { toast.success("Walkthrough updated"); handleClose(); },
      });
    } else {
      create(payload, {
        onSuccess: async (newWalkthrough) => {
          toast.success("Walkthrough scheduled");
          if (fromRequestId && newWalkthrough?.id) {
            const contactType = payload.walkthrough_type as "client" | "lead";
            const contactId   = contactType === "client" ? payload.client_id : payload.lead_id;
            if (contactId) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase as any).rpc("finalize_booking_conversion", {
                p_booking_id:    fromRequestId,
                p_walkthrough_id: newWalkthrough.id,
                p_contact_type:  contactType,
                p_contact_id:    contactId,
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
                    {selectedDate ? format(selectedDate, "MM/dd/yyyy") : "Pick date"}
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
    </div>
  );
}
