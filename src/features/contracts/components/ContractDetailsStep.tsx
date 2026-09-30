/**
 * @module ContractDetailsStep
 * El hub del contrato: todo lo que lo define, visible de una vez.
 *
 * Cada sección se resume en una línea y se edita en su `SectionModal`. Antes era
 * el primero de tres pasos con barra de progreso; ningún otro formulario de la
 * aplicación se recorre así desde que estimates pasó a hub, y el indicador
 * prometía un recorrido que el resto de la app ya no tiene.
 *
 * El destinatario usa `ClientSelect`, el mismo selector que invoices y requests.
 * Antes usaba `ClientPicker`, que no usaba nadie más.
 */
import { useState, useMemo, useEffect, useRef, type ReactNode } from "react";
import { format } from "date-fns";
import { formatDisplayDate } from "@/shared/utils/formatters";
import {
  CalendarIcon, DollarSign, Building2, Check, ClipboardList, Globe, Hash, User,
} from "lucide-react";
import { Button }   from "@/shared/components/ui/button";
import {
  FormSection, FloatingInput, SelectField, DateField, TextareaField,
  SectionModal, SummaryRow, SelectorRow,
} from "@/shared/components/forms";
import { toast }    from "sonner";
import { toDecimalString } from "@/shared/utils/numericInput";
import { ClientSelect }    from "@/shared/components/common/ClientSelect";
import { useContractDescription } from "../hooks/useContractDescription";
import { FieldActions, type FieldSource } from "./FieldActions";

