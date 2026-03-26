/**
 * @module CreateContractPage
 * Wizard de creación/edición de contratos.
 * Todos los pasos (Details → Policies → Preview) en una sola ruta con useState.
 * Paso 1 completamente implementado (CON-3). Pasos 2 y 3 en CON-4/5.
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import { format } from "date-fns";
import {
  ChevronLeft, FileSignature, Search, X, Plus, CalendarIcon,
  User, Mail, Phone, MapPin, DollarSign, Building2, Check,
  ClipboardList, Globe,
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
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Calendar }              from "@/shared/components/ui/calendar";
import { Badge }                 from "@/shared/components/ui/badge";
import { cn }                    from "@/shared/utils/cn";
import { toast }                 from "sonner";
import { toDecimalString }       from "@/shared/utils/numericInput";
import { useQuery }              from "@tanstack/react-query";
import { useProfile }            from "@/shared/hooks/useProfile";
import { useIsMobile }           from "@/shared/hooks/useIsMobile";
import { fetchClients }          from "@/features/crm/clients/services/clientsService";
import { fetchLeads }            from "@/features/crm/leads/services/leadsService";
import { ClientForm }            from "@/features/crm/clients/components/ClientForm";
import type { ClientEntity }     from "@/shared/types/entities";
import { useContract }           from "../hooks/useContract";
import { useCreateContract, useUpdateContract } from "../hooks/useContracts";
import { useContractNumber }     from "../hooks/useContractNumber";
import { ContractProgressBar }   from "../components/ContractProgressBar";
import type { ContractFormData, ContractPaymentFrequency } from "../types/contract.types";

// ─── Default form data ────────────────────────────────────────────────────────

const DEFAULT_FORM: ContractFormData = {
  recipient_name:    "",
  recipient_email:   "",
  recipient_phone:   "",
  recipient_address: "",
  recipient_type:    "client",
  recipient_id:      null,
  start_date:        "",
  end_date:          "",
  total:             "",
  payment_frequency: "monthly",
  who_we_are:        "",
  why_choose_us:     "",
  our_services:      "",
  service_coverage:  "",
  sections:          [],
  delivery_method:   "email",
};

// ─── Recipient option type ────────────────────────────────────────────────────

interface RecipientOption {
  id:     string;   // "client-{uuid}" | "lead-{uuid}"
  name:   string;
  type:   "Client" | "Lead";
  detail: string;
  email:  string;
  phone:  string;
  address: string;
}

// ─── Wizard page ──────────────────────────────────────────────────────────────

interface CreateContractPageProps {
  /** Modal mode: pass open + onClose. Omit for standalone page (route). */
  open?:    boolean;
  onClose?: () => void;
  /** Edit mode when opened as modal (no URL param available). */
  editId?:  string;
}

