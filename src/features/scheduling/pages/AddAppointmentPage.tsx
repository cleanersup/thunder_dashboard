/**
 * @module AddAppointmentPage
 * Multi-step wizard for creating or editing a route appointment.
 * Follows the same SOLID pattern as the estimate wizards:
 *  - Page = thin orchestrator (state + validate + renderStep)
 *  - AppointmentFormLayout = shared shell (header + progress + tabs + footer)
 *  - Step components = dumb presentational, one responsibility each
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import { format } from "date-fns";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { useRoutes, useCreateRoute } from "../hooks/useRoutes";
import { useCreateAppointment, useUpdateAppointment, useAppointment, useEmployeesForScheduling } from "../hooks/useAppointments";
import { useSendAppointmentSMS }   from "../hooks/useSendAppointmentSMS";
import { useSendAppointmentEmail } from "../hooks/useSendAppointmentEmail";
import { resolveStorageUrl, downloadAppointmentFile } from "../services/appointmentsService";
import { uploadContractFile, uploadAppointmentPhotos } from "../services/appointmentFilesService";
import { useClients } from "@/features/crm/clients/hooks/useClients";
import { APPOINTMENT_STEPS } from "../config/appointmentSteps.config";
import { AppointmentFormLayout }    from "../components/AppointmentFormLayout";
import { AppointmentRouteStep }     from "../components/steps/AppointmentRouteStep";
import { AppointmentClientStep }    from "../components/steps/AppointmentClientStep";
import { AppointmentServiceStep }   from "../components/steps/AppointmentServiceStep";
import { AppointmentScheduleStep }  from "../components/steps/AppointmentScheduleStep";
import { AppointmentStaffStep }     from "../components/steps/AppointmentStaffStep";
import { AppointmentDepositStep }   from "../components/steps/AppointmentDepositStep";
import { AppointmentContractStep }  from "../components/steps/AppointmentContractStep";
import { AppointmentNotesStep }     from "../components/steps/AppointmentNotesStep";
import { AppointmentPreviewStep }   from "../components/steps/AppointmentPreviewStep";
import { AppointmentSendStep }      from "../components/steps/AppointmentSendStep";
import type { AppointmentFormData } from "../types/scheduling.types";
import type { ClientEntity } from "@/shared/types/entities";

// ─── Default form state ────────────────────────────────────────────────────────

function emptyForm(routeId: string, date: string): AppointmentFormData {
  return {
    route_id:                routeId,
    client_id:               "",
    scheduled_date:          date,
    scheduled_time:          "",
    end_time:                "",
    service_type:            "",
    cleaning_type:           null,
    assigned_employees:      [],
    notes:                   null,
    deposit_required:        "no",
    deposit_amount:          null,
    recurring_frequency:     "none",
    recurring_duration:      null,
    recurring_duration_unit: "months",
    selected_week_days:      [],
    delivery_method:         null,
  };
}

const LAST_STEP = APPOINTMENT_STEPS.length - 1;

// Step indices (named for clarity)
const STEP_SEND = 9;

// ─── Component ────────────────────────────────────────────────────────────────

interface AddAppointmentPageProps {
  open?: boolean;
  onClose?: () => void;
  /** Called after a successful appointment update (e.g. to refetch calendar data) */
  onUpdated?: () => void;
  /** Pre-selected route ID when opened as modal */
  defaultRouteId?: string;
  /** Pre-selected date (yyyy-MM-dd) when opened as modal */
  defaultDate?: string;
  /** Appointment ID to edit — used when the wizard is opened as a modal for editing */
  editId?: string;
}

