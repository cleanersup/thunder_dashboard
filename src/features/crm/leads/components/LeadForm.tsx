/**
 * @module LeadForm
 * Modal dialog form for creating or editing a lead.
 * Used by: CRM, estimates (shared single source of truth).
 * Texts and validations match swift-slate AddLead page.
 */
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Paperclip, X } from "lucide-react";
import {
  FormSheet, FormBand, FloatingInput, SelectField, DateField, TextareaField,
} from "@/shared/components/forms";
import { Button }   from "@/shared/components/ui/button";
import { withRequiredMark } from "@/shared/utils/formLabel";
import { leadSchema, type LeadFormData } from "../schemas/leadSchema";

const LEAD_SOURCE_OPTIONS = [
  { value: "facebook",  label: "Facebook" },
  { value: "google",    label: "Google" },
  { value: "instagram", label: "Instagram" },
  { value: "website",   label: "Website" },
  { value: "referral",  label: "Referral" },
  { value: "flyer",     label: "Flyer" },
  { value: "other",     label: "Other" },
] as const;

const SERVICE_INTERESTED_OPTIONS = [
  { value: "residential", label: "Residential" },
  { value: "commercial",  label: "Commercial" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "low",    label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High" },
] as const;

const LEAD_STATUS_OPTIONS = [
  { value: "new",           label: "New" },
  { value: "contacted",     label: "Contacted" },
  { value: "walkthrough",   label: "Walkthrough" },
  { value: "estimate send", label: "Estimate Send" },
  { value: "decision",      label: "Decision" },
] as const;
import { AddressAutocomplete } from "@/shared/components/AddressAutocomplete";
import { PhoneInput } from "@/shared/components/ui/phone-input";
import { formatPhoneDisplay } from "@/shared/utils/phoneInput";
import { useCreateLead, useUpdateLead } from "../hooks/useLeads";
import type { Lead } from "../../types/crm.types";
import type { LeadEntity } from "@/shared/types/entities";

/** Full defaults for a new lead — used by useForm and reset after successful create. */
const CREATE_LEAD_DEFAULTS: LeadFormData = {
  full_name:          "",
  company_name:       undefined,
  phone:              "",
  email:              "",
  address:            "",
  apt_suite:          undefined,
  city:               "",
  state:              "",
  zip_code:           "",
  lead_source:        "website",
  referral_name:      undefined,
  referral_company:   undefined,
  service_interested: "residential",
  estimate_budget:    null,
  priority_level:     "medium",
  status:             "new",
  next_followup_date: null,
  internal_notes:     undefined,
  walkthrough_date:   null,
  walkthrough_time:   null,
  decision_result:    null,
};

/** Normalize budget input for RHF — never store NaN. */
function parseEstimateBudgetFieldValue(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = parseFloat(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface LeadFormProps {
  open:       boolean;
  onClose:    () => void;
  lead?:      Lead;
  /** Called with the newly created lead after a successful create. Not fired on edit. */
  onSuccess?: (lead: LeadEntity) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeadForm({ open, onClose, lead, onSuccess }: LeadFormProps) {
  const isEdit = !!lead;
  const { mutate: create, isPending: creating } = useCreateLead();
  const { mutate: update, isPending: updating } = useUpdateLead();
  const isPending = creating || updating;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments,  setAttachments]  = useState<File[]>([]);
  const [followupDate, setFollowupDate] = useState<Date | undefined>(undefined);

  const {
    handleSubmit, reset, setValue, watch,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: CREATE_LEAD_DEFAULTS,
  });

  // Controlled values for Select components (react-hook-form reset won't update
  // uncontrolled Selects via defaultValue, so we use watch + value prop)
  const addressValue      = watch("address")            ?? "";
  const leadSource        = watch("lead_source")        ?? "website";
  const serviceInterested = watch("service_interested") ?? "residential";
  const priorityLevel     = watch("priority_level")     ?? "medium";
  const statusVal         = watch("status")             ?? "new";
  const estimateBudgetRaw = watch("estimate_budget");
  const estimateBudgetDisplay =
    estimateBudgetRaw == null ||
    (typeof estimateBudgetRaw === "number" && !Number.isFinite(estimateBudgetRaw))
      ? ""
      : String(estimateBudgetRaw);

  // ── Populate form when editing (create mode: do not reset here — preserves draft if user closed without saving)
  useEffect(() => {
    if (!lead) return;
    setFollowupDate(lead.next_followup_date ? new Date(lead.next_followup_date) : undefined);
    setAttachments([]);
    reset({
      full_name:          lead.full_name,
      company_name:       lead.company_name ?? undefined,
      phone:              formatPhoneDisplay(lead.phone),
      email:              lead.email,
      address:            lead.address,
      apt_suite:          lead.apt_suite ?? undefined,
      city:               lead.city,
      state:              lead.state,
      zip_code:           lead.zip_code,
      lead_source:        lead.lead_source        as LeadFormData["lead_source"],
      referral_name:      lead.referral_name      ?? undefined,
      referral_company:   lead.referral_company   ?? undefined,
      service_interested: lead.service_interested as LeadFormData["service_interested"],
      estimate_budget:    lead.estimate_budget    ?? undefined,
      priority_level:     lead.priority_level     as LeadFormData["priority_level"],
      status:             lead.status             as LeadFormData["status"],
      next_followup_date: lead.next_followup_date ?? undefined,
      internal_notes:     lead.internal_notes     ?? undefined,
      walkthrough_date:   lead.walkthrough_date   ?? null,
      walkthrough_time:   lead.walkthrough_time   ?? null,
      decision_result:    (lead.decision_result as LeadFormData["decision_result"]) ?? null,
    });
  }, [lead, reset]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = (data: LeadFormData) => {
    if (isEdit && lead) {
      update({ id: lead.id, payload: data }, { onSuccess: onClose });
    } else {
      create(
        { payload: data, files: attachments.length > 0 ? attachments : undefined },
        {
          onSuccess: (createdLead) => {
            reset(CREATE_LEAD_DEFAULTS);
            setAttachments([]);
            setFollowupDate(undefined);
            if (fileInputRef.current) fileInputRef.current.value = "";
            onSuccess?.(createdLead as unknown as LeadEntity);
            onClose();
          },
        },
      );
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <FormSheet
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Lead" : "Add Lead"}
      submitLabel={isEdit ? "Save Changes" : "Add Lead"}
      submitPendingLabel={isEdit ? "Saving..." : "Adding..."}
      onSubmit={handleSubmit(onSubmit)}
      isPending={isPending}
    >
      <div className="contents">

          <FormBand title="Personal Information">
            <FloatingInput
              id="lead-full-name"
              label="Full Name"
              value={watch("full_name") ?? ""}
              onChange={(v) => setValue("full_name", v, { shouldValidate: true })}
              required
              error={errors.full_name?.message}
            />
            <div className="grid grid-cols-2 gap-3">
              <FloatingInput
                id="lead-company"
                label="Company Name"
                value={watch("company_name") ?? ""}
                onChange={(v) => setValue("company_name", v)}
              />
              <PhoneInput
                id="lead-phone"
                floatingLabel
                label={withRequiredMark("Phone Number", true)}
                value={watch("phone") ?? ""}
                onChange={(v) => setValue("phone", v, { shouldValidate: true })}
                error={errors.phone?.message}
              />
            </div>
            <FloatingInput
              id="lead-email"
              label="Email Address"
              type="email"
              value={watch("email") ?? ""}
              onChange={(v) => setValue("email", v, { shouldValidate: true })}
              required
              error={errors.email?.message}
            />
          </FormBand>

          <FormBand title="Address">
            <div className="space-y-1.5">
              <AddressAutocomplete
                value={addressValue}
                onChange={(v) => setValue("address", v)}
                onAddressSelect={(c) => {
                  setValue("address",  c.street);
                  setValue("city",     c.city);
                  setValue("state",    c.state);
                  setValue("zip_code", c.zip);
                }}
                placeholder={withRequiredMark("Street Address", true)}
                error={!!errors.address}
              />
              {errors.address && (
                <p className="text-xs text-destructive">{errors.address.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FloatingInput
                id="lead-apt"
                label="Apt / Suite"
                value={watch("apt_suite") ?? ""}
                onChange={(v) => setValue("apt_suite", v)}
              />
              <FloatingInput
                id="lead-city"
                label="City"
                value={watch("city") ?? ""}
                onChange={(v) => setValue("city", v, { shouldValidate: true })}
                required
                error={errors.city?.message}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FloatingInput
                id="lead-state"
                label="State"
                value={watch("state") ?? ""}
                onChange={(v) => setValue("state", v, { shouldValidate: true })}
                required
                error={errors.state?.message}
              />
              <FloatingInput
                id="lead-zip"
                label="Zip Code"
                type="integer"
                value={watch("zip_code") ?? ""}
                onChange={(v) => setValue("zip_code", v, { shouldValidate: true })}
                required
                error={errors.zip_code?.message}
              />
            </div>
          </FormBand>

          <FormBand title="Lead Details">
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                placeholder="Lead source"
                value={leadSource}
                onChange={(v) => setValue("lead_source", v as LeadFormData["lead_source"])}
                options={LEAD_SOURCE_OPTIONS}
                required
              />
              <SelectField
                placeholder="Service interested in"
                value={serviceInterested}
                onChange={(v) => setValue("service_interested", v as LeadFormData["service_interested"])}
                options={SERVICE_INTERESTED_OPTIONS}
                required
              />
            </div>

            {leadSource === "referral" && (
              <div className="grid grid-cols-2 gap-3">
                <FloatingInput
                  id="lead-referral-name"
                  label="Referral Name"
                  value={watch("referral_name") ?? ""}
                  onChange={(v) => setValue("referral_name", v)}
                />
                <FloatingInput
                  id="lead-referral-company"
                  label="Referral Company"
                  value={watch("referral_company") ?? ""}
                  onChange={(v) => setValue("referral_company", v)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <SelectField
                placeholder="Priority level"
                value={priorityLevel}
                onChange={(v) => setValue("priority_level", v as LeadFormData["priority_level"])}
                options={PRIORITY_OPTIONS}
                required
              />
              <SelectField
                placeholder="Status"
                value={statusVal}
                onChange={(v) => setValue("status", v as LeadFormData["status"])}
                options={LEAD_STATUS_OPTIONS}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FloatingInput
                id="lead-budget"
                label="Estimate Budget"
                type="decimal"
                value={estimateBudgetDisplay}
                onChange={(v) => setValue("estimate_budget", parseEstimateBudgetFieldValue(v))}
              />
              <DateField
                placeholder="Next follow-up date"
                value={followupDate}
                onChange={(date) => {
                  setFollowupDate(date);
                  setValue("next_followup_date", date ? format(date, "yyyy-MM-dd") : null);
                }}
              />
            </div>

            <TextareaField
              id="lead-notes"
              label="Internal Notes"
              placeholder="Internal notes..."
              value={watch("internal_notes") ?? ""}
              onChange={(v) => setValue("internal_notes", v)}
            />
          </FormBand>

          <FormBand title="Attachments">
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setAttachments((prev) => [...prev, ...files]);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Paperclip className="w-4 h-4" />
              Upload Files
            </Button>
            {attachments.length > 0 && (
              <div className="space-y-1">
                {attachments.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm bg-muted rounded px-3 py-1.5"
                  >
                    <span className="truncate max-w-[240px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive ml-2 flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          </FormBand>
      </div>
    </FormSheet>
  );
}
