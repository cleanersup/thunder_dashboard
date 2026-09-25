/**
 * Formulario de Request — **referencia del kit de formularios** (`shared/components/forms`).
 *
 * Al construir o migrar otro formulario, copiar de aquí la estructura:
 *   · cada bloque es un `FormSection` (ícono + título + subtítulo);
 *   · cada control es una molécula del kit con su placeholder;
 *   · hover/foco/alto vienen de los tokens, nunca se escriben a mano.
 */
import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft, CalendarClock, Home, Building2, Paperclip,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button }    from "@/shared/components/ui/button";
import {
  FormSection, FloatingInput, SelectField, DateField, OptionGrid, TextareaField,
  AttachmentsField,
} from "@/shared/components/forms";
import { ClientPropertyField }      from "@/shared/components/common/ClientPropertyField";
import { useClients }               from "@/features/crm/clients/hooks/useClients";
import { toast }    from "sonner";
import { format }   from "date-fns";
import { cn }       from "@/shared/utils/cn";
import { FORM_SECTION_GAP } from "@/shared/constants/formTokens";
import { TIME_PREFERENCE_OPTIONS, normalizeTimePreference } from "@/shared/utils/timePreference";
import type { RequestPayload, BookingAttachmentMeta } from "../types/request.types";
import type { CustomQuestion } from "../hooks/useCustomQuestions";
import type { Client } from "@/features/crm/types/crm.types";
import type { ClientEntity } from "@/shared/types/entities";
import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILES         = 10;
const MAX_FILE_BYTES    = 2 * 1024 * 1024; // 2 MB
const MAX_DIMENSION     = 2048;

const ADDITIONAL_SERVICES = [
  "Kitchen", "Oven", "Refrigerator", "Living Room",
  "Dining Room", "Patio", "Garage", "Pets", "Laundry", "Windows",
] as const;

const COMMERCIAL_TYPES = [
  "School", "Church", "Office", "Warehouse", "Restaurant", "Other",
] as const;

const SERVICE_TYPE_OPTIONS = [
  { value: "residential", label: "Residential" },
  { value: "commercial",  label: "Commercial"  },
] as const;

