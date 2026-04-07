/**
 * @module ContractDetailsStep
 * Step 1 of the contract wizard: recipient (client only), contract period, value, company info.
 * Uses the shared ClientPicker — same component as invoices.
 */
import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import {
  CalendarIcon, DollarSign, Building2, Check, ClipboardList, Globe, Sparkles,
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/components/ui/dialog";
import { Calendar } from "@/shared/components/ui/calendar";
import { cn }       from "@/shared/utils/cn";
import { toast }    from "sonner";
import { toDecimalString } from "@/shared/utils/numericInput";
import { ClientPicker }    from "@/shared/components/common/ClientPicker";
import { useContractDescription } from "../hooks/useContractDescription";
import { FieldActions, initialSource, type FieldSource } from "./FieldActions";
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
  /** Called after successful validation. */
  onNext:   () => void;
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
  onNext,
  onCancel,
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
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen,   setEndOpen]   = useState(false);

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
  const handleClientSelect = (client: ClientEntity) => {
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Contract Number */}
      <Card className="rounded-lg border">
        <CardContent className="p-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Contract Number</Label>
            <Input
              value={contractNumber ?? "Generating..."}
              readOnly
              className="bg-muted cursor-not-allowed text-muted-foreground"
            />
          </div>
        </CardContent>
      </Card>

      {/* Recipient — shared ClientPicker (same as invoices) */}
      <div className={cn(errors.has("recipient") && "ring-1 ring-inset ring-destructive rounded-lg")}>
        <ClientPicker
          selectedClient={selectedClient}
          onClientSelect={handleClientSelect}
          error={errors.has("recipient")}
        />
      </div>

      {/* Contract Period */}
      <Card className={cn(
        "rounded-lg border px-6 py-4",
        (errors.has("start_date") || errors.has("end_date")) && "ring-1 ring-inset ring-destructive",
      )}>
        <CardHeader className="p-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Contract Period
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-3">
          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Popover open={startOpen} onOpenChange={setStartOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground",
                      errors.has("start_date") && "border-destructive",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => {
                      setStartDate(d);
                      onChange({ start_date: d ? format(d, "yyyy-MM-dd") : "" });
                      clearError("start_date");
                      if (d && endDate && endDate <= d) {
                        setEndDate(undefined);
                        onChange({ end_date: "" });
                      }
                      setStartOpen(false);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                End Date <span className="text-destructive">*</span>
              </Label>
              <Popover open={endOpen} onOpenChange={setEndOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground",
                      errors.has("end_date") && "border-destructive",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => {
                      setEndDate(d);
                      onChange({ end_date: d ? format(d, "yyyy-MM-dd") : "" });
                      clearError("end_date");
                      setEndOpen(false);
                    }}
                    disabled={(d) => (startDate ? d <= startDate : false)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {errors.has("end_date") && (
                <p className="text-xs text-destructive">Must be after start date</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Value */}
      <Card className={cn(
        "rounded-lg border px-6 py-4",
        errors.has("total") && "ring-1 ring-inset ring-destructive",
      )}>
        <CardHeader className="p-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Contract Value
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Amount <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formData.total}
                  onChange={(e) => {
                    onChange({ total: toDecimalString(e.target.value) });
                    clearError("total");
                  }}
                  placeholder="0.00"
                  className={cn("pl-7", errors.has("total") && "border-destructive")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Payment Frequency</Label>
              <Select
                value={formData.payment_frequency}
                onValueChange={(v) => onChange({ payment_frequency: v as ContractPaymentFrequency })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="one-time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {estimatedTotal && (
            <div className="mt-3 p-2.5 bg-muted/50 rounded-md">
              <p className="text-xs text-muted-foreground">
                Estimated total:{" "}
                <span className="font-semibold text-foreground">
                  ${estimatedTotal.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {" "}({estimatedTotal.periods} payments × ${estimatedTotal.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })})
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Who We Are */}
      <Card className={cn("rounded-lg border px-6 py-4", errors.has("who_we_are") && "ring-1 ring-inset ring-destructive")}>
        <CardHeader className="p-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Who We Are
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-3 space-y-2">
          <Textarea
            value={formData.who_we_are}
            onChange={(e) => {
              onChange({ who_we_are: e.target.value });
              setFieldSource("who_we_are", e.target.value ? "user" : "empty");
              if (e.target.value) clearError("who_we_are");
            }}
            placeholder="Briefly describe your company: name, what you do, and the services you provide."
            className="min-h-[100px] resize-y"
          />
          <FieldActions
            value={formData.who_we_are}
            defaultValue={savedDefaults?.who_we_are ?? ""}
            source={fieldSources.who_we_are}
            isGenerating={generatingField === "who_we_are"}
            isSaving={savingField === "who_we_are"}
            onGenerate={async () => {
              const result = await generateField("who_we_are");
              if (result) { onChange({ who_we_are: result }); setFieldSource("who_we_are", "user"); clearError("who_we_are"); }
            }}
            onUseSaved={() => {
              onChange({ who_we_are: savedDefaults!.who_we_are });
              setFieldSource("who_we_are", "default");
              clearError("who_we_are");
            }}
            onSaveDefault={async () => {
              await saveDescription("who_we_are", formData.who_we_are);
              setFieldSource("who_we_are", "default");
            }}
            onClear={() => {
              onChange({ who_we_are: "" });
              setFieldSource("who_we_are", "empty");
            }}
          />
        </CardContent>
      </Card>

      {/* Why Choose Us */}
      <Card className={cn("rounded-lg border px-6 py-4", errors.has("why_choose_us") && "ring-1 ring-inset ring-destructive")}>
        <CardHeader className="p-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Check className="w-4 h-4" />
            Why Choose Us
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-3 space-y-2">
          <Textarea
            value={formData.why_choose_us}
            onChange={(e) => {
              onChange({ why_choose_us: e.target.value });
              setFieldSource("why_choose_us", e.target.value ? "user" : "empty");
              if (e.target.value) clearError("why_choose_us");
            }}
            placeholder="Explain why clients should choose your company: experience, quality, reliability, and what sets you apart."
            className="min-h-[100px] resize-y"
          />
          <FieldActions
            value={formData.why_choose_us}
            defaultValue={savedDefaults?.why_choose_us ?? ""}
            source={fieldSources.why_choose_us}
            isGenerating={generatingField === "why_choose_us"}
            isSaving={savingField === "why_choose_us"}
            onGenerate={async () => {
              const result = await generateField("why_choose_us");
              if (result) { onChange({ why_choose_us: result }); setFieldSource("why_choose_us", "user"); clearError("why_choose_us"); }
            }}
            onUseSaved={() => {
              onChange({ why_choose_us: savedDefaults!.why_choose_us });
              setFieldSource("why_choose_us", "default");
              clearError("why_choose_us");
            }}
            onSaveDefault={async () => {
              await saveDescription("why_choose_us", formData.why_choose_us);
              setFieldSource("why_choose_us", "default");
            }}
            onClear={() => {
              onChange({ why_choose_us: "" });
              setFieldSource("why_choose_us", "empty");
            }}
          />
        </CardContent>
      </Card>

      {/* Our Services */}
      <Card className={cn("rounded-lg border px-6 py-4", errors.has("our_services") && "ring-1 ring-inset ring-destructive")}>
        <CardHeader className="p-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Our Services
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-3 space-y-2">
          <Textarea
            value={formData.our_services}
            onChange={(e) => {
              onChange({ our_services: e.target.value });
              setFieldSource("our_services", e.target.value ? "user" : "empty");
              if (e.target.value) clearError("our_services");
            }}
            placeholder="Describe the services included in this contract."
            className="min-h-[100px] resize-y"
          />
          <FieldActions
            value={formData.our_services}
            defaultValue={savedDefaults?.our_services ?? ""}
            source={fieldSources.our_services}
            isGenerating={generatingField === "our_services"}
            isSaving={savingField === "our_services"}
            onGenerate={() => setShowServicesDialog(true)}
            onUseSaved={() => {
              onChange({ our_services: savedDefaults!.our_services });
              setFieldSource("our_services", "default");
              clearError("our_services");
            }}
            onSaveDefault={async () => {
              await saveDescription("our_services", formData.our_services);
              setFieldSource("our_services", "default");
            }}
            onClear={() => {
              onChange({ our_services: "" });
              setFieldSource("our_services", "empty");
            }}
          />
        </CardContent>
      </Card>

      {/* Service Coverage */}
      <Card className={cn("rounded-lg border px-6 py-4", errors.has("service_coverage") && "ring-1 ring-inset ring-destructive")}>
        <CardHeader className="p-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Service Coverage
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-3 space-y-2">
          <Textarea
            value={formData.service_coverage}
            onChange={(e) => {
              onChange({ service_coverage: e.target.value });
              setFieldSource("service_coverage", e.target.value ? "user" : "empty");
              if (e.target.value) clearError("service_coverage");
            }}
            placeholder="Describe the geographic area or locations covered by this contract."
            className="min-h-[80px] resize-y"
          />
          <FieldActions
            value={formData.service_coverage}
            defaultValue={savedDefaults?.service_coverage ?? ""}
            source={fieldSources.service_coverage}
            isGenerating={generatingField === "service_coverage"}
            isSaving={savingField === "service_coverage"}
            onGenerate={() => setShowCitiesDialog(true)}
            onUseSaved={() => {
              onChange({ service_coverage: savedDefaults!.service_coverage });
              setFieldSource("service_coverage", "default");
              clearError("service_coverage");
            }}
            onSaveDefault={async () => {
              await saveDescription("service_coverage", formData.service_coverage);
              setFieldSource("service_coverage", "default");
            }}
            onClear={() => {
              onChange({ service_coverage: "" });
              setFieldSource("service_coverage", "empty");
            }}
          />
        </CardContent>
      </Card>

      {/* Our Services — list input dialog */}
      <Dialog open={showServicesDialog} onOpenChange={setShowServicesDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Our Services
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs text-muted-foreground">
              Enter the services you offer (one per line)
            </Label>
            <Textarea
              value={servicesInput}
              onChange={(e) => setServicesInput(e.target.value)}
              placeholder={"Commercial cleaning\nJanitorial services\nPressure washing"}
              className="min-h-[120px] resize-y"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              These will be included in the generated text. Leave blank to use the default template.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowServicesDialog(false); setServicesInput(""); }}>
              Cancel
            </Button>
            <Button onClick={handleGenerateServices}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Coverage — list input dialog */}
      <Dialog open={showCitiesDialog} onOpenChange={setShowCitiesDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-4 h-4" /> Service Coverage
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs text-muted-foreground">
              Enter the cities or areas you cover (one per line)
            </Label>
            <Textarea
              value={citiesInput}
              onChange={(e) => setCitiesInput(e.target.value)}
              placeholder={"Miami\nFort Lauderdale\nBoca Raton"}
              className="min-h-[120px] resize-y"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              These will be included in the generated text. Leave blank to use the default template.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCitiesDialog(false); setCitiesInput(""); }}>
              Cancel
            </Button>
            <Button onClick={handleGenerateCities}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="flex-shrink-0 bg-white rounded-lg border p-4 flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={() => { if (validate()) onNext(); }}>
          Next
        </Button>
      </div>
    </>
  );
}
