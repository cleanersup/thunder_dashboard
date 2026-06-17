import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft, CalendarIcon, Upload, X, FileText, Image as ImageIcon,
  Loader2, MapPin, User, Mail, Phone, Plus, UserPlus,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button }    from "@/shared/components/ui/button";
import { Input }     from "@/shared/components/ui/input";
import { Label }     from "@/shared/components/ui/label";
import { Textarea }  from "@/shared/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Calendar }         from "@/shared/components/ui/calendar";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import { PhoneInput }       from "@/shared/components/ui/phone-input";
import { AddressAutocomplete } from "@/shared/components/AddressAutocomplete";
import { useClients }          from "@/features/crm/clients/hooks/useClients";
import { useLeads }            from "@/features/crm/leads/hooks/useLeads";
import { ClientForm }          from "@/features/crm/clients/components/ClientForm";
import { LeadForm }            from "@/features/crm/leads/components/LeadForm";
import { useClientProperties } from "@/features/crm/clients/hooks/useClientProperties";
import { toast }    from "sonner";
import { format }   from "date-fns";
import { cn }       from "@/shared/utils/cn";
import { toIntegerString } from "@/shared/utils/numericInput";
import type { RequestPayload, BookingAttachmentMeta } from "../types/request.types";
import type { CustomQuestion } from "../hooks/useCustomQuestions";
import type { Client, Lead } from "@/features/crm/types/crm.types";
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

type ContactType = "client" | "lead" | "anonymous";

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

// ─── Floating label input ────────────────────────────────────────────────────

interface FloatInputProps {
  id:       string;
  label:    string;
  value:    string;
  onChange: (v: string) => void;
  type?:    string;
  error?:   string;
}