/** Frecuencias de cobro — las mismas que acepta la columna `payment_frequency`. */
const PAYMENT_FREQUENCY_OPTIONS = [
  { value: "monthly",  label: "Monthly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "weekly",   label: "Weekly" },
  { value: "one-time", label: "One-time" },
];
import { initialSource } from "./fieldActions.utils";
import type { ClientEntity } from "@/shared/types/entities";
import type { ContractFormData, ContractPaymentFrequency } from "../types/contract.types";

// ─── Props ────────────────────────────────────────────────────────────────────

/** Saved defaults from the user's profile, used to show "Load Default" buttons. */
export interface ContractDescriptionDefaults {
  who_we_are:       string;
  why_choose_us:    string;
  our_services:     string;
  service_coverage: string;
}

interface ContractDetailsStepProps {
  formData:        ContractFormData;
  onChange:        (partial: Partial<ContractFormData>) => void;
  contractNumber:  string | undefined;
  /** Edit-mode: pre-selected client. */
  initialClient?:  ClientEntity | null;
  /** Saved profile defaults — drives "Load Default" buttons. */
  savedDefaults?:  ContractDescriptionDefaults;
  /** Abre la revisión final — sustituye al "Next" del wizard. */
  onReview: () => void;
  /**
   * Sección de cláusulas, que vive en la página porque su contenido abre su
   * propio modal. Se inyecta para que aparezca entre las descripciones y la
   * barra de acciones, sin que este componente sepa nada de cláusulas.
   */
  policiesSection?: ReactNode;
  /** Called when the user clicks Cancel. */
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContractDetailsStep({
  formData,
  onChange,
  contractNumber,
  initialClient = null,
  savedDefaults,
  onReview,
  onCancel,
  policiesSection,
}: ContractDetailsStepProps) {
  // ── Recipient state ───────────────────────────────────────────────────────
  const [selectedClient, setSelectedClient] = useState<ClientEntity | null>(initialClient);

  // Sync when parent loads the client async (edit mode)
  useEffect(() => {
    if (initialClient) setSelectedClient(initialClient);
  }, [initialClient]);

  // ── Date state (kept in sync with formData) ───────────────────────────────
  // Parse "yyyy-MM-dd" as local time to avoid UTC-offset day shift.
  const parseLocalDate = (iso: string): Date => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const [startDate, setStartDate] = useState<Date | undefined>(
    formData.start_date ? parseLocalDate(formData.start_date) : undefined,
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    formData.end_date ? parseLocalDate(formData.end_date) : undefined,
  );

  // Sync dates when parent loads contract data async (edit mode / draft reopen)
  useEffect(() => {
    if (formData.start_date) setStartDate(parseLocalDate(formData.start_date));
  }, [formData.start_date]);

  useEffect(() => {
    if (formData.end_date) setEndDate(parseLocalDate(formData.end_date));
  }, [formData.end_date]);

  // ── Auto-generate ─────────────────────────────────────────────────────────
  const { generateField, generatingField, saveDescription, savingField } = useContractDescription();

  // ── Field source tracking (drives the FieldActions state machine) ─────────
  type DescKey = "who_we_are" | "why_choose_us" | "our_services" | "service_coverage";
  const DESC_KEYS: DescKey[] = ["who_we_are", "why_choose_us", "our_services", "service_coverage"];

  const [fieldSources, setFieldSources] = useState<Record<DescKey, FieldSource>>(() => {
    const result = {} as Record<DescKey, FieldSource>;
    for (const key of DESC_KEYS) {
      result[key] = initialSource(formData[key] ?? "", "");
    }
    return result;
  });

  // Sync sources when savedDefaults loads (profile data arrives async)
  useEffect(() => {
    if (!savedDefaults) return;
    setFieldSources((prev) => {
      const next = { ...prev };
      for (const key of DESC_KEYS) {
        // Only update if still in an indeterminate state — preserve ai/user edits
        if (prev[key] === "empty" || prev[key] === "user") {
          next[key] = initialSource(formData[key] ?? "", savedDefaults[key] ?? "");
        }
      }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedDefaults]);

  const setFieldSource = (key: DescKey, src: FieldSource) =>
    setFieldSources((prev) => ({ ...prev, [key]: src }));

  // Dialogs for fields that accept a user-provided list before generating
  const [showServicesDialog, setShowServicesDialog] = useState(false);
  const [showCitiesDialog,   setShowCitiesDialog]   = useState(false);
  const [servicesInput,      setServicesInput]      = useState("");
  const [citiesInput,        setCitiesInput]        = useState("");

  const handleGenerateServices = async () => {
    setShowServicesDialog(false);
    const items = servicesInput.split("\n").map((s) => s.trim()).filter(Boolean);
    const result = await generateField("our_services", { services: items });
    if (result) { onChange({ our_services: result }); setFieldSource("our_services", "user"); clearError("our_services"); setServicesInput(""); }
  };

  const handleGenerateCities = async () => {
    setShowCitiesDialog(false);
    const items = citiesInput.split("\n").map((s) => s.trim()).filter(Boolean);
    const result = await generateField("service_coverage", { cities: items });
    if (result) { onChange({ service_coverage: result }); setFieldSource("service_coverage", "user"); clearError("service_coverage"); setCitiesInput(""); }
  };

  // ── Validation errors ─────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const clearError = (key: string) =>
    setErrors((prev) => { const n = new Set(prev); n.delete(key); return n; });

  // ── Client select handler ─────────────────────────────────────────────────
  const handleClientSelect = (client: ClientEntity | null) => {
    if (!client) { setSelectedClient(null); return; }
    if (!client.id) { toast.error("Selected client has no valid ID"); return; }
    setSelectedClient(client);
    const addr = [client.service_street, client.service_city, client.service_state, client.service_zip]
      .filter(Boolean).join(", ");
    onChange({
      recipient_name:    client.full_name,
      recipient_email:   client.email,
      recipient_phone:   client.phone,
      recipient_address: addr,
      recipient_type:    "client",
      recipient_id:      client.id,
    });
    clearError("recipient");
  };

  // ── Estimated total ───────────────────────────────────────────────────────
  const estimatedTotal = useMemo(() => {
    const amount = parseFloat(formData.total) || 0;
    if (!amount || !startDate || !endDate || formData.payment_frequency === "one-time") return null;
    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const periods =
      formData.payment_frequency === "weekly"   ? Math.ceil(diffDays / 7)  :
      formData.payment_frequency === "biweekly" ? Math.ceil(diffDays / 14) :
      Math.ceil(diffDays / 30);
    return { total: amount * periods, periods, amount };
  }, [formData.total, formData.payment_frequency, startDate, endDate]);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs = new Set<string>();
    if (!formData.recipient_id)                              errs.add("recipient");
    if (!startDate)                                          errs.add("start_date");
    if (!endDate)                                            errs.add("end_date");
    if (startDate && endDate && endDate <= startDate)        errs.add("end_date");
    if (!formData.total || parseFloat(formData.total) <= 0) errs.add("total");
    if (!formData.who_we_are?.trim())       errs.add("who_we_are");
    if (!formData.why_choose_us?.trim())    errs.add("why_choose_us");
    if (!formData.our_services?.trim())     errs.add("our_services");
    if (!formData.service_coverage?.trim()) errs.add("service_coverage");
    setErrors(errs);
    if (errs.size > 0) { toast.error("Please fill in all required fields"); return false; }
    return true;
  };


  // ── Secciones del hub ─────────────────────────────────────────────────────
  type SectionId = "period" | "value" | DescKey;

  const [openSection, setOpenSection] = useState<SectionId | null>(null);

  /**
   * Lo que había al abrir una sección. Cancelar en el modal devuelve el
   * formulario a este punto: los campos se editan en vivo sobre `formData`, así
   * que sin esto "Cancel" no cancelaría nada.
   */
  const snapshot = useRef<{
    start: Date | undefined;
    end:   Date | undefined;
    data:  Partial<ContractFormData>;
    sources: Record<DescKey, FieldSource>;
  } | null>(null);

  function openSectionModal(id: SectionId) {
    snapshot.current = {
      start: startDate,
      end:   endDate,
      data: {
        start_date: formData.start_date,
        end_date:   formData.end_date,
        total:      formData.total,
        payment_frequency: formData.payment_frequency,
        who_we_are: formData.who_we_are,
        why_choose_us: formData.why_choose_us,
        our_services: formData.our_services,
        service_coverage: formData.service_coverage,
      },
      sources: fieldSources,
    };
    setOpenSection(id);
  }

  function cancelSection() {
    const snap = snapshot.current;
    if (snap) {
      setStartDate(snap.start);
      setEndDate(snap.end);
      onChange(snap.data);
      setFieldSources(snap.sources);
    }
    setOpenSection(null);
  }

  // ── Resúmenes ─────────────────────────────────────────────────────────────
  const periodSummary = startDate && endDate
    ? `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`
    : null;

  const valueSummary = formData.total && parseFloat(formData.total) > 0
    ? `$${parseFloat(formData.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : null;

  const frequencyLabel = PAYMENT_FREQUENCY_OPTIONS
    .find((o) => o.value === formData.payment_frequency)?.label;

  /** Primeras palabras de un texto largo — el hub resume, no reproduce. */
  const excerpt = (text: string | undefined) => {
    const clean = (text ?? "").trim().replace(/\s+/g, " ");
    if (!clean) return null;
    return clean.length > 90 ? `${clean.slice(0, 90)}…` : clean;
  };

  /** Las cuatro descripciones se maquetan igual; solo cambian icono y textos. */
  const DESCRIPTION_SECTIONS: {
    key: DescKey; icon: typeof Building2; title: string; subtitle: string;
    placeholder: string; onGenerate: () => void;
  }[] = [
    {
      key: "who_we_are", icon: Building2,
      title: "Who We Are", subtitle: "How the company introduces itself in the contract",
      placeholder: "Briefly describe your company: name, what you do, and the services you provide.",
      onGenerate: async () => {
        const result = await generateField("who_we_are");
        if (result) { onChange({ who_we_are: result }); setFieldSource("who_we_are", "user"); clearError("who_we_are"); }
      },
    },
    {
      key: "why_choose_us", icon: Check,
      title: "Why Choose Us", subtitle: "What sets the company apart from the competition",
      placeholder: "Explain what makes your company the right choice for this client.",
      onGenerate: async () => {
        const result = await generateField("why_choose_us");
        if (result) { onChange({ why_choose_us: result }); setFieldSource("why_choose_us", "user"); clearError("why_choose_us"); }
      },
    },
    {
      key: "our_services", icon: ClipboardList,
      title: "Our Services", subtitle: "What the company does for the client",
      placeholder: "List the services included in this contract.",
      onGenerate: () => setShowServicesDialog(true),
    },
    {
      key: "service_coverage", icon: Globe,
      title: "Service Coverage", subtitle: "Where the company operates",
      placeholder: "Describe the geographic area or locations covered by this contract.",
      onGenerate: () => setShowCitiesDialog(true),
    },
  ];

  const openDescription = DESCRIPTION_SECTIONS.find((d) => d.key === openSection);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <FormSection
        icon={Hash}
        title="Contract Number"
        subtitle="Assigned automatically — it cannot be edited"
      >
        <SummaryRow icon={Hash}>{contractNumber ?? "Generating…"}</SummaryRow>
      </FormSection>

      <FormSection
        icon={User}
        title="Customer Information"
        subtitle="Who this contract is for"
        invalid={errors.has("recipient")}
      >
        <ClientSelect
          value={formData.recipient_id ?? undefined}
          selected={selectedClient}
          onChange={handleClientSelect}
          error={errors.has("recipient")}
          required
        />
      </FormSection>

      <FormSection
        icon={CalendarIcon}
        title="Contract Period"
        subtitle="When the agreement starts and ends"
        invalid={errors.has("start_date") || errors.has("end_date")}
        onEdit={periodSummary ? () => openSectionModal("period") : undefined}
      >
        {periodSummary ? (
          <SummaryRow icon={CalendarIcon}>{periodSummary}</SummaryRow>
        ) : (
          <SelectorRow
            label="+ Set Contract Period"
            required
            error={errors.has("start_date") || errors.has("end_date")}
            onClick={() => openSectionModal("period")}
          />
        )}
      </FormSection>

      <FormSection
        icon={DollarSign}
        title="Contract Value"
        subtitle="Amount charged and how often it is billed"
        invalid={errors.has("total")}
        onEdit={valueSummary ? () => openSectionModal("value") : undefined}
      >
        {valueSummary ? (
          <SummaryRow
            icon={DollarSign}
            subtitle={[
              frequencyLabel,
              estimatedTotal && `${estimatedTotal.periods} payments · $${estimatedTotal.total.toLocaleString("en-US", { minimumFractionDigits: 2 })} total`,
            ].filter(Boolean).join(" · ") || undefined}
          >
            {valueSummary}
          </SummaryRow>
        ) : (
          <SelectorRow
            label="+ Set Contract Value"
            required
            error={errors.has("total")}
            onClick={() => openSectionModal("value")}
          />
        )}
      </FormSection>

      {DESCRIPTION_SECTIONS.map(({ key, icon, title, subtitle }) => (
        <FormSection
          key={key}
          icon={icon}
          title={title}
          subtitle={subtitle}
          invalid={errors.has(key)}
          onEdit={excerpt(formData[key]) ? () => openSectionModal(key) : undefined}
        >
          {excerpt(formData[key]) ? (
            <SummaryRow icon={icon}>{excerpt(formData[key])}</SummaryRow>
          ) : (
            <SelectorRow
              label={`+ Write ${title}`}
              required
              error={errors.has(key)}
              onClick={() => openSectionModal(key)}
            />
          )}
        </FormSection>
      ))}

      {policiesSection}

      {/* ── Acciones ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" type="button" onClick={() => { if (validate()) onReview(); }}>
          Review
        </Button>
      </div>

      {/* ── Periodo ──────────────────────────────────────────────────────── */}
      <SectionModal
        open={openSection === "period"}
        onCancel={cancelSection}
        onSave={() => setOpenSection(null)}
        title="Contract Period"
        subtitle="When the agreement starts and ends"
      >
        <DateField
          placeholder="Start Date"
          required
          value={startDate}
          onChange={(d) => {
            setStartDate(d);
            onChange({ start_date: d ? format(d, "yyyy-MM-dd") : "" });
            clearError("start_date");
            // Un fin anterior al nuevo inicio deja de tener sentido: se limpia
            // en lugar de guardar un periodo imposible.
            if (d && endDate && endDate <= d) { setEndDate(undefined); onChange({ end_date: "" }); }
          }}
          error={errors.has("start_date")}
        />
        <DateField
          placeholder="End Date"
          required
          value={endDate}
          onChange={(d) => {
            setEndDate(d);
            onChange({ end_date: d ? format(d, "yyyy-MM-dd") : "" });
            clearError("end_date");
          }}
          disabledDates={(d) => (startDate ? d <= startDate : false)}
          error={errors.has("end_date") && "Must be after start date"}
        />
      </SectionModal>

      {/* ── Valor ────────────────────────────────────────────────────────── */}
      <SectionModal
        open={openSection === "value"}
        onCancel={cancelSection}
        onSave={() => setOpenSection(null)}
        title="Contract Value"
        subtitle="Amount charged and how often it is billed"
      >
        <FloatingInput
          id="contract-total"
          label="Amount ($)"
          type="decimal"
          required
          value={formData.total}
          onChange={(v) => { onChange({ total: toDecimalString(v) }); clearError("total"); }}
          error={errors.has("total")}
        />
        <SelectField
          placeholder="Payment Frequency"
          value={formData.payment_frequency}
          onChange={(v) => onChange({ payment_frequency: v as ContractPaymentFrequency })}
          options={PAYMENT_FREQUENCY_OPTIONS}
        />
        {estimatedTotal && (
          <div className="rounded-md bg-muted/50 p-2.5">
            <p className="text-xs text-muted-foreground">
              Estimated total:{" "}
              <span className="font-semibold text-foreground">
                ${estimatedTotal.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {" "}({estimatedTotal.periods} payments × ${estimatedTotal.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })})
            </p>
          </div>
        )}
      </SectionModal>

      {/* ── Descripciones ────────────────────────────────────────────────── */}
      {openDescription && (
        <SectionModal
          open
          onCancel={cancelSection}
          onSave={() => setOpenSection(null)}
          title={openDescription.title}
          subtitle={openDescription.subtitle}
        >
          <TextareaField
            id={`contract-${openDescription.key}`}
            placeholder={openDescription.placeholder}
            value={formData[openDescription.key] ?? ""}
            onChange={(v) => {
              onChange({ [openDescription.key]: v } as Partial<ContractFormData>);
              setFieldSource(openDescription.key, v ? "user" : "empty");
              if (v) clearError(openDescription.key);
            }}
            minHeight="min-h-[180px]"
            error={errors.has(openDescription.key)}
          />
          <FieldActions
            value={formData[openDescription.key] ?? ""}
            defaultValue={savedDefaults?.[openDescription.key] ?? ""}
            source={fieldSources[openDescription.key]}
            isGenerating={generatingField === openDescription.key}
            isSaving={savingField === openDescription.key}
            onGenerate={openDescription.onGenerate}
            onUseSaved={() => {
              onChange({ [openDescription.key]: savedDefaults![openDescription.key] } as Partial<ContractFormData>);
              setFieldSource(openDescription.key, "default");
              clearError(openDescription.key);
            }}
            onSaveDefault={async () => {
              await saveDescription(openDescription.key, formData[openDescription.key] ?? "");
              setFieldSource(openDescription.key, "default");
            }}
            onClear={() => {
              onChange({ [openDescription.key]: "" } as Partial<ContractFormData>);
              setFieldSource(openDescription.key, "empty");
            }}
          />
        </SectionModal>
      )}

      {/* ── Listas que alimentan la generación ───────────────────────────── */}
      <SectionModal
        open={showServicesDialog}
        onCancel={() => { setShowServicesDialog(false); setServicesInput(""); }}
        onSave={handleGenerateServices}
        saveLabel="Generate"
        title="Our Services"
        subtitle="These will be included in the generated text"
      >
        <TextareaField
          id="services-input"
          label="Enter the services you offer (one per line)"
          value={servicesInput}
          onChange={setServicesInput}
          placeholder={"Commercial cleaning\nJanitorial services\nPressure washing"}
          minHeight="min-h-[140px]"
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to use the default template.
        </p>
      </SectionModal>

      <SectionModal
        open={showCitiesDialog}
        onCancel={() => { setShowCitiesDialog(false); setCitiesInput(""); }}
        onSave={handleGenerateCities}
        saveLabel="Generate"
        title="Service Coverage"
        subtitle="These will be included in the generated text"
      >
        <TextareaField
          id="cities-input"
          label="Enter the cities or areas you cover (one per line)"
          value={citiesInput}
          onChange={setCitiesInput}
          placeholder={"Miami\nFort Lauderdale\nBoca Raton"}
          minHeight="min-h-[140px]"
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to use the default template.
        </p>
      </SectionModal>
    </>
  );
}