export function CreateContractStep1Page({ open, onClose, editId: editIdProp }: CreateContractPageProps = {}) {
  const navigate   = useNavigate();
  const isMobile   = useIsMobile();
  const { id: editIdParam } = useParams<{ id: string }>();
  const editId    = editIdProp ?? editIdParam;
  const isEditing = !!editId;
  const isModal   = onClose !== undefined;
  const goBack    = () => { if (isModal) onClose(); else navigate("/contracts"); };

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState<ContractFormData>(DEFAULT_FORM);
  const patch = (partial: Partial<ContractFormData>) =>
    setFormData((prev) => ({ ...prev, ...partial }));

  // ── Validation errors ───────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const clearError = (key: string) =>
    setErrors((prev) => { const n = new Set(prev); n.delete(key); return n; });

  // ── Exit dialog ─────────────────────────────────────────────────────────────
  const [showExit, setShowExit] = useState(false);

  // ── Add client modal ────────────────────────────────────────────────────────
  const [showAddClient, setShowAddClient] = useState(false);

  // ── Recipient search ────────────────────────────────────────────────────────
  const [searchQuery,     setSearchQuery]     = useState("");
  const [showDropdown,    setShowDropdown]    = useState(false);
  const [selectedId,      setSelectedId]      = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  // ── Date state ──────────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate,   setEndDate]   = useState<Date | undefined>();

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: profile }          = useProfile();
  const { data: clients = [] }     = useQuery({ queryKey: ["clients-for-contract"], queryFn: fetchClients });
  const { data: leads = [] }       = useQuery({ queryKey: ["leads-for-contract"],   queryFn: fetchLeads   });
  const { data: contractNumber }   = useContractNumber();
  const { data: existingContract } = useContract(editId);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createM = useCreateContract();
  const updateM = useUpdateContract();

  // ── Prefill from profile on new contract ─────────────────────────────────────
  useEffect(() => {
    if (isEditing || !profile) return;
    const p = profile as Record<string, unknown>;
    patch({
      who_we_are:       (p.who_we_are_default   as string) ?? (p.company_description as string) ?? "",
      why_choose_us:    (p.why_choose_us_default as string) ?? (p.why_choose_us      as string) ?? "",
      our_services:     (p.our_services_default  as string) ?? (p.our_services       as string) ?? "",
      service_coverage: (p.service_coverage_default as string) ?? (p.service_coverage as string) ?? "",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, isEditing]);

  // ── Prefill from existing contract on edit ────────────────────────────────────
  useEffect(() => {
    if (!isEditing || !existingContract) return;
    const c = existingContract;
    setFormData({
      recipient_name:    c.recipient_name,
      recipient_email:   c.recipient_email   ?? "",
      recipient_phone:   c.recipient_phone   ?? "",
      recipient_address: c.recipient_address ?? "",
      recipient_type:    c.recipient_type,
      recipient_id:      c.recipient_id,
      start_date:        c.start_date,
      end_date:          c.end_date,
      total:             String(c.total),
      payment_frequency: c.payment_frequency,
      who_we_are:        c.who_we_are        ?? "",
      why_choose_us:     c.why_choose_us     ?? "",
      our_services:      c.our_services      ?? "",
      service_coverage:  c.service_coverage  ?? "",
      sections:          c.sections,
      delivery_method:   c.delivery_method,
    });
    if (c.start_date) setStartDate(new Date(c.start_date));
    if (c.end_date)   setEndDate(new Date(c.end_date));
    setSearchQuery(c.recipient_name);
    if (c.recipient_id) {
      setSelectedId(`${c.recipient_type}-${c.recipient_id}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingContract, isEditing]);

  // ── Auto-resolve recipient when editing and data loads ───────────────────────
  useEffect(() => {
    if (!isEditing || !searchQuery || selectedId) return;
    const all = buildOptions();
    const match = all.find((o) => o.name === searchQuery);
    if (match) setSelectedId(match.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, leads, searchQuery]);

  // ── Close dropdown on outside click ─────────────────────────────────────────
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ── Build recipient options ──────────────────────────────────────────────────
  const buildOptions = (): RecipientOption[] => {
    const clientOpts = clients.map((c) => ({
      id:      `client-${c.id}`,
      name:    c.full_name,
      type:    "Client" as const,
      detail:  c.service_city || c.email,
      email:   c.email,
      phone:   c.phone,
      address: [c.service_street, c.service_city, c.service_state, c.service_zip]
        .filter(Boolean).join(", "),
    }));
    const leadOpts = leads.map((l) => ({
      id:      `lead-${l.id}`,
      name:    l.full_name,
      type:    "Lead" as const,
      detail:  l.city || l.email,
      email:   l.email,
      phone:   l.phone,
      address: [l.address, l.city, l.state, l.zip_code].filter(Boolean).join(", "),
    }));
    return [...clientOpts, ...leadOpts];
  };

  const recipientOptions = useMemo(() => {
    const all = buildOptions();
    if (!searchQuery || selectedId) return all;
    const q = searchQuery.toLowerCase();
    return all.filter(
      (o) => o.name.toLowerCase().includes(q) || o.detail?.toLowerCase().includes(q)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, leads, searchQuery, selectedId]);

  const selectedRecipient = useMemo(
    () => buildOptions().find((o) => o.id === selectedId) ?? null,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [clients, leads, selectedId]);

  // ── Recipient handlers ───────────────────────────────────────────────────────
  const handleSelectRecipient = (option: RecipientOption) => {
    setSelectedId(option.id);
    setSearchQuery(option.name);
    setShowDropdown(false);
    clearError("recipient");
    const [type, ...rest] = option.id.split("-");
    const realId = rest.join("-");
    patch({
      recipient_name:    option.name,
      recipient_email:   option.email,
      recipient_phone:   option.phone,
      recipient_address: option.address,
      recipient_type:    type as "client" | "lead",
      recipient_id:      realId,
    });
  };

  const handleClearRecipient = () => {
    setSelectedId("");
    setSearchQuery("");
    patch({
      recipient_name: "", recipient_email: "", recipient_phone: "",
      recipient_address: "", recipient_id: null,
    });
    inputRef.current?.focus();
  };

  // ── Estimated total ──────────────────────────────────────────────────────────
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

  // ── Step 1 validation ────────────────────────────────────────────────────────
  const validateStep1 = (): boolean => {
    const errs = new Set<string>();
    if (!selectedId)           errs.add("recipient");
    if (!startDate)            errs.add("start_date");
    if (!endDate)              errs.add("end_date");
    if (startDate && endDate && endDate <= startDate) errs.add("end_date");
    if (!formData.total || parseFloat(formData.total) <= 0) errs.add("total");
    setErrors(errs);
    if (errs.size > 0) {
      toast.error("Please fill in all required fields");
      return false;
    }
    return true;
  };

  // ── Save draft and navigate ──────────────────────────────────────────────────
  const handleNext = async () => {
    if (!validateStep1()) return;
    // Step 1 → Step 2
    setStep(2);
  };

  const handleSaveDraft = async () => {
    if (!selectedId) { toast.error("Please select a recipient"); return; }
    if (isEditing && editId) {
      updateM.mutate({ id: editId, data: formData }, { onSuccess: goBack });
    } else {
      createM.mutate(formData, { onSuccess: goBack });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  // ── Inner content (shared between modal and page mode) ─────────────────────
  const renderContent = () => {
  // Steps 2 & 3 placeholder (CON-4/5)
  if (step === 2 || step === 3) {
    return (
      <div className="min-h-full bg-background flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border/50 px-4 py-3 sticky top-0 z-20">
          <div className="flex items-center justify-between max-w-2xl mx-auto w-full">
            <Button variant="ghost" size="icon" onClick={() => setStep(step === 3 ? 2 : 1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-base font-semibold flex items-center gap-2">
              <FileSignature className="w-4 h-4" />
              {isEditing ? "Edit Contract" : "New Contract"}
            </h1>
            <div className="w-10" />
          </div>
        </div>
        <ContractProgressBar currentStep={step} />
        <div className="flex items-center justify-center flex-1 p-8">
          <p className="text-muted-foreground text-sm">
            {step === 2 ? "Policies — coming in CON-4" : "Preview — coming in CON-5"}
          </p>
        </div>
      </div>
    );
  }

  // ── Step 1 ────────────────────────────────────────────────────────────────────
  return (
    <>
    <div className="min-h-full bg-background flex flex-col">

      {/* ── Sticky header ───────────────────────────────────────────────── */}
      <div className="bg-card border-b border-border/50 px-4 py-3 sticky top-0 z-20">
        <div className={cn("flex items-center justify-between w-full", !isMobile && "max-w-2xl mx-auto")}>
          <Button variant="ghost" size="icon" className="rounded-md" onClick={() => setShowExit(true)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileSignature className="w-4 h-4" />
            {isEditing ? "Edit Contract" : "New Contract"}
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <ContractProgressBar currentStep={1} />

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div className={cn("flex-1 overflow-y-auto", !isMobile && "flex flex-col items-center")}>
        <div className={cn("space-y-[1px] bg-border/20 w-full", !isMobile && "max-w-2xl")}>

          {/* Section: Contract Number & Recipient */}
          <Card className={cn(
            "rounded-none border-x-0",
            errors.has("recipient") && "ring-1 ring-inset ring-destructive"
          )}>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 items-end">

                {/* Contract Number (read-only) */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Contract Number</Label>
                  <Input
                    value={contractNumber ?? "Generating..."}
                    readOnly
                    className="bg-muted cursor-not-allowed text-muted-foreground"
                  />
                </div>

                {/* Recipient search */}
                <div className="space-y-1.5 relative" ref={dropdownRef}>
                  <Label className="text-xs text-muted-foreground">
                    Directed To <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      ref={inputRef}
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                        if (selectedId) {
                          setSelectedId("");
                          patch({ recipient_name: "", recipient_email: "", recipient_phone: "", recipient_address: "", recipient_id: null });
                        }
                      }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Search client or lead..."
                      className={cn("pl-9 pr-9", errors.has("recipient") && "border-destructive")}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={handleClearRecipient}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown */}
                  {showDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto">
                      {recipientOptions.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">No clients or leads found</p>
                      ) : (
                        <div className="p-1">
                          {recipientOptions.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleSelectRecipient(opt)}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left text-sm transition-colors hover:bg-accent",
                                selectedId === opt.id && "bg-primary/10 text-primary"
                              )}
                            >
                              <div className="min-w-0">
                                <div className="font-medium truncate">{opt.name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {opt.detail}
                                </div>
                              </div>
                              <Badge variant="outline" className="ml-2 text-[10px] flex-shrink-0">
                                {opt.type}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Add new client */}
                      <div className="border-t p-1">
                        <button
                          type="button"
                          onClick={() => { setShowDropdown(false); setShowAddClient(true); }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-left text-sm text-primary hover:bg-accent transition-colors font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Add New Client
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section: Recipient info (read-only display) */}
          <Card className="rounded-none border-x-0">
            <CardContent className="p-4">
              <div className="grid grid-cols-[110px_1fr] gap-y-2.5 gap-x-4">
                <Label className="text-xs text-muted-foreground self-center flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Name
                </Label>
                <p className="text-sm font-medium truncate">{selectedRecipient?.name || "—"}</p>

                <Label className="text-xs text-muted-foreground self-center flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </Label>
                <p className="text-sm truncate">{selectedRecipient?.email || "—"}</p>

                <Label className="text-xs text-muted-foreground self-center flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </Label>
                <p className="text-sm">{selectedRecipient?.phone || "—"}</p>

                <Label className="text-xs text-muted-foreground self-center flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Address
                </Label>
                <p className="text-sm truncate">{selectedRecipient?.address || "—"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Section: Contract Period */}
          <Card className={cn(
            "rounded-none border-x-0",
            (errors.has("start_date") || errors.has("end_date")) && "ring-1 ring-inset ring-destructive"
          )}>
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Contract Period
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-4">

                {/* Start Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Start Date <span className="text-destructive">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground",
                          errors.has("start_date") && "border-destructive"
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
                          patch({ start_date: d ? format(d, "yyyy-MM-dd") : "" });
                          clearError("start_date");
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground",
                          errors.has("end_date") && "border-destructive"
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
                          patch({ end_date: d ? format(d, "yyyy-MM-dd") : "" });
                          clearError("end_date");
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

          {/* Section: Contract Value */}
          <Card className={cn(
            "rounded-none border-x-0",
            errors.has("total") && "ring-1 ring-inset ring-destructive"
          )}>
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Contract Value
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Amount */}
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
                        patch({ total: toDecimalString(e.target.value) });
                        clearError("total");
                      }}
                      placeholder="0.00"
                      className={cn("pl-7", errors.has("total") && "border-destructive")}
                    />
                  </div>
                </div>

                {/* Payment Frequency */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Payment Frequency</Label>
                  <Select
                    value={formData.payment_frequency}
                    onValueChange={(v) => patch({ payment_frequency: v as ContractPaymentFrequency })}
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

              {/* Estimated total hint */}
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

          {/* Section: Who We Are */}
          <Card className="rounded-none border-x-0">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Who We Are
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Textarea
                value={formData.who_we_are}
                onChange={(e) => patch({ who_we_are: e.target.value })}
                placeholder="Briefly describe your company: name, what you do, and the services you provide."
                className="min-h-[100px] resize-y"
              />
            </CardContent>
          </Card>

          {/* Section: Why Choose Us */}
          <Card className="rounded-none border-x-0">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Check className="w-4 h-4" />
                Why Choose Us
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Textarea
                value={formData.why_choose_us}
                onChange={(e) => patch({ why_choose_us: e.target.value })}
                placeholder="Explain why clients should choose your company: experience, quality, reliability, and what sets you apart."
                className="min-h-[100px] resize-y"
              />
            </CardContent>
          </Card>

          {/* Section: Our Services */}
          <Card className="rounded-none border-x-0">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Our Services
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Textarea
                value={formData.our_services}
                onChange={(e) => patch({ our_services: e.target.value })}
                placeholder="Describe the services included in this contract."
                className="min-h-[100px] resize-y"
              />
            </CardContent>
          </Card>

          {/* Section: Service Coverage */}
          <Card className="rounded-none border-x-0">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Service Coverage
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Textarea
                value={formData.service_coverage}
                onChange={(e) => patch({ service_coverage: e.target.value })}
                placeholder="Describe the geographic area or locations covered by this contract."
                className="min-h-[80px] resize-y"
              />
            </CardContent>
          </Card>

        </div>

        {/* ── Footer actions (inline, not fixed) ─────────────────────────────── */}
        <div className={cn("flex items-center justify-between py-4 px-6 mt-4 w-full", !isMobile && "max-w-2xl")}>
          <Button
            variant="outline"
            className="px-6"
            onClick={() => setShowExit(true)}
          >
            Cancel
          </Button>
          <Button
            className="px-6"
            onClick={handleNext}
          >
            Next
          </Button>
        </div>
      </div>
    </div>

    {/* ── Exit confirmation ──────────────────────────────────────────────────── */}
    <AlertDialog open={showExit} onOpenChange={setShowExit}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
          <AlertDialogDescription>
            Your changes will be lost. You can save as a draft to continue later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel className="mt-0">Keep editing</AlertDialogCancel>
          <Button variant="outline" onClick={handleSaveDraft} disabled={createM.isPending}>
            Save as Draft
          </Button>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={goBack}
          >
            Leave
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* ── Add Client modal ───────────────────────────────────────────────────── */}
    <ClientForm
      open={showAddClient}
      onClose={() => setShowAddClient(false)}
      onSuccess={(client: ClientEntity) => {
        setShowAddClient(false);
        const addr = [client.service_street, client.service_city, client.service_state, client.service_zip]
          .filter(Boolean).join(", ");
        const opt: RecipientOption = {
          id:      `client-${client.id}`,
          name:    client.full_name,
          type:    "Client",
          detail:  client.service_city,
          email:   client.email,
          phone:   client.phone,
          address: addr,
        };
        handleSelectRecipient(opt);
      }}
    />
    </>
  );
};

  // ── Return ──────────────────────────────────────────────────────────────────
  if (isModal) {
    return (
      <FullScreenModal open={open ?? false} onClose={goBack}>
        {renderContent()}
      </FullScreenModal>
    );
  }
  return <>{renderContent()}</>;
}