// ─── Image compression ───────────────────────────────────────────────────────

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width  = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      const tryCompress = () => {
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error("Compression failed")); return; }
          if (blob.size <= MAX_FILE_BYTES || quality <= 0.4) {
            const base = file.name.replace(/\.[^.]+$/, "");
            resolve(new File([blob], `${base}.jpg`, { type: "image/jpeg" }));
          } else {
            quality = Math.round((quality - 0.1) * 10) / 10;
            tryCompress();
          }
        }, "image/jpeg", quality);
      };
      tryCompress();
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Failed to load image")); };
    img.src = objectUrl;
  });
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface RequestFormProps {
  title:            string;
  mode?:            "create" | "edit";
  isModal?:         boolean;
  /**
   * El contacto no se captura a mano: nombre, email, teléfono y dirección salen
   * siempre del client + property seleccionados (paridad swift-slate).
   */
  initialValues?:   Partial<{
    serviceType: string; selectedDate: Date | undefined; timePreference: string;
    bedrooms: string; bathrooms: string; additionalServices: string[];
    commercialType: string; otherCommercialType: string; serviceDetails: string;
    customAnswers: Record<string, string>;
    existingAttachments: BookingAttachmentMeta[];
    initialClientId:         string | null;
    initialClientPropertyId: string | null;
  }>;
  customQuestions:  CustomQuestion[];
  isSaving:         boolean;
  onSave:           (payload: RequestPayload) => void;
  onCancel:         () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RequestForm({
  title,
  mode = "create",
  isModal = false,
  initialValues,
  customQuestions,
  isSaving,
  onSave,
  onCancel,
}: RequestFormProps) {

  // ── Contact ───────────────────────────────────────────────────────────────
  const { data: allClients = [] } = useClients();

  const [selectedClient,   setSelectedClient]   = useState<Client | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<ClientProperty | null>(null);

  // ── Form fields ───────────────────────────────────────────────────────────
  const [serviceType,         setServiceType]         = useState(initialValues?.serviceType         ?? "");
  const [selectedDate,        setSelectedDate]        = useState<Date | undefined>(initialValues?.selectedDate);
  const [timePreference,      setTimePreference]      = useState(normalizeTimePreference(initialValues?.timePreference));
  const [bedrooms,            setBedrooms]            = useState(initialValues?.bedrooms            ?? "");
  const [bathrooms,           setBathrooms]           = useState(initialValues?.bathrooms           ?? "");
  const [additionalServices,  setAdditionalServices]  = useState<string[]>(initialValues?.additionalServices ?? []);
  const [commercialType,      setCommercialType]      = useState(initialValues?.commercialType      ?? "");
  const [otherCommercialType, setOtherCommercialType] = useState(initialValues?.otherCommercialType ?? "");
  const [serviceDetails,      setServiceDetails]      = useState(initialValues?.serviceDetails      ?? "");
  const [customAnswers,       setCustomAnswers]       = useState<Record<string, string>>(initialValues?.customAnswers ?? {});

  // ── Attachments ───────────────────────────────────────────────────────────
  const [keptAttachments,    setKeptAttachments]    = useState<BookingAttachmentMeta[]>(initialValues?.existingAttachments ?? []);
  const [attachmentFiles,    setAttachmentFiles]    = useState<File[]>([]);
  const [isProcessingFiles,  setIsProcessingFiles]  = useState(false);

  // ── Validation errors ─────────────────────────────────────────────────────
  const [errors, setErrors] = useState({ client: false, serviceType: false });

  // ── Pre-select the linked client (edit mode) once the list loads ──────────
  const didPreselect = useRef(false);
  useEffect(() => {
    if (didPreselect.current) return;
    const clientId = initialValues?.initialClientId;
    if (!clientId || allClients.length === 0) return;
    const found = allClients.find((c) => c.id === clientId);
    if (found) {
      didPreselect.current = true;
      setSelectedClient(found);
    }
  }, [allClients]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleClientSelect = (client: Client | null) => {
    setSelectedClient(client);
    setSelectedProperty(null);
    if (client) setErrors((p) => ({ ...p, client: false }));
  };

  const handleFilesSelected = async (selected: File[]) => {
    if (!selected.length) return;

    const slots = MAX_FILES - keptAttachments.length - attachmentFiles.length;
    if (slots <= 0) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }
    const toProcess = selected.slice(0, slots);
    if (selected.length > slots) {
      toast.info(`Only ${slots} slot(s) remaining — first ${slots} file(s) will be added.`);
    }

    setIsProcessingFiles(true);
    const result: File[] = [];
    for (const file of toProcess) {
      if (file.type.startsWith("image/")) {
        if (file.size <= MAX_FILE_BYTES) {
          result.push(file);
        } else {
          try {
            const compressed = await compressImage(file);
            result.push(compressed);
          } catch {
            toast.error(`Could not compress "${file.name}" — file skipped.`);
          }
        }
      } else if (file.type === "application/pdf") {
        if (file.size > MAX_FILE_BYTES) {
          toast.error(`"${file.name}" exceeds 2 MB. PDFs cannot be compressed.`);
        } else {
          result.push(file);
        }
      }
    }
    if (result.length) setAttachmentFiles((prev) => [...prev, ...result]);
    setIsProcessingFiles(false);
  };

  // ── Build and emit payload ────────────────────────────────────────────────

  const handleSave = () => {
    if (!selectedClient || !serviceType) {
      setErrors({ client: !selectedClient, serviceType: !serviceType });
      toast.error("Please fill in all required fields");
      return;
    }
    emitPayload(selectedClient);
  };

  const emitPayload = (client: Client) => {
    // La propiedad manda sobre la dirección de servicio del cliente. Cuando el
    // cliente aún no tiene propiedades el selector no se muestra y se usa su
    // dirección de servicio, que es de donde salió esa propiedad en primer lugar.
    const p = selectedProperty;
    const street = p?.street    ?? client.service_street ?? "";
    const apt    = p?.apt_suite ?? client.service_apt    ?? null;
    const city   = p?.city      ?? client.service_city   ?? "";
    const state  = p?.state     ?? client.service_state  ?? "";
    const zip    = p?.zip_code  ?? client.service_zip    ?? "";

    onSave({
      lead_name:                (client.full_name ?? "").trim(),
      email:                    (client.email     ?? "").trim(),
      phone:                    (client.phone     ?? "").trim(),
      street:                   street.trim()   || "N/A",
      apt_suite:                apt?.trim()     || null,
      city:                     city.trim()     || "N/A",
      state:                    state.trim()    || "N/A",
      zip_code:                 zip.trim()      || "N/A",
      service_type:             serviceType,
      preferred_date:           selectedDate ? format(selectedDate, "yyyy-MM-dd") : null,
      time_preference:          timePreference || null,
      bedrooms:                 bedrooms  ? parseInt(bedrooms)  : null,
      bathrooms:                bathrooms ? parseInt(bathrooms) : null,
      additional_services:      additionalServices.length > 0 ? additionalServices : null,
      commercial_property_type: commercialType || null,
      other_commercial_type:    otherCommercialType || null,
      service_details:          serviceDetails.trim() || null,
      custom_answers:           Object.keys(customAnswers).length > 0 ? customAnswers : null,
      client_id:                client.id,
      contact_type:             "client",
      client_property_id:       selectedProperty?.id ?? null,
      files:                    attachmentFiles.length > 0 ? attachmentFiles : undefined,
      existingAttachments:      keptAttachments,
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={isModal ? "" : "h-full bg-background pb-8"}>
      {/* Sticky header — page mode only */}
      {!isModal && (
        <div className="bg-card px-4 py-3 sticky top-0 z-10 border-b border-border/50">
          <div className="flex items-center justify-between">
            <button
              onClick={onCancel}
              className="p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold">{title}</h1>
            <div className="w-16" />
          </div>
        </div>
      )}

      <div className={cn(FORM_SECTION_GAP, !isModal && "pt-2.5")}>

        {/* ── Client + Service Property (requeridos) ───────────────── */}
        <ClientPropertyField
          client={selectedClient as unknown as ClientEntity | null}
          onClientChange={(c) => handleClientSelect(c as unknown as Client | null)}
          property={selectedProperty}
          onPropertyChange={setSelectedProperty}
          preferredPropertyId={initialValues?.initialClientPropertyId}
          invalid={errors.client}
          subtitle={mode === "edit"
            ? "Client this request belongs to and where the service happens"
            : "Who the request is for and where the service happens"}
          flush={!isModal}
        />

        {/* ── Preferred Date & Service ─────────────────────────────── */}
        <FormSection
          icon={CalendarClock}
          title="Preferred Date & Service"
          subtitle="When the client wants the service and what kind it is"
          flush={!isModal}
        >
          <DateField
            placeholder="Select preferred date"
            value={selectedDate}
            onChange={setSelectedDate}
          />

          <SelectField
            placeholder="Select time preference"
            value={timePreference}
            onChange={setTimePreference}
            options={TIME_PREFERENCE_OPTIONS}
          />

          <SelectField
            placeholder="Select service type"
            value={serviceType}
            onChange={(v) => { setServiceType(v); setErrors((p) => ({ ...p, serviceType: false })); }}
            options={SERVICE_TYPE_OPTIONS}
            required
            error={errors.serviceType && "Service type is required"}
          />
        </FormSection>

        {/* ── Residential Details ──────────────────────────────────── */}
        {serviceType === "residential" && (
          <FormSection
            icon={Home}
            title="Residential Service Details"
            subtitle="Size of the home and any extra areas to cover"
            flush={!isModal}
          >
            <FloatingInput id="bedrooms"  label="How many bedrooms"  type="integer" value={bedrooms}  onChange={setBedrooms} />
            <FloatingInput id="bathrooms" label="How many bathrooms" type="integer" value={bathrooms} onChange={setBathrooms} />

            <OptionGrid
              multiple
              label="Additional Services"
              options={ADDITIONAL_SERVICES}
              value={additionalServices}
              onChange={setAdditionalServices}
            />

            <TextareaField
              id="request-service-details"
              label="Service Details"
              placeholder="Anything the crew should know before the visit..."
              value={serviceDetails}
              onChange={setServiceDetails}
            />

            {customQuestions
              .filter((q) => q.formType === "residential")
              .map((q) => (
                <FloatingInput
                  key={q.id}
                  id={q.id}
                  label={q.question}
                  value={customAnswers[q.id] || ""}
                  onChange={(v) => setCustomAnswers((p) => ({ ...p, [q.id]: v }))}
                />
              ))}
          </FormSection>
        )}

        {/* ── Commercial Details ───────────────────────────────────── */}
        {serviceType === "commercial" && (
          <FormSection
            icon={Building2}
            title="Commercial Service Details"
            subtitle="Type of property and scope of the service"
            flush={!isModal}
          >
            <OptionGrid
              label="Property Type"
              options={COMMERCIAL_TYPES}
              value={commercialType || null}
              onChange={setCommercialType}
            />

            {commercialType === "Other" && (
              <FloatingInput id="otherType" label="Please specify" value={otherCommercialType} onChange={setOtherCommercialType} />
            )}

            <TextareaField
              id="request-service-details"
              label="Service Details"
              placeholder="Anything the crew should know before the visit..."
              value={serviceDetails}
              onChange={setServiceDetails}
            />

            {customQuestions
              .filter((q) => q.formType === "commercial")
              .map((q) => (
                <FloatingInput
                  key={q.id}
                  id={q.id}
                  label={q.question}
                  value={customAnswers[q.id] || ""}
                  onChange={(v) => setCustomAnswers((p) => ({ ...p, [q.id]: v }))}
                />
              ))}
          </FormSection>
        )}

        {/* ── Attachments ──────────────────────────────────────────── */}
        <FormSection
          icon={Paperclip}
          title="Attachments"
          subtitle="Photos or PDFs that help explain the job"
          flush={!isModal}
          action={
            <span className="text-xs text-muted-foreground">
              {keptAttachments.length + attachmentFiles.length}/{MAX_FILES}
            </span>
          }
        >
            <AttachmentsField
              existing={keptAttachments.map((att) => ({
                id: att.path, name: att.name, url: att.public_url, type: att.type,
              }))}
              onRemoveExisting={(idx) => setKeptAttachments((p) => p.filter((_, i) => i !== idx))}
              files={attachmentFiles}
              onAddFiles={handleFilesSelected}
              onRemoveFile={(idx) => setAttachmentFiles((p) => p.filter((_, i) => i !== idx))}
              accept="image/*,application/pdf"
              max={MAX_FILES}
              busy={isProcessingFiles}
              busyLabel="Compressing..."
              hint={`Images are automatically compressed to 2 MB · PDFs up to 2 MB · Max ${MAX_FILES} files`}
            />
        </FormSection>

        {/* ── Actions ──────────────────────────────────────────────── */}
        {isModal ? (
          <div className="bg-card p-4 flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        ) : (
          <Card className={cn(!isModal && "rounded-none border-0")}>
            <CardContent className="px-4 pt-4 pb-4 grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
}
