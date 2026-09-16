/**
 * Formulario de Walkthrough — **crear y editar** (misma pieza, como el hub de swift-slate).
 *
 * Los dos caminos comparten estado, validación y secciones; solo cambian el prefill y
 * el guardado: insert (+ finalizar conversión de request) vs update (+ promover status).
 * Al tocar este archivo hay que probar SIEMPRE los dos.
 *
 * Sigue el kit de formularios (`shared/components/forms`) — ver `RequestForm` como referencia.
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/shared/config/queryKeys";
import { format } from "date-fns";
import { formatDisplayDate } from "@/shared/utils/formatters";
import { ChevronLeft, Briefcase, Users, FileText, Check, X } from "lucide-react";
import { Button }   from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  FormSection, SelectField, DateField, TimeField,
} from "@/shared/components/forms";
import { ClientPropertyField } from "@/shared/components/common/ClientPropertyField";
import { EntityPickerField } from "@/shared/components/common/EntityPickerField";
import type { EntityOption } from "@/shared/components/common/EntityPickerField";
import { EmployeeForm } from "@/features/employees/components/EmployeeForm";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { cn } from "@/shared/utils/cn";
import { FORM_SECTION_GAP } from "@/shared/constants/formTokens";
import type { WalkthroughFormData } from "../schemas/walkthroughSchema";
import { useCreateWalkthrough, useUpdateWalkthrough, useWalkthrough } from "../hooks/useWalkthroughs";
import { supabase } from "@/integrations/supabase/client";
import { useAllEmployees } from "@/features/employees/hooks/useEmployees";
import { useClients } from "@/features/crm/clients/hooks/useClients";
import type { ClientEntity } from "@/shared/types/entities";
import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_TYPE_OPTIONS = [
  { value: "residential", label: "Residential" },
  { value: "commercial",  label: "Commercial"  },
] as const;

const DURATION_OPTIONS = [
  { value: "30",  label: "30 minutes" },
  { value: "60",  label: "1 hour"     },
  { value: "90",  label: "1.5 hours"  },
  { value: "120", label: "2 hours"    },
] as const;

/** yyyy-MM-dd → Date local (evita el corrimiento de zona horaria de `new Date(str)`). */
function parseDateOnly(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddWalkthroughPageProps {
  open?: boolean;
  onClose?: () => void;
  // Conversion-from-request prefill
  fromRequestId?:      string;          // booking ID → finaliza la conversión tras guardar
  walkthroughEditId?:  string;          // draft ID  → UPDATE en vez de INSERT
  prefillContactType?: "client";
  prefillContactId?:   string;
  prefillServiceType?: "residential" | "commercial";
  prefillDate?:        string;          // yyyy-MM-dd
  prefillTime?:        string;          // HH:mm
  prefillNotes?:       string;
  prefillPropertyId?:  string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddWalkthroughPage({
  open, onClose,
  fromRequestId:      fromRequestIdProp,
  walkthroughEditId,
  prefillContactId,
  prefillServiceType, prefillDate, prefillTime, prefillNotes, prefillPropertyId,
}: AddWalkthroughPageProps = {}) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const qc        = useQueryClient();
  const { id: urlWalkthroughId } = useParams<{ id: string }>();
  // El prop (conversión en modal) manda sobre el param de la URL
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

  const { mutate: create, isPending: isCreating } = useCreateWalkthrough();
  const { mutate: update, isPending: isUpdating } = useUpdateWalkthrough();
  const isPending = isCreating || isUpdating;

  // ── Form state ────────────────────────────────────────────────────────────
  const [selectedClient,   setSelectedClient]   = useState<ClientEntity | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<ClientProperty | null>(null);
  const [serviceType,      setServiceType]      = useState<string>(prefillServiceType ?? "residential");
  const [selectedDate,     setSelectedDate]     = useState<Date | undefined>(
    prefillDate ? parseDateOnly(prefillDate) : undefined,
  );
  const [scheduledTime,    setScheduledTime]    = useState(prefillTime ?? "");
  const [duration,         setDuration]         = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [notes,            setNotes]            = useState(prefillNotes ?? "");

  const [errors, setErrors] = useState({ client: false, serviceType: false, date: false, time: false });

  // ── Local UI state ────────────────────────────────────────────────────────
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [confirmOpen, setConfirmOpen]               = useState(false);
  const [pendingPayload, setPendingPayload]         = useState<WalkthroughFormData | null>(null);

  // ── Prefill en modo EDIT (incluye el draft creado al convertir un request) ─
  const [editPrefillDone, setEditPrefillDone] = useState(false);
  useEffect(() => {
    if (!isEdit || editPrefillDone || !existing) return;
    setServiceType(existing.service_type ?? "residential");
    setSelectedDate(parseDateOnly(existing.scheduled_date ?? ""));
    setScheduledTime(existing.scheduled_time ?? "");
    setDuration(existing.duration != null ? String(existing.duration) : "");
    setSelectedEmployees(existing.assigned_employees ?? []);
    setNotes(existing.notes ?? "");
    setEditPrefillDone(true);
  }, [isEdit, editPrefillDone, existing]);

  // ── Cliente: se resuelve cuando carga la lista (edit y conversión) ────────
  const [clientPrefillDone, setClientPrefillDone] = useState(false);
  useEffect(() => {
    if (clientPrefillDone || allClients.length === 0) return;
    const clientId = isEdit ? existing?.client_id : prefillContactId;
    if (!clientId) return;
    const found = allClients.find((c) => c.id === clientId);
    if (found) {
      setSelectedClient(found as unknown as ClientEntity);
      setClientPrefillDone(true);
    }
  }, [clientPrefillDone, allClients, isEdit, existing?.client_id, prefillContactId]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleClientChange = (client: ClientEntity | null) => {
    setSelectedClient(client);
    // La propiedad depende del cliente: ServicePropertySelector re-resuelve la primary.
    setSelectedProperty(null);
    if (client) setErrors((p) => ({ ...p, client: false }));
  };

  function toggleEmployee(empId: string) {
    setSelectedEmployees((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  }

  const employeeOptions: EntityOption[] = employees.map((e) => ({
    id: e.id,
    label: `${e.first_name} ${e.last_name}`,
  }));

  const selectedEmployeeOptions: EntityOption[] = employeeOptions.filter((o) =>
    selectedEmployees.includes(o.id)
  );

  function handleEmployeeSelectionChange(next: EntityOption[]) {
    setSelectedEmployees(next.map((o) => o.id));
  }

  const assignedEmployeeDetails = employees.filter((e) => selectedEmployees.includes(e.id));

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit() {
    const nextErrors = {
      client:      !selectedClient,
      serviceType: !serviceType,
      date:        !selectedDate,
      time:        !scheduledTime,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setPendingPayload({
      walkthrough_type:   "client",
      client_id:          selectedClient!.id,
      property_id:        selectedProperty?.id ?? null,
      service_type:       serviceType as "residential" | "commercial",
      scheduled_date:     format(selectedDate!, "yyyy-MM-dd"),
      scheduled_time:     scheduledTime,
      duration:           duration || undefined,
      assigned_employees: selectedEmployees,
      notes:              notes || undefined,
    });
    setConfirmOpen(true);
  }

  // ── Confirm save (create y edit) ──────────────────────────────────────────

  function handleConfirm() {
    if (!pendingPayload) return;

    if (isEdit && walkthroughId) {
      // Edit: Draft o Cancelled vuelven a Scheduled; el resto conserva su status.
      const currentStatus = existing?.status ?? "";
      const newStatus = (currentStatus === "Draft" || currentStatus === "Cancelled")
        ? "Scheduled"
        : undefined;

      update({ id: walkthroughId, data: pendingPayload, newStatus }, {
        onSuccess: () => { setConfirmOpen(false); setPendingPayload(null); handleClose(); },
      });
    } else {
      create({ data: pendingPayload, bookingId: fromRequestId }, {
        onSuccess: async (newWalkthrough) => {
          setConfirmOpen(false);
          setPendingPayload(null);
          if (fromRequestId && newWalkthrough?.id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).rpc("finalize_booking_conversion", {
              p_booking_id:     fromRequestId,
              p_estimate_id:    null,
              p_walkthrough_id: newWalkthrough.id,
            });
            qc.invalidateQueries({ queryKey: QK.requests });
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

  const formCards = (
    <>
      <ClientPropertyField
        client={selectedClient}
        onClientChange={handleClientChange}
        property={selectedProperty}
        onPropertyChange={setSelectedProperty}
        preferredPropertyId={existing?.property_id ?? prefillPropertyId}
        invalid={errors.client}
        subtitle="Who the walkthrough is for and where it takes place"
      />

      {/* ── Service ───────────────────────────────────────────────── */}
      <FormSection
        icon={Briefcase}
        title="Service"
        subtitle="Type of service and how long the visit should take"
        invalid={errors.serviceType}
      >
        <SelectField
          placeholder="Select service type"
          value={serviceType}
          onChange={(v) => { setServiceType(v); setErrors((p) => ({ ...p, serviceType: false })); }}
          options={SERVICE_TYPE_OPTIONS}
          required
          error={errors.serviceType && "Service type is required"}
        />
        <SelectField
          placeholder="Select duration"
          value={duration}
          onChange={setDuration}
          options={DURATION_OPTIONS}
        />
      </FormSection>

      {/* ── Schedule ──────────────────────────────────────────────── */}
      <FormSection
        icon={FileText}
        title="Schedule"
        subtitle="When the crew visits the property"
        invalid={errors.date || errors.time}
      >
        <DateField
          placeholder="Select date"
          value={selectedDate}
          onChange={(d) => { setSelectedDate(d); setErrors((p) => ({ ...p, date: false })); }}
          required
          error={errors.date && "Date is required"}
        />
        <TimeField
          id="scheduled_time"
          label="Time"
          value={scheduledTime}
          onChange={(v) => { setScheduledTime(v); setErrors((p) => ({ ...p, time: false })); }}
          required
          error={errors.time && "Time is required"}
        />
      </FormSection>

      {/* ── Crew ──────────────────────────────────────────────────── */}
      <FormSection
        icon={Users}
        title="Crew"
        subtitle="Employees assigned to this walkthrough"
      >
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
          <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
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
      </FormSection>

      {/* ── Notes ─────────────────────────────────────────────────── */}
      <FormSection
        icon={FileText}
        title="Notes"
        subtitle="Anything the crew should know before the visit"
      >
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Enter notes here..."
          className="min-h-[100px] rounded-md"
        />
      </FormSection>
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

  // ── Confirm dialog ────────────────────────────────────────────────────────
  const currentStatus = existing?.status ?? "";
  const willSchedule  = currentStatus === "Draft" || currentStatus === "Cancelled";
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
            <span className="text-sm text-muted-foreground">Client</span>
            <span className="text-sm font-semibold">{selectedClient?.full_name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Date</span>
            <span className="text-sm font-semibold">
              {selectedDate ? formatDisplayDate(selectedDate) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Time</span>
            <span className="text-sm font-semibold">{scheduledTime || "—"}</span>
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

  // ── Modal mode ────────────────────────────────────────────────────────────
  if (isModal) {
    return (
      <FullScreenModal open={open ?? false} onClose={handleClose}>
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

        <div className="flex-1 overflow-y-auto bg-background">
          <div className="max-w-2xl mx-auto px-4 py-2.5">
            <div className={FORM_SECTION_GAP}>
              {formCards}
              <div className="bg-white rounded-lg border p-4 flex items-center justify-between gap-3">
                <Button variant="outline" size="sm" type="button" onClick={handleClose}>
                  Cancel
                </Button>
                <Button size="sm" type="button" onClick={handleSubmit} disabled={isPending}>
                  {submitLabel}
                </Button>
              </div>
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
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background">
        <Button variant="ghost" size="icon" type="button" onClick={handleClose}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold flex-1">
          {isEdit ? "Edit Walkthrough" : "Schedule Walkthrough"}
        </h1>
      </div>

      <div className={cn("max-w-2xl mx-auto p-2.5 pb-6", FORM_SECTION_GAP)}>
        {formCards}
      </div>

      <div className="sticky bottom-0 bg-background border-t px-4 py-3">
        <div className="max-w-2xl mx-auto grid grid-cols-2 gap-3">
          <Button variant="outline" type="button" className="h-12" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" className="h-12" onClick={handleSubmit} disabled={isPending}>
            {submitLabel}
          </Button>
        </div>
      </div>

      {employeeModal}
      {confirmDialog}
    </div>
  );
}
