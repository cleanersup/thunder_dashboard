import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { formatDisplayDateShort } from "@/shared/utils/formatters";
import { CalendarIcon, Download, Upload, X } from "lucide-react";
import {
  FormSheet, FormBand, FloatingInput, SelectField, TextareaField,
} from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { withRequiredMark } from "@/shared/utils/formLabel";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { PhoneInput } from "@/shared/components/ui/phone-input";
import { AddressAutocomplete } from "@/shared/components/AddressAutocomplete";
import { COUNTRY_OPTIONS } from "@/shared/constants/countries";
import { cn } from "@/shared/utils/cn";
import { employeeSchema, type EmployeeFormData } from "../schemas/employeeSchema";

const GENDER_OPTIONS = [
  { value: "male",   label: "Male" },
  { value: "female", label: "Female" },
] as const;
import { useCreateEmployee, useUpdateEmployee, useEmployee } from "../hooks/useEmployees";
import { downloadEmployeeDocument } from "../services/employeesService";
import type { EntityOption } from "@/shared/components/common/EntityPickerField";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Available Days ────────────────────────────────────────────────────────────

type Shift = "AM" | "PM" | "NIGHT";

const DAYS_OF_WEEK = [
  { key: "monday",    label: "Mon" },
  { key: "tuesday",   label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday",  label: "Thu" },
  { key: "friday",    label: "Fri" },
  { key: "saturday",  label: "Sat" },
  { key: "sunday",    label: "Sun" },
] as const;

type DayKey = typeof DAYS_OF_WEEK[number]["key"];

type DaySchedule = { AM: boolean; PM: boolean; NIGHT: boolean };
type AvailableDays = Record<DayKey, DaySchedule>;

function makeDefaultDays(): AvailableDays {
  return Object.fromEntries(
    DAYS_OF_WEEK.map(({ key }) => [key, { AM: false, PM: false, NIGHT: false }]),
  ) as AvailableDays;
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface EmployeeFormProps {
  open: boolean;
  onClose: () => void;
  /** When provided, form runs in edit mode for this employee */
  employeeId?: string;
  /** Called with the newly created employee after successful creation */
  onCreated?: (employee: EntityOption) => void;
  /** Called after a successful update */
  onUpdated?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmployeeForm({ open, onClose, employeeId, onCreated, onUpdated }: EmployeeFormProps) {
  const isEdit = Boolean(employeeId);

  const { mutate: createEmployee, isPending: isCreating } = useCreateEmployee();
  const { mutate: updateEmployee, isPending: isUpdating } = useUpdateEmployee();
  const isPending = isCreating || isUpdating;

  const { data: existingEmployee } = useEmployee(isEdit ? employeeId : undefined);

  const {
    handleSubmit,
    control,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
  });

  // Local state for complex fields
  const [birthdayDate, setBirthdayDate]   = useState<Date | undefined>(undefined);
  const [birthdayOpen, setBirthdayOpen]   = useState(false);
  const [availableDays, setAvailableDays] = useState<AvailableDays>(makeDefaultDays());
  const [docFiles, setDocFiles]           = useState<File[]>([]);
  const [existingDocs, setExistingDocs]   = useState<string[]>([]);
  const [country, setCountry]           = useState("us");
  const [dragOver, setDragOver]           = useState(false);
  const fileInputRef                      = useRef<HTMLInputElement>(null);

  const autocompleteCountry = country === "all" ? "" : country;

  // Reset and prefill when the modal opens
  useEffect(() => {
    if (!open) return;

    if (isEdit && existingEmployee) {
      // Prefill form with existing data
      reset({
        full_name:        `${existingEmployee.first_name} ${existingEmployee.last_name}`.trim(),
        email:            existingEmployee.email ?? "",
        phone:            existingEmployee.phone ?? "",
        street:           existingEmployee.street ?? "",
        apt_suite:        existingEmployee.apt_suite ?? "",
        city:             existingEmployee.city ?? "",
        state:            existingEmployee.state ?? "",
        zip:              existingEmployee.zip ?? "",
        gender:           (existingEmployee.gender as "male" | "female") ?? "male",
        birthday:         existingEmployee.birthday ?? "",
        position:         existingEmployee.position ?? "",
        hourly_rate:      existingEmployee.hourly_rate ?? undefined,
        additional_notes: existingEmployee.additional_notes ?? "",
      });

      if (existingEmployee.birthday) {
        try {
          setBirthdayDate(parseISO(existingEmployee.birthday));
        } catch {
          setBirthdayDate(undefined);
        }
      }

      if (existingEmployee.available_days) {
        // Normalize keys to lowercase — swift-slate may store Title Case keys ("Monday")
        const raw = existingEmployee.available_days as Record<string, DaySchedule>;
        const normalized = Object.fromEntries(
          Object.entries(raw).map(([k, v]) => [k.toLowerCase(), v])
        ) as AvailableDays;
        setAvailableDays(normalized);
      } else {
        setAvailableDays(makeDefaultDays());
      }

      setExistingDocs(existingEmployee.documents ?? []);
      setDocFiles([]);
      setCountry("us");
    } else {
      reset();
      setBirthdayDate(undefined);
      setAvailableDays(makeDefaultDays());
      setDocFiles([]);
      setExistingDocs([]);
      setCountry("us");
    }
  }, [open, isEdit, existingEmployee, reset]);

  // ─── Day toggle ──────────────────────────────────────────────────────────

  function toggleShift(day: DayKey, shift: Shift) {
    setAvailableDays((prev) => ({
      ...prev,
      [day]: { ...prev[day], [shift]: !prev[day][shift] },
    }));
  }

  // ─── Document handling ───────────────────────────────────────────────────

  function addFiles(files: FileList | File[]) {
    const allowed = Array.from(files).filter((f) =>
      ["application/pdf", "image/png", "image/jpeg"].includes(f.type),
    );
    setDocFiles((prev) => [...prev, ...allowed]);
  }

  function removeFile(index: number) {
    setDocFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function removeExistingDoc(index: number) {
    setExistingDocs((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  const onSubmit = async (data: EmployeeFormData) => {
    const documentPaths: string[] = [...existingDocs];

    if (docFiles.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload documents");
        return;
      }

      const uploadPromises = docFiles.map(async (file) => {
        const ext = file.name.split(".").pop() ?? "";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage
          .from("employee-documents")
          .upload(path, file);
        if (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          return null;
        }
        return path;
      });

      const results = await Promise.all(uploadPromises);
      documentPaths.push(...results.filter((p): p is string => p !== null));
    }

    const enriched: EmployeeFormData = {
      ...data,
      available_days: availableDays,
      documents: documentPaths.length ? documentPaths : undefined,
    };

    if (isEdit && employeeId) {
      updateEmployee(
        { id: employeeId, data: enriched },
        {
          onSuccess: () => {
            onUpdated?.();
            onClose();
          },
        },
      );
    } else {
      createEmployee(enriched, {
        onSuccess: (created) => {
          const option: EntityOption = {
            id: created.id,
            label: `${created.first_name} ${created.last_name}`.trim(),
          };
          onCreated?.(option);
          onClose();
        },
      });
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Employee" : "Add Employee"}
      submitLabel={isEdit ? "Save Changes" : "Add Employee"}
      submitPendingLabel={isEdit ? "Saving..." : "Adding..."}
      onSubmit={handleSubmit(onSubmit)}
      isPending={isPending}
    >
      <div className="contents" onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}>

          {/* ── Personal Information ─────────────────────────────────── */}
          <FormBand title="Personal Information">
            <Controller
              control={control}
              name="full_name"
              render={({ field }) => (
                <FloatingInput
                  id="employee-full-name"
                  label="Full Name"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  required
                  error={errors.full_name?.message}
                />
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <FloatingInput
                    id="employee-email"
                    label="Email Address"
                    type="email"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    required
                    error={errors.email?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput
                    id="employee-phone"
                    floatingLabel
                    label={withRequiredMark("Phone Number", true)}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    error={errors.phone?.message}
                  />
                )}
              />
            </div>

            <SelectField
              placeholder="Country"
              value={country}
              onChange={setCountry}
              options={COUNTRY_OPTIONS}
            />

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <AddressAutocomplete
                  value={watch("street") ?? ""}
                  onChange={(v) => setValue("street", v)}
                  onAddressSelect={(c) => {
                    setValue("street", c.street);
                    setValue("city", c.city);
                    setValue("state", c.state);
                    setValue("zip", c.zip);
                  }}
                  country={autocompleteCountry}
                  placeholder="Street"
                />
              </div>
              <Controller
                control={control}
                name="apt_suite"
                render={({ field }) => (
                  <FloatingInput
                    id="employee-apt"
                    label="Apt / Suite"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Controller
                control={control}
                name="city"
                render={({ field }) => (
                  <FloatingInput id="employee-city" label="City" value={field.value ?? ""} onChange={field.onChange} />
                )}
              />
              <Controller
                control={control}
                name="state"
                render={({ field }) => (
                  <FloatingInput id="employee-state" label="State" value={field.value ?? ""} onChange={field.onChange} />
                )}
              />
              <Controller
                control={control}
                name="zip"
                render={({ field }) => (
                  <FloatingInput id="employee-zip" label="Zip Code" type="integer" value={field.value ?? ""} onChange={field.onChange} />
                )}
              />
            </div>
          </FormBand>

          {/* ── Employment Details ───────────────────────────────────── */}
          <FormBand title="Employment Details">
            <div className="grid grid-cols-2 gap-3">
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <SelectField
                    placeholder="Gender"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={GENDER_OPTIONS}
                    required
                    error={errors.gender?.message}
                  />
                )}
              />
              {/* La fecha de nacimiento necesita saltar décadas atrás, así que
                  conserva el calendario con selector de año en vez de `DateField`. */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{withRequiredMark("Date of Birth", true)}</Label>
                <Popover open={birthdayOpen} onOpenChange={setBirthdayOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="field"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !birthdayDate && "text-muted-foreground",
                        errors.birthday && "border-destructive",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {birthdayDate ? formatDisplayDateShort(birthdayDate) : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={birthdayDate}
                      onSelect={(d) => {
                        if (d) {
                          setBirthdayDate(d);
                          setValue("birthday", format(d, "yyyy-MM-dd"), { shouldValidate: true });
                          setBirthdayOpen(false);
                        }
                      }}
                      captionLayout="dropdown-buttons"
                      fromYear={1950}
                      toYear={new Date().getFullYear()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.birthday && (
                  <p className="text-xs text-destructive">{errors.birthday.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Controller
                control={control}
                name="position"
                render={({ field }) => (
                  <FloatingInput
                    id="employee-position"
                    label="Position"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                control={control}
                name="hourly_rate"
                render={({ field }) => (
                  <FloatingInput
                    id="employee-rate"
                    label="Hourly Rate (USD)"
                    type="decimal"
                    value={field.value != null ? String(field.value) : ""}
                    onChange={field.onChange}
                    error={errors.hourly_rate?.message}
                  />
                )}
              />
            </div>
          </FormBand>

          {/* ── Available Days ───────────────────────────────────────── */}
          <FormBand title="Available Days">

            <div className="rounded-lg border border-border overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-4 bg-muted/50 px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">Day</span>
                <span className="text-xs font-medium text-muted-foreground text-center">AM</span>
                <span className="text-xs font-medium text-muted-foreground text-center">PM</span>
                <span className="text-xs font-medium text-muted-foreground text-center">NIGHT</span>
              </div>
              {/* Day rows */}
              {DAYS_OF_WEEK.map(({ key, label }, idx) => (
                <div
                  key={key}
                  className={cn(
                    "grid grid-cols-4 items-center px-3 py-2",
                    idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                  )}
                >
                  <span className="text-sm font-medium">{label}</span>
                  {(["AM", "PM", "NIGHT"] as Shift[]).map((shift) => (
                    <div key={shift} className="flex justify-center">
                      <Checkbox
                        checked={availableDays[key][shift]}
                        onCheckedChange={() => toggleShift(key, shift)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </FormBand>

          <FormBand title="Additional Notes">
            <Controller
              control={control}
              name="additional_notes"
              render={({ field }) => (
                <TextareaField
                  id="employee-notes"
                  label="Notes"
                  placeholder="Any additional information..."
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
            />
          </FormBand>

          {/* ── Upload Documents (ID, W-9, Non-compete) ──────────────── */}
          <FormBand title="Upload Documents (ID, W-9, Non-compete)">

            {/* Existing documents (edit mode) */}
            {existingDocs.length > 0 && (
              <ul className="space-y-2">
                {existingDocs.map((doc, idx) => {
                  const docName = doc.split("/").pop() ?? doc;
                  const employeeName = existingEmployee
                    ? `${existingEmployee.first_name}_${existingEmployee.last_name}`.replace(/\s+/g, "_")
                    : "document";
                  const downloadFilename = `${employeeName}_${docName}`;
                  return (
                    <li
                      key={idx}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <span className="truncate text-foreground">{docName}</span>
                      <div className="ml-2 flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            downloadEmployeeDocument(doc, downloadFilename).catch(() =>
                              toast.error("Failed to download document"),
                            );
                          }}
                          className="text-muted-foreground hover:text-foreground"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeExistingDoc(idx)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Remove"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Drop zone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30",
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, PNG, JPG up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>

            {/* New files list */}
            {docFiles.length > 0 && (
              <ul className="space-y-2">
                {docFiles.map((file, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="truncate text-foreground">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </FormBand>

      </div>
    </FormSheet>
  );
}