export function AddAppointmentPage({ open, onClose, onUpdated, defaultRouteId, defaultDate, editId }: AddAppointmentPageProps = {}) {
  const navigate = useNavigate();
  const { id: urlId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const id     = editId ?? urlId;
  const isEdit = !!id;
  const isModal = open !== undefined;

  const prefilledRouteId = defaultRouteId ?? searchParams.get("route") ?? "";
  const prefilledDate    = defaultDate    ?? searchParams.get("date")  ?? format(new Date(), "yyyy-MM-dd");

  const [step,   setStep]   = useState(0);
  const [form,   setForm]   = useState<AppointmentFormData>(() => emptyForm(prefilledRouteId, prefilledDate));
  const [errors, setErrors] = useState<Partial<Record<keyof AppointmentFormData, string>>>({});

  // Extra UI state not part of the submitted form
  const [selectedClientObject, setSelectedClientObject] = useState<ClientEntity | null>(null);
  const [customCleaningTypes,  setCustomCleaningTypes]  = useState<string[]>([]);
  const [contractFile,         setContractFile]         = useState<File | null>(null);
  const [uploadedPhotos,       setUploadedPhotos]       = useState<File[]>([]);
  // Existing files from DB (shown when editing)
  const [existingContractUrl,  setExistingContractUrl] = useState<string | null>(null);
  const [existingPhotoUrls,    setExistingPhotoUrls]    = useState<string[]>([]);
  const [existingPhotoPaths,   setExistingPhotoPaths]   = useState<string[]>([]);
  // User removed existing files (edit mode)
  const [removedExistingContract,   setRemovedExistingContract]   = useState(false);
  const [removedExistingPhotoPaths, setRemovedExistingPhotoPaths] = useState<Set<string>>(new Set());

  // ─── Data ──────────────────────────────────────────────────────────────────

  const { data: routes = [],   isLoading: routesLoading   } = useRoutes();
  const { data: employees = [], isLoading: empLoading     } = useEmployeesForScheduling();
  const { data: clients  = [], isLoading: clientsLoading  } = useClients();
  const { data: existing,       isLoading: existingLoading } = useAppointment(id);

  const { mutate: createAppointment, isPending: isCreating } = useCreateAppointment();
  const { mutate: updateAppointment, isPending: isUpdating } = useUpdateAppointment();
  const { mutate: createRoute, isPending: isCreatingRoute  } = useCreateRoute();
  const { sendAppointmentSMS }   = useSendAppointmentSMS();
  const { sendAppointmentEmail } = useSendAppointmentEmail();

  const isPending = isCreating || isUpdating;

  // ─── Prefill on edit ───────────────────────────────────────────────────────

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        route_id:                existing.route_id,
        client_id:               existing.client_id,
        scheduled_date:          existing.scheduled_date,
        scheduled_time:          existing.scheduled_time ?? "",
        end_time:                existing.end_time ?? "",
        service_type:            existing.service_type ?? "",
        cleaning_type:           existing.cleaning_type ?? null,
        assigned_employees:      (existing.assigned_employees as string[] | null) ?? [],
        notes:                   existing.notes ?? null,
        deposit_required:        (existing.deposit_required as "yes" | "no") ?? "no",
        deposit_amount:          existing.deposit_amount,
        recurring_frequency:
          (existing.recurring_frequency as AppointmentFormData["recurring_frequency"]) ?? "none",
        recurring_duration:      existing.recurring_duration ?? null,
        recurring_duration_unit:
          (existing.recurring_duration_unit as AppointmentFormData["recurring_duration_unit"]) ?? "months",
        selected_week_days:      (existing.selected_week_days as string[] | null) ?? [],
        delivery_method:
          (existing.delivery_method as AppointmentFormData["delivery_method"]) ?? null,
      });

      // Pre-fill the client object for the client step / preview
      if (existing.clients) {
        setSelectedClientObject({
          id:              existing.clients.id,
          full_name:       existing.clients.full_name,
          company:         null,
          phone:           existing.clients.phone,
          email:           existing.clients.email,
          service_street:  existing.clients.service_street,
          service_apt:     existing.clients.service_apt,
          service_city:    existing.clients.service_city,
          service_state:   existing.clients.service_state,
          service_zip:     existing.clients.service_zip,
        });
      }
      // Pre-fill existing contract and photos for display on edit
      const contractVal = existing.uploaded_file;
      const contractUrl = typeof contractVal === "string" && contractVal.trim()
        ? resolveStorageUrl("route-files", contractVal)
        : null;
      setExistingContractUrl(contractUrl);

      const photosVal = existing.photos;
      const photoUrls: string[] = [];
      const photoPaths: string[] = [];
      if (Array.isArray(photosVal)) {
        for (const p of photosVal) {
          let raw: string | null = null;
          if (typeof p === "string" && p.trim()) raw = p;
          else if (p && typeof p === "object" && "url" in p && typeof (p as { url: unknown }).url === "string")
            raw = (p as { url: string }).url;
          if (raw) {
            photoPaths.push(raw);
            photoUrls.push(resolveStorageUrl("route-files", raw));
          }
        }
      }
      setExistingPhotoUrls(photoUrls);
      setExistingPhotoPaths(photoPaths);
      setRemovedExistingContract(false);
      setRemovedExistingPhotoPaths(new Set());
    } else {
      setExistingContractUrl(null);
      setExistingPhotoUrls([]);
      setExistingPhotoPaths([]);
      setRemovedExistingContract(false);
      setRemovedExistingPhotoPaths(new Set());
    }
  }, [existing, isEdit]);

  // ─── Generic setter ────────────────────────────────────────────────────────

  function set<K extends keyof AppointmentFormData>(key: K, value: AppointmentFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // ─── Route creation ────────────────────────────────────────────────────────

  function handleCreateRoute() {
    const nextName = `Route ${routes.length + 1}`;
    createRoute(nextName, {
      onSuccess: (newRoute) => {
        set("route_id", newRoute.id);
      },
    });
  }

  // ─── Client selection ──────────────────────────────────────────────────────

  function handleClientSelect(client: ClientEntity) {
    setSelectedClientObject(client);
    set("client_id", client.id);
    if (errors.client_id) setErrors((prev) => ({ ...prev, client_id: undefined }));
  }

  // ─── Per-step validation ───────────────────────────────────────────────────

  function validate(stepIndex: number): boolean {
    const errs: typeof errors = {};
    switch (stepIndex) {
      case 0:
        if (!form.route_id)      errs.route_id     = "Route is required";
        break;
      case 1:
        if (!form.client_id)     errs.client_id    = "Client is required";
        break;
      case 2:
        if (!form.service_type)  errs.service_type  = "Service type is required";
        if (!form.cleaning_type) errs.cleaning_type = "Cleaning type is required";
        if (form.service_type === "Recurring") {
          if (!form.recurring_frequency || form.recurring_frequency === "none") {
            errs.recurring_frequency = "Please select a frequency";
          }
          if (form.recurring_frequency === "multiple" && (form.selected_week_days ?? []).length === 0) {
            errs.selected_week_days = "Please select at least one day";
          }
          const frequencySet = form.recurring_frequency && form.recurring_frequency !== "none";
          const daysOk =
            form.recurring_frequency !== "multiple" ||
            (form.selected_week_days ?? []).length > 0;
          if (frequencySet && daysOk && !form.recurring_duration) {
            errs.recurring_duration = "Contract duration is required";
          }
        }
        break;
      case 3:
        if (!form.scheduled_date) errs.scheduled_date = "Date is required";
        if (!form.scheduled_time) errs.scheduled_time = "Start time is required";
        break;
      case 4:
        if (!form.assigned_employees?.length) errs.assigned_employees = "An employee must be selected when creating a service for a route";
        break;
      case STEP_SEND:
        if (!form.delivery_method) errs.delivery_method = "Please select a delivery method";
        break;
      default:
        break;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  function handleNext() {
    if (!validate(step)) return;
    if (step === LAST_STEP) {
      handleSubmit();
      return;
    }
    setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function sendDelivery(appointmentId: string, isUpdate: boolean) {
    const dm = form.delivery_method;
    if (dm === "email" || dm === "both") {
      sendAppointmentEmail({ appointmentId, isUpdate });
    }
    if (dm === "sms" || dm === "both") {
      sendAppointmentSMS({ appointmentId, isUpdate });
    }
  }

  function handleExit() {
    if (isModal) onClose?.();
    else navigate("/create-route");
  }

  async function handleSubmit() {
    let uploadedFilePath: string | null = null;
    let uploadedPhotoPaths: string[] = [];

    try {
      if (contractFile) {
        uploadedFilePath = await uploadContractFile(contractFile);
      } else if (isEdit && existing?.uploaded_file && !removedExistingContract) {
        uploadedFilePath = existing.uploaded_file;
      }

      if (uploadedPhotos.length > 0) {
        uploadedPhotoPaths = await uploadAppointmentPhotos(uploadedPhotos);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload files");
      return;
    }

    // Merge with existing photos for update (exclude user-removed ones)
    const keptExistingPhotoPaths: string[] = [];
    if (isEdit && existing?.photos && Array.isArray(existing.photos)) {
      for (const p of existing.photos) {
        const raw = typeof p === "string" && p.trim() ? p : (p && typeof p === "object" && "url" in p ? (p as { url: string }).url : null);
        if (raw && !removedExistingPhotoPaths.has(raw)) keptExistingPhotoPaths.push(raw);
      }
    }
    const allPhotoPaths = [...keptExistingPhotoPaths, ...uploadedPhotoPaths];

    const payload = {
      ...form,
      uploaded_file: uploadedFilePath,
      photos: allPhotoPaths.length ? allPhotoPaths : null,
    };

    if (isEdit && id) {
      updateAppointment(
        { id, data: payload },
        {
          onSuccess: () => {
            sendDelivery(id, true);
            onUpdated?.();
            handleExit();
          },
        },
      );
    } else {
      createAppointment(payload, {
        onSuccess: (created) => {
          const firstId = Array.isArray(created) ? created[0]?.id : undefined;
          if (firstId) sendDelivery(firstId, false);
          handleExit();
        },
      });
    }
  }

  // ─── Step renderer ─────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <AppointmentRouteStep
            routes={routes}
            routeId={form.route_id}
            onRouteChange={(id) => set("route_id", id)}
            onCreateRoute={handleCreateRoute}
            isCreating={isCreatingRoute}
            isLoading={routesLoading}
            error={errors.route_id}
          />
        );
      case 1:
        return (
          <AppointmentClientStep
            clients={clients}
            isLoadingClients={clientsLoading}
            selectedClient={selectedClientObject}
            onClientSelect={handleClientSelect}
            error={errors.client_id}
          />
        );
      case 2:
        return (
          <AppointmentServiceStep
            serviceType={form.service_type}
            cleaningType={form.cleaning_type ?? null}
            recurringFrequency={form.recurring_frequency}
            recurringDuration={form.recurring_duration ?? null}
            recurringDurationUnit={form.recurring_duration_unit ?? null}
            selectedWeekDays={form.selected_week_days ?? []}
            customCleaningTypes={customCleaningTypes}
            errors={{
              service_type:        errors.service_type,
              cleaning_type:       errors.cleaning_type,
              recurring_frequency: errors.recurring_frequency,
              selected_week_days:  errors.selected_week_days,
              recurring_duration:  errors.recurring_duration,
            }}
            onChange={set}
            onCustomCleaningTypesChange={setCustomCleaningTypes}
          />
        );
      case 3:
        return (
          <AppointmentScheduleStep
            scheduledDate={form.scheduled_date}
            scheduledTime={form.scheduled_time}
            endTime={form.end_time}
            errors={{ scheduled_date: errors.scheduled_date, scheduled_time: errors.scheduled_time }}
            onDateChange={(d)      => set("scheduled_date", d)}
            onStartTimeChange={(t) => set("scheduled_time", t)}
            onEndTimeChange={(t)   => set("end_time", t)}
          />
        );
      case 4:
        return (
          <AppointmentStaffStep
            employees={employees}
            selected={form.assigned_employees ?? []}
            scheduledTime={form.scheduled_time}
            endTime={form.end_time}
            onToggle={(empId) => {
              const current = form.assigned_employees ?? [];
              set(
                "assigned_employees",
                current.includes(empId)
                  ? current.filter((eid) => eid !== empId)
                  : [...current, empId],
              );
            }}
            isLoading={empLoading}
            error={errors.assigned_employees}
          />
        );
      case 5:
        return (
          <AppointmentDepositStep
            depositRequired={form.deposit_required}
            depositAmount={form.deposit_amount ?? null}
            onDepositRequiredChange={(v) => set("deposit_required", v)}
            onDepositAmountChange={(a)   => set("deposit_amount", a)}
          />
        );
      case 6:
        return (
          <AppointmentContractStep
            contractFile={contractFile}
            existingContractUrl={!removedExistingContract ? existingContractUrl : null}
            existingContractPath={!removedExistingContract ? existing?.uploaded_file ?? null : null}
            clientName={selectedClientObject?.full_name}
            onChange={setContractFile}
            onDownload={(path, filename) => {
              downloadAppointmentFile("route-files", path, filename).catch(() =>
                toast.error("Failed to download document"),
              );
            }}
            onRemoveExisting={isEdit ? () => setRemovedExistingContract(true) : undefined}
          />
        );
      case 7: {
        const visiblePhotoIndices = existingPhotoPaths
          .map((p, i) => (removedExistingPhotoPaths.has(p) ? -1 : i))
          .filter((i) => i >= 0);
        const visiblePhotoUrls = visiblePhotoIndices.map((i) => existingPhotoUrls[i]);
        const visiblePhotoPaths = visiblePhotoIndices.map((i) => existingPhotoPaths[i]);
        return (
          <AppointmentNotesStep
            notes={form.notes ?? null}
            photos={uploadedPhotos}
            existingPhotoUrls={visiblePhotoUrls}
            existingPhotoPaths={visiblePhotoPaths}
            clientName={selectedClientObject?.full_name}
            onChange={(n) => set("notes", n)}
            onPhotosChange={setUploadedPhotos}
            onDownloadPhoto={(path, filename) => {
              downloadAppointmentFile("route-files", path, filename).catch(() =>
                toast.error("Failed to download photo"),
              );
            }}
            onRemoveExistingPhoto={isEdit ? (path) => setRemovedExistingPhotoPaths((prev) => new Set(prev).add(path)) : undefined}
          />
        );
      }
      case 8: {
        const previewPhotoIndices = existingPhotoPaths
          .map((p, i) => (removedExistingPhotoPaths.has(p) ? -1 : i))
          .filter((i) => i >= 0);
        const previewPhotoUrls = previewPhotoIndices.map((i) => existingPhotoUrls[i]);
        return (
          <AppointmentPreviewStep
            form={form}
            routes={routes}
            selectedClient={selectedClientObject}
            employees={employees}
            contractFile={contractFile}
            existingContractUrl={!removedExistingContract ? existingContractUrl : null}
            uploadedPhotos={uploadedPhotos}
            existingPhotoUrls={previewPhotoUrls}
          />
        );
      }
      case 9:
        return (
          <AppointmentSendStep
            deliveryMethod={form.delivery_method ?? null}
            clientEmail={selectedClientObject?.email ?? ""}
            clientPhone={selectedClientObject?.phone ?? ""}
            onChange={(v) => set("delivery_method", v)}
            error={!!errors.delivery_method}
          />
        );
      default:
        return null;
    }
  }

  // ─── Loading state (edit prefill) ──────────────────────────────────────────

  if (isEdit && existingLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const layout = (
    <AppointmentFormLayout
      title={isEdit ? "Edit Appointment" : "New Appointment"}
      steps={APPOINTMENT_STEPS}
      currentStep={step}
      onBack={handleBack}
      onNext={handleNext}
      onExit={handleExit}
      isLastStep={step === LAST_STEP}
      isLoading={isPending}
      isEditing={isEdit}
      isModal={isModal}
    >
      {renderStep()}
    </AppointmentFormLayout>
  );

  if (isModal) {
    return (
      <FullScreenModal open={open ?? false} onClose={handleExit}>
        {layout}
      </FullScreenModal>
    );
  }

  return layout;
}
