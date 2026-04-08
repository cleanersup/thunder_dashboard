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
import { Calendar as CalendarIcon, Paperclip, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button }   from "@/shared/components/ui/button";
import { Input }    from "@/shared/components/ui/input";
import { Label }    from "@/shared/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { cn }       from "@/shared/utils/cn";
import { leadSchema, type LeadFormData } from "../schemas/leadSchema";
import { AddressAutocomplete } from "@/shared/components/AddressAutocomplete";
import { PhoneInput } from "@/shared/components/ui/phone-input";
import { formatPhoneDisplay } from "@/shared/utils/phoneInput";
import { toDecimalString } from "@/shared/utils/numericInput";
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
  const [followupOpen, setFollowupOpen] = useState(false);

  const {
    register, handleSubmit, reset, setValue, watch,
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
            setFollowupOpen(false);
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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          if ((e.target as HTMLElement).closest?.(".pac-container")) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Lead" : "Add Lead"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">

          {/* ── Personal Information ──────────────────────────────────── */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Personal Information
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Full Name *</Label>
              <Input {...register("full_name")} placeholder="Jane Smith" />
              {errors.full_name && (
                <p className="text-xs text-destructive">{errors.full_name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Company Name</Label>
              <Input {...register("company_name")} placeholder="Optional" />
            </div>
            <div className="space-y-1">
              <Label>Phone Number *</Label>
              <PhoneInput
                value={watch("phone") ?? ""}
                onChange={(v) => setValue("phone", v, { shouldValidate: true })}
                placeholder="(555) 000-0000"
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Email Address *</Label>
              <Input {...register("email")} type="email" placeholder="jane@email.com" />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* ── Address ───────────────────────────────────────────────── */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Address
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Street Address *</Label>
              <AddressAutocomplete
                value={addressValue}
                onChange={(v) => setValue("address", v)}
                onAddressSelect={(c) => {
                  setValue("address",  c.street);
                  setValue("city",     c.city);
                  setValue("state",    c.state);
                  setValue("zip_code", c.zip);
                }}
                error={!!errors.address}
              />
              {errors.address && (
                <p className="text-xs text-destructive">{errors.address.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Apt/Suite</Label>
              <Input {...register("apt_suite")} placeholder="Apt 4B" />
            </div>
            <div className="space-y-1">
              <Label>City *</Label>
              <Input {...register("city")} />
              {errors.city && (
                <p className="text-xs text-destructive">{errors.city.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>State *</Label>
              <Input {...register("state")} />
              {errors.state && (
                <p className="text-xs text-destructive">{errors.state.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Zip Code *</Label>
              <Input {...register("zip_code")} />
              {errors.zip_code && (
                <p className="text-xs text-destructive">{errors.zip_code.message}</p>
              )}
            </div>
          </div>

          {/* ── Lead Details ──────────────────────────────────────────── */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Lead Details
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Lead Source *</Label>
              <Select
                value={leadSource}
                onValueChange={(v) => setValue("lead_source", v as LeadFormData["lead_source"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="flyer">Flyer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Service Interested In *</Label>
              <Select
                value={serviceInterested}
                onValueChange={(v) => setValue("service_interested", v as LeadFormData["service_interested"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {leadSource === "referral" && (
              <>
                <div className="space-y-1">
                  <Label>Referral Name</Label>
                  <Input {...register("referral_name")} />
                </div>
                <div className="space-y-1">
                  <Label>Referral Company</Label>
                  <Input {...register("referral_company")} />
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label>Priority Level *</Label>
              <Select
                value={priorityLevel}
                onValueChange={(v) => setValue("priority_level", v as LeadFormData["priority_level"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status *</Label>
              <Select
                value={statusVal}
                onValueChange={(v) => setValue("status", v as LeadFormData["status"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="walkthrough">Walkthrough</SelectItem>
                  <SelectItem value="estimate send">Estimate Send</SelectItem>
                  <SelectItem value="decision">Decision</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Estimate Budget</Label>
              {(() => {
                const field = register("estimate_budget", {
                  setValueAs: parseEstimateBudgetFieldValue,
                });
                return (
                  <Input
                    type="text"
                    inputMode="decimal"
                    {...field}
                    value={estimateBudgetDisplay}
                    onChange={(e) => {
                      e.target.value = toDecimalString(e.target.value);
                      field.onChange(e);
                    }}
                    placeholder="0.00"
                  />
                );
              })()}
            </div>
            <div className="space-y-1">
              <Label>Next Follow-up Date</Label>
              <Popover open={followupOpen} onOpenChange={setFollowupOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !followupDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {followupDate ? format(followupDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={followupDate}
                    onSelect={(date) => {
                      setFollowupDate(date);
                      setValue("next_followup_date", date ? format(date, "yyyy-MM-dd") : null);
                      setFollowupOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Internal Notes</Label>
              <Textarea
                {...register("internal_notes")}
                rows={3}
                placeholder="Internal notes..."
              />
            </div>
          </div>

          {/* ── Attachments ───────────────────────────────────────────── */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Attachments
          </p>
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

          {/* ── Actions ───────────────────────────────────────────────── */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending
                ? (isEdit ? "Saving..." : "Adding...")
                : (isEdit ? "Save Changes" : "Add Lead")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