function FloatInput({ id, label, value, onChange, type = "text", error }: FloatInputProps) {
  const isNumeric = type === "number";
  return (
    <div className="relative">
      <Input
        id={id}
        type={isNumeric ? "text" : type}
        inputMode={isNumeric ? "numeric" : undefined}
        placeholder=" "
        value={value}
        onChange={(e) => {
          const v = isNumeric ? toIntegerString(e.target.value) : e.target.value;
          onChange(v);
        }}
        className={cn(
          "h-12 rounded-md border focus-visible:ring-0 focus-visible:border-primary px-3 bg-background peer",
          error ? "border-destructive" : "border-border",
        )}
      />
      <Label
        htmlFor={id}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground bg-background px-1 transition-all pointer-events-none peer-focus:top-0 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary"
      >
        {label}
      </Label>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

// ─── Address section ─────────────────────────────────────────────────────────

interface AddressValues { street: string; apt: string; city: string; state: string; zip: string; }
interface AddressErrors  { street?: boolean; city?: boolean; }

interface AddressSectionProps {
  values:   AddressValues;
  onChange: (field: keyof AddressValues, value: string) => void;
  errors?:  AddressErrors;
  required?: boolean;
}

function AddressSection({ values, onChange, errors = {}, required = false }: AddressSectionProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <AddressAutocomplete
          value={values.street}
          onChange={(v) => onChange("street", v)}
          onAddressSelect={(c) => {
            onChange("street", c.street);
            onChange("city",   c.city);
            onChange("state",  c.state);
            onChange("zip",    c.zip);
          }}
          placeholder={required ? "Street *" : "Street"}
          error={errors.street}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FloatInput id="apt"  label="Apt / Suite" value={values.apt} onChange={(v) => onChange("apt", v)} />
        <FloatInput
          id="city"
          label={required ? "City *" : "City"}
          value={values.city}
          onChange={(v) => onChange("city", v)}
          error={errors.city ? "City is required" : undefined}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FloatInput id="state" label="State" value={values.state} onChange={(v) => onChange("state", v)} />
        <FloatInput id="zip"   label="ZIP Code" value={values.zip} onChange={(v) => onChange("zip", v)} />
      </div>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface RequestFormProps {
  title:            string;
  mode?:            "create" | "edit";
  initialValues?:   Partial<{
    fullName: string; email: string; phone: string;
    street: string; apt: string; city: string; state: string; zip: string;
    serviceType: string; selectedDate: Date | undefined; timePreference: string;
    bedrooms: string; bathrooms: string; additionalServices: string[];
    commercialType: string; otherCommercialType: string; serviceDetails: string;
    customAnswers: Record<string, string>;
    existingAttachments: BookingAttachmentMeta[];
    initialContactType: "client" | "lead" | null;
    initialClientId:    string | null;
    initialLeadId:      string | null;
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
  initialValues,
  customQuestions,
  isSaving,
  onSave,
  onCancel,
}: RequestFormProps) {

  // ── Contact data ──────────────────────────────────────────────────────────
  const { data: allClients = [] } = useClients();
  const { data: allLeads  = [] } = useLeads();
  const activeClients = allClients.filter((c) => c.status === "active");

  const [contactType,       setContactType]       = useState<ContactType | null>(null);
  const [selectedClient,    setSelectedClient]    = useState<Client | null>(null);
  const [selectedLead,      setSelectedLead]      = useState<Lead | null>(null);
  const [selectedProperty,  setSelectedProperty]  = useState<ClientProperty | null>(null);
  const [showAddClient,     setShowAddClient]     = useState(false);
  const [showAddLead,       setShowAddLead]       = useState(false);

  const { data: clientProperties = [] } = useClientProperties(selectedClient?.id);

  // ── Form fields ───────────────────────────────────────────────────────────
  const [fullName,            setFullName]            = useState(initialValues?.fullName            ?? "");
  const [email,               setEmail]               = useState(initialValues?.email               ?? "");
  const [phone,               setPhone]               = useState(initialValues?.phone               ?? "");
  const [street,              setStreet]              = useState(initialValues?.street              ?? "");
  const [apt,                 setApt]                 = useState(initialValues?.apt                 ?? "");
  const [city,                setCity]                = useState(initialValues?.city                ?? "");
  const [state,               setState]               = useState(initialValues?.state               ?? "");
  const [zip,                 setZip]                 = useState(initialValues?.zip                 ?? "");
  const [serviceType,         setServiceType]         = useState(initialValues?.serviceType         ?? "");
  const [selectedDate,        setSelectedDate]        = useState<Date | undefined>(initialValues?.selectedDate);
  const [datePickerOpen,      setDatePickerOpen]      = useState(false);
  const [timePreference,      setTimePreference]      = useState(initialValues?.timePreference      ?? "");
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
  const [lightboxUrl,        setLightboxUrl]        = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Validation errors ─────────────────────────────────────────────────────
  const [errors,           setErrors]           = useState({ fullName: false, serviceType: false, contact: false });
  const [anonAddressErrors,setAnonAddressErrors] = useState({ street: false, city: false });

  // ── Auto-select primary property when client properties load ──────────────
  useEffect(() => {
    if (!selectedClient || clientProperties.length === 0) return;

    if (mode === "edit" && initialValues?.street) {
      const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
      const matched = clientProperties.find((p) =>
        norm(p.street) === norm(initialValues.street) &&
        norm(p.city) === norm(initialValues.city) &&
        norm(p.state) === norm(initialValues.state) &&
        norm(p.zip_code) === norm(initialValues.zip) &&
        norm(p.apt_suite) === norm(initialValues.apt),
      );
      setSelectedProperty(matched ?? null);
      return;
    }

    if (selectedProperty && clientProperties.some((p) => p.id === selectedProperty.id)) return;

    const primary = clientProperties.find((p) => p.is_primary) ?? clientProperties[0];
    setSelectedProperty(primary);
    setStreet(primary.street);
    setApt(primary.apt_suite ?? "");
    setCity(primary.city);
    setState(primary.state);
    setZip(primary.zip_code);
  }, [clientProperties, selectedClient]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pre-select contact from URL / initialValues (once lists load) ─────────
  const didPreselect = useRef(false);
  useEffect(() => {
    if (didPreselect.current) return;
    const { initialClientId, initialLeadId, initialContactType } = initialValues ?? {};
    if (initialContactType === "client" && initialClientId && allClients.length > 0) {
      const c = allClients.find((x) => x.id === initialClientId);
      if (c) { didPreselect.current = true; setContactType("client"); handleClientSelect(c); }
    } else if (initialContactType === "lead" && initialLeadId && allLeads.length > 0) {
      const l = allLeads.find((x) => x.id === initialLeadId);
      if (l) { didPreselect.current = true; setContactType("lead"); handleLeadSelect(l); }
    }
  }, [allClients, allLeads]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setSelectedProperty(null);
    setFullName(client.full_name);
    setEmail(client.email);
    setPhone(client.phone);
    setStreet(client.service_street || "");
    setApt(client.service_apt || "");
    setCity(client.service_city || "");
    setState(client.service_state || "");
    setZip(client.service_zip || "");
    setErrors((p) => ({ ...p, fullName: false, contact: false }));
  };

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead);
    setFullName(lead.full_name);
    setEmail(lead.email || "");
    setPhone(lead.phone || "");
    setStreet(lead.address || "");
    setApt(lead.apt_suite || "");
    setCity(lead.city || "");
    setState(lead.state || "");
    setZip(lead.zip_code || "");
    setErrors((p) => ({ ...p, fullName: false, contact: false }));
  };

  const handlePropertySelect = (propId: string) => {
    const prop = clientProperties.find((p) => p.id === propId);
    if (!prop) return;
    setSelectedProperty(prop);
    setStreet(prop.street);
    setApt(prop.apt_suite ?? "");
    setCity(prop.city);
    setState(prop.state);
    setZip(prop.zip_code);
  };

  const toggleAdditionalService = (svc: string) =>
    setAdditionalServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    );

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = "";
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
    if (mode === "create") {
      const contactMissing =
        !contactType ||
        (contactType === "client" && !selectedClient) ||
        (contactType === "lead" && !selectedLead) ||
        (contactType === "anonymous" && !fullName.trim());

      if (contactMissing || !serviceType) {
        setErrors({
          fullName:    contactType === "anonymous" && !fullName.trim(),
          serviceType: !serviceType,
          contact:     !!contactMissing && contactType !== "anonymous",
        });
        toast.error("Please fill in all required fields");
        return;
      }

      if (contactType === "anonymous") {
        if (!street.trim() || !city.trim()) {
          setAnonAddressErrors({ street: !street.trim(), city: !city.trim() });
          toast.error("Please fill in all required fields");
          return;
        }
        setAnonAddressErrors({ street: false, city: false });
        emitPayload({ contactOverride: "anonymous" });
        return;
      }

      emitPayload({});
    } else {
      if (!serviceType) {
        setErrors((p) => ({ ...p, serviceType: true }));
        toast.error("Please select a service type");
        return;
      }
      emitPayload({});
    }
  };

  const emitPayload = ({ contactOverride }: { contactOverride?: "anonymous" }) => {
    const resolvedStreet = selectedProperty?.street    ?? selectedClient?.service_street ?? selectedLead?.address  ?? street;
    const resolvedApt    = selectedProperty?.apt_suite ?? selectedClient?.service_apt    ?? selectedLead?.apt_suite ?? apt;
    const resolvedCity   = selectedProperty?.city      ?? selectedClient?.service_city   ?? selectedLead?.city     ?? city;
    const resolvedState  = selectedProperty?.state     ?? selectedClient?.service_state  ?? selectedLead?.state    ?? state;
    const resolvedZip    = selectedProperty?.zip_code  ?? selectedClient?.service_zip    ?? selectedLead?.zip_code ?? zip;

    const isAnon = contactOverride === "anonymous";

    onSave({
      lead_name:                (selectedClient?.full_name ?? selectedLead?.full_name ?? fullName).trim(),
      email:                    (selectedClient?.email     ?? selectedLead?.email     ?? email).trim(),
      phone:                    (selectedClient?.phone     ?? selectedLead?.phone     ?? phone).trim(),
      street:                   (isAnon ? street     : resolvedStreet).trim()  || "N/A",
      apt_suite:                (isAnon ? apt        : resolvedApt)?.trim()    || null,
      city:                     (isAnon ? city       : resolvedCity).trim()    || "N/A",
      state:                    (isAnon ? state      : resolvedState)          || "N/A",
      zip_code:                 (isAnon ? zip        : resolvedZip).trim()     || "N/A",
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
      client_id:                isAnon ? null : (selectedClient?.id ?? null),
      lead_id:                  isAnon ? null : (selectedLead?.id   ?? null),
      contact_type:             isAnon ? "anonymous" : (contactType ?? null),
      client_property_id:       !isAnon && selectedClient ? (selectedProperty?.id ?? null) : null,
      files:                    attachmentFiles.length > 0 ? attachmentFiles : undefined,
      existingAttachments:      keptAttachments,
    });
  };

  // ── Reusable selected-contact card ───────────────────────────────────────

  const renderContactCard = (entity: Client | Lead) => {
    const isClient = "service_street" in entity;
    const addrLine1 = isClient
      ? [entity.service_street, entity.service_apt].filter(Boolean).join(" ")
      : [(entity as Lead).address, (entity as Lead).apt_suite].filter(Boolean).join(" ");
    const addrLine2 = isClient
      ? [entity.service_city, `${entity.service_state ?? ""} ${entity.service_zip ?? ""}`.trim()].filter(Boolean).join(", ")
      : [(entity as Lead).city, `${(entity as Lead).state ?? ""} ${(entity as Lead).zip_code ?? ""}`.trim()].filter(Boolean).join(", ");

    return (
      <Card className="rounded-none border-0">
        <CardContent className="space-y-3 p-6">
          {[
            { icon: User,  label: "Full Name", value: entity.full_name },
            { icon: Mail,  label: "Email",     value: entity.email },
            { icon: Phone, label: "Phone",     value: entity.phone },
          ].map(({ icon: Icon, label, value }) => value && (
            <div key={label} className="flex items-start gap-3">
              <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            </div>
          ))}
          {(addrLine1 || addrLine2) && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="text-sm font-medium">
                  {addrLine1}{addrLine1 && addrLine2 && <br />}{addrLine2}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPropertySelector = () => (
    selectedClient && clientProperties.length > 0 ? (
      <Card className="rounded-none border-0">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Service Property
            </h2>
            <p className="text-sm text-muted-foreground">Select the property where the service will be performed</p>
          </div>
          <SearchableSelect
            value={selectedProperty?.id}
            onValueChange={handlePropertySelect}
            options={clientProperties.map((p) => ({
              value:    p.id,
              label:    p.title ? `${p.title} — ${p.street}` : p.street,
              subtitle: `${p.city}, ${p.state} ${p.zip_code}`,
            }))}
            placeholder="Select property..."
            title="Select Property"
            searchPlaceholder="Search properties..."
            emptyMessage="No properties found."
          />
          {selectedProperty && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Selected Address</p>
                <p className="text-sm font-medium">
                  {selectedProperty.street}{selectedProperty.apt_suite ? ` ${selectedProperty.apt_suite}` : ""}<br />
                  {selectedProperty.city}, {selectedProperty.state} {selectedProperty.zip_code}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    ) : null
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full bg-background pb-8">
      {/* Sticky header */}
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

      <div className="space-y-[5px] pt-[5px]">

        {/* ── CREATE MODE: contact picker ──────────────────────────── */}
        {mode === "create" && (
          <>
            {/* Step 1: contact type */}
            <Card className="rounded-none border-0">
              <CardContent className="p-6 space-y-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Who is this request for?</h2>
                  <p className="text-sm text-muted-foreground">Select the type of contact for this service request</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(["client", "lead"] as const).map((type) => (
                    <Button
                      key={type}
                      variant="outline"
                      onClick={() => {
                        setContactType(type);
                        setSelectedClient(null);
                        setSelectedLead(null);
                        setSelectedProperty(null);
                        setErrors((p) => ({ ...p, contact: false, fullName: false }));
                      }}
                      className={cn(
                        "h-10 flex items-center justify-start gap-3 px-4",
                        contactType === type ? "bg-primary/5 border-primary" : "",
                      )}
                    >
                      <User className="w-5 h-5" />
                      <span className="font-semibold capitalize">{type}</span>
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setContactType("anonymous");
                    setSelectedClient(null);
                    setSelectedLead(null);
                    setSelectedProperty(null);
                    setFullName(""); setEmail(""); setPhone("");
                    setStreet(""); setApt(""); setCity(""); setState(""); setZip("");
                    setErrors((p) => ({ ...p, contact: false, fullName: false }));
                  }}
                  className={cn(
                    "w-full h-10 flex items-center justify-start gap-3 px-4",
                    contactType === "anonymous" ? "bg-warning/5 border-warning" : "",
                  )}
                >
                  <UserPlus className="w-5 h-5" />
                  <span className="font-semibold">New Contact (not in CRM)</span>
                </Button>
                {errors.contact && (
                  <p className="text-xs text-destructive">Please select a client or lead.</p>
                )}
              </CardContent>
            </Card>

            {/* Step 2: pick the contact */}
            {contactType && contactType !== "anonymous" && (
              <Card className="rounded-none border-0">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {contactType === "client" ? "Client" : "Lead"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Select a {contactType} to generate the service request
                    </p>
                  </div>
                  <SearchableSelect
                    value={contactType === "client" ? selectedClient?.id : selectedLead?.id}
                    onValueChange={(id) => {
                      if (contactType === "client") {
                        const c = activeClients.find((x) => x.id === id);
                        if (c) handleClientSelect(c);
                      } else {
                        const l = allLeads.find((x) => x.id === id);
                        if (l) handleLeadSelect(l);
                      }
                    }}
                    options={
                      contactType === "client"
                        ? activeClients.map((c) => ({ value: c.id, label: c.full_name, subtitle: c.company || undefined }))
                        : allLeads.map((l) => ({ value: l.id, label: l.full_name, subtitle: l.company_name || undefined }))
                    }
                    placeholder={`Select ${contactType}...`}
                    title={`Select ${contactType === "client" ? "Client" : "Lead"}`}
                    searchPlaceholder={`Search ${contactType}s...`}
                    emptyMessage={`No ${contactType}s found.`}
                  />
                  {contactType === "client" && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => setShowAddClient(true)}
                    >
                      <Plus className="w-4 h-4" /> Add New Client
                    </Button>
                  )}
                  {contactType === "lead" && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => setShowAddLead(true)}
                    >
                      <Plus className="w-4 h-4" /> Add New Lead
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Anonymous: manual contact entry */}
            {contactType === "anonymous" && (
              <Card className="rounded-none border-0">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <UserPlus className="w-5 h-5" /> Contact Details
                    </h2>
                    <p className="text-sm text-muted-foreground">Enter their information manually</p>
                  </div>
                  <FloatInput
                    id="anonFullName"
                    label="Full Name *"
                    value={fullName}
                    onChange={(v) => { setFullName(v); setErrors((p) => ({ ...p, fullName: false })); }}
                    error={errors.fullName ? "Full name is required" : undefined}
                  />
                  <FloatInput id="anonEmail" label="Email" value={email} onChange={setEmail} type="email" />
                  <PhoneInput id="anonPhone" label="Phone" value={phone} onChange={setPhone} floatingLabel />
                  <AddressSection
                    values={{ street, apt, city, state, zip }}
                    onChange={(f, v) => {
                      if (f === "street") { setStreet(v); if (anonAddressErrors.street) setAnonAddressErrors((p) => ({ ...p, street: false })); }
                      if (f === "apt")    setApt(v);
                      if (f === "city")   { setCity(v);   if (anonAddressErrors.city)   setAnonAddressErrors((p) => ({ ...p, city:   false })); }
                      if (f === "state")  setState(v);
                      if (f === "zip")    setZip(v);
                    }}
                    errors={anonAddressErrors}
                    required
                  />
                </CardContent>
              </Card>
            )}

            {/* Selected contact summary */}
            {selectedClient && renderContactCard(selectedClient)}
            {selectedLead   && renderContactCard(selectedLead)}

            {/* Property selector */}
            {renderPropertySelector()}
          </>
        )}

        {/* ── EDIT MODE: optional contact picker ───────────────────── */}
        {mode === "edit" && (
          <>
            <Card className="rounded-none border-0">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Contact</h2>
                  <p className="text-sm text-muted-foreground">Optionally link or change the associated client or lead</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(["client", "lead"] as const).map((type) => (
                    <Button
                      key={type}
                      variant="outline"
                      onClick={() => { setContactType(type); setSelectedClient(null); setSelectedLead(null); setSelectedProperty(null); }}
                      className={cn("h-10 flex items-center justify-start gap-3 px-4", contactType === type ? "bg-primary/5 border-primary" : "")}
                    >
                      <User className="w-5 h-5" />
                      <span className="font-semibold capitalize">{type}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {contactType && contactType !== "anonymous" && (
              <Card className="rounded-none border-0">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {contactType === "client" ? "Client" : "Lead"}
                  </h2>
                  <SearchableSelect
                    value={contactType === "client" ? selectedClient?.id : selectedLead?.id}
                    onValueChange={(id) => {
                      if (contactType === "client") {
                        const c = activeClients.find((x) => x.id === id);
                        if (c) handleClientSelect(c);
                      } else {
                        const l = allLeads.find((x) => x.id === id);
                        if (l) handleLeadSelect(l);
                      }
                    }}
                    options={
                      contactType === "client"
                        ? activeClients.map((c) => ({ value: c.id, label: c.full_name, subtitle: c.company || undefined }))
                        : allLeads.map((l) => ({ value: l.id, label: l.full_name, subtitle: l.company_name || undefined }))
                    }
                    placeholder={`Select ${contactType}...`}
                    title={`Select ${contactType === "client" ? "Client" : "Lead"}`}
                    searchPlaceholder={`Search ${contactType}s...`}
                    emptyMessage={`No ${contactType}s found.`}
                  />
                </CardContent>
              </Card>
            )}

            {selectedClient && renderContactCard(selectedClient)}
            {selectedLead   && renderContactCard(selectedLead)}
            {renderPropertySelector()}

            {!selectedClient && !selectedLead && (
              <Card className="rounded-none border-0">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <UserPlus className="w-5 h-5" /> Contact Details
                    </h2>
                    <p className="text-sm text-muted-foreground">Edit the contact information for this request</p>
                  </div>
                  <FloatInput id="editFullName" label="Full Name" value={fullName} onChange={setFullName} />
                  <FloatInput id="editEmail"    label="Email"     value={email}    onChange={setEmail}    type="email" />
                  <PhoneInput id="editPhone"    label="Phone"     value={phone}    onChange={setPhone}    floatingLabel />
                  <AddressSection
                    values={{ street, apt, city, state, zip }}
                    onChange={(f, v) => {
                      if (f === "street") setStreet(v);
                      if (f === "apt")    setApt(v);
                      if (f === "city")   setCity(v);
                      if (f === "state")  setState(v);
                      if (f === "zip")    setZip(v);
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ── Preferred Date & Service ─────────────────────────────── */}
        <Card className="rounded-none border-x-0">
          <CardContent className="p-4 space-y-5">
            <h3 className="text-base font-semibold">Preferred Date & Service</h3>

            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-12 justify-start text-left font-normal rounded-md bg-background hover:bg-primary/10 hover:text-primary hover:border-primary",
                    !selectedDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Select Preferred Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { setSelectedDate(d); if (d) setDatePickerOpen(false); }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Select value={timePreference} onValueChange={setTimePreference}>
              <SelectTrigger className="h-12 rounded-md border border-border bg-background">
                <SelectValue placeholder="Time Preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="am">AM</SelectItem>
                <SelectItem value="pm">PM</SelectItem>
              </SelectContent>
            </Select>

            <div>
              <Select
                value={serviceType}
                onValueChange={(v) => { setServiceType(v); setErrors((p) => ({ ...p, serviceType: false })); }}
              >
                <SelectTrigger className={cn(
                  "h-12 rounded-md border bg-background",
                  errors.serviceType ? "border-destructive" : "border-border",
                )}>
                  <SelectValue placeholder="Service Type *" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
              {errors.serviceType && <p className="text-xs text-destructive mt-1">Service type is required</p>}
            </div>
          </CardContent>
        </Card>

        {/* ── Residential Details ──────────────────────────────────── */}
        {serviceType === "residential" && (
          <Card className="rounded-none border-x-0">
            <CardContent className="p-4 space-y-5">
              <h3 className="text-base font-semibold">Residential Service Details</h3>
              <FloatInput id="bedrooms"  label="How many bedrooms"  type="number" value={bedrooms}  onChange={setBedrooms} />
              <FloatInput id="bathrooms" label="How many bathrooms" type="number" value={bathrooms} onChange={setBathrooms} />
              <div>
                <Label className="text-sm font-medium mb-3 block">Additional Services</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ADDITIONAL_SERVICES.map((svc) => (
                    <div
                      key={svc}
                      onClick={() => toggleAdditionalService(svc)}
                      className={cn(
                        "flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all text-sm",
                        additionalServices.includes(svc)
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border bg-background hover:border-primary/50",
                      )}
                    >
                      {svc}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Service Details</Label>
                <Textarea
                  placeholder="Service details..."
                  value={serviceDetails}
                  onChange={(e) => setServiceDetails(e.target.value)}
                  className="min-h-[100px] rounded-md"
                />
              </div>
              {customQuestions
                .filter((q) => q.formType === "residential")
                .map((q) => (
                  <FloatInput
                    key={q.id}
                    id={q.id}
                    label={q.question}
                    value={customAnswers[q.id] || ""}
                    onChange={(v) => setCustomAnswers((p) => ({ ...p, [q.id]: v }))}
                  />
                ))}
            </CardContent>
          </Card>
        )}

        {/* ── Commercial Details ───────────────────────────────────── */}
        {serviceType === "commercial" && (
          <Card className="rounded-none border-x-0">
            <CardContent className="p-4 space-y-5">
              <h3 className="text-base font-semibold">Commercial Service Details</h3>
              <div>
                <Label className="text-sm font-medium mb-3 block">Property Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {COMMERCIAL_TYPES.map((type) => (
                    <div
                      key={type}
                      onClick={() => setCommercialType(type)}
                      className={cn(
                        "flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all text-sm",
                        commercialType === type
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border bg-background hover:border-primary/50",
                      )}
                    >
                      {type}
                    </div>
                  ))}
                </div>
              </div>
              {commercialType === "Other" && (
                <FloatInput id="otherType" label="Please specify" value={otherCommercialType} onChange={setOtherCommercialType} />
              )}
              <div>
                <Label className="text-sm font-medium mb-2 block">Service Details</Label>
                <Textarea
                  placeholder="Service details..."
                  value={serviceDetails}
                  onChange={(e) => setServiceDetails(e.target.value)}
                  className="min-h-[100px] rounded-md"
                />
              </div>
              {customQuestions
                .filter((q) => q.formType === "commercial")
                .map((q) => (
                  <FloatInput
                    key={q.id}
                    id={q.id}
                    label={q.question}
                    value={customAnswers[q.id] || ""}
                    onChange={(v) => setCustomAnswers((p) => ({ ...p, [q.id]: v }))}
                  />
                ))}
            </CardContent>
          </Card>
        )}

        {/* ── Attachments ──────────────────────────────────────────── */}
        <Card className="rounded-none border-x-0">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Attachments</h3>
              <span className="text-xs text-muted-foreground">
                {keptAttachments.length + attachmentFiles.length}/{MAX_FILES}
              </span>
            </div>

            {keptAttachments.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {keptAttachments.map((att, idx) =>
                  att.type.startsWith("image/") ? (
                    <div key={att.path} className="relative rounded-md overflow-hidden border border-border aspect-square bg-muted">
                      <img
                        src={att.public_url}
                        alt={att.name}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setLightboxUrl(att.public_url)}
                      />
                      <button
                        type="button"
                        onClick={() => setKeptAttachments((p) => p.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <a
                      key={att.path}
                      href={att.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-md border border-border bg-background"
                    >
                      <FileText className="h-4 w-4 text-destructive shrink-0" />
                      <span className="truncate text-xs flex-1">{att.name}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setKeptAttachments((p) => p.filter((_, i) => i !== idx)); }}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </a>
                  )
                )}
              </div>
            )}

            {attachmentFiles.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {attachmentFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-md border border-dashed border-primary/40 bg-primary/5">
                    {file.type.startsWith("image/")
                      ? <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
                      : <FileText  className="h-4 w-4 text-destructive shrink-0" />
                    }
                    <span className="truncate text-xs flex-1">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachmentFiles((p) => p.filter((_, i) => i !== idx))}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full h-12"
              disabled={isProcessingFiles || keptAttachments.length + attachmentFiles.length >= MAX_FILES}
              onClick={() => fileInputRef.current?.click()}
            >
              {isProcessingFiles
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Compressing...</>
                : <><Upload className="mr-2 h-4 w-4" />Add Photos or Files</>
              }
            </Button>
            <p className="text-xs text-muted-foreground">
              Images are automatically compressed to 2 MB · PDFs up to 2 MB · Max {MAX_FILES} files
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFilesSelected}
            />
          </CardContent>
        </Card>

        {/* ── Actions ──────────────────────────────────────────────── */}
        <Card className="rounded-none border-0">
          <CardContent className="px-4 pt-4 pb-4 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-1"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-md"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Modals for adding new client/lead inline */}
      <ClientForm open={showAddClient} onClose={() => setShowAddClient(false)} />
      <LeadForm   open={showAddLead}   onClose={() => setShowAddLead(false)} />
    </div>
  );
}
