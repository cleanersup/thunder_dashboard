import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { formatDisplayDateShort } from "@/shared/utils/formatters";
import { CalendarIcon, Download, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { PhoneInput } from "@/shared/components/ui/phone-input";
import { AddressAutocomplete } from "@/shared/components/AddressAutocomplete";
import { cn } from "@/shared/utils/cn";
import { employeeSchema, type EmployeeFormData } from "../schemas/employeeSchema";
import { toDecimalString } from "@/shared/utils/numericInput";
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
    register,
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
  const [dragOver, setDragOver]           = useState(false);
  const fileInputRef                      = useRef<HTMLInputElement>(null);

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
    } else {
      reset();
      setBirthdayDate(undefined);
      setAvailableDays(makeDefaultDays());
      setDocFiles([]);
      setExistingDocs([]);
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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          if ((e.target as HTMLElement).closest?.(".pac-container")) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Employee" : "Add Employee"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          className="space-y-6 mt-2"
        >

          {/* ── Personal Information ─────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Personal Information
            </h3>

            {/* Full Name */}
            <div>
              <Label>Full Name *</Label>
              <Input {...register("full_name")} placeholder="First Last" className="mt-1" />
              {errors.full_name && (
                <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>
              )}
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  {...register("email")}
                  placeholder="email@example.com"
                  className="mt-1"
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Label>Phone Number *</Label>
                <Controller
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <PhoneInput
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="(555) 555-5555"
                      className="mt-1"
                    />
                  )}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* Street + Apt */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>Street</Label>
                <AddressAutocomplete
                  value={watch("street") ?? ""}
                  onChange={(v) => setValue("street", v)}
                  onAddressSelect={(c) => {
                    setValue("street", c.street);
                    setValue("city", c.city);
                    setValue("state", c.state);
                    setValue("zip", c.zip);
                  }}
                  placeholder="123 Main St"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Apt / Suite</Label>
                <Input {...register("apt_suite")} placeholder="Apt 4B" className="mt-1" />
              </div>
            </div>

            {/* City + State + Zip */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>City</Label>
                <Input {...register("city")} placeholder="City" className="mt-1" />
              </div>
              <div>
                <Label>State</Label>
                <Input {...register("state")} placeholder="FL" className="mt-1" />
              </div>
              <div>
                <Label>Zip Code</Label>
                <Input {...register("zip")} placeholder="33101" className="mt-1" />
              </div>
            </div>
          </section>

          <hr className="border-border" />

          {/* ── Employment Details ───────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Employment Details
            </h3>

            {/* Gender + Date of Birth */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Gender *</Label>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.gender && (
                  <p className="text-xs text-destructive mt-1">{errors.gender.message}</p>
                )}
              </div>
              <div>
                <Label>Date of Birth *</Label>
                <Popover open={birthdayOpen} onOpenChange={setBirthdayOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
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
                  <p className="text-xs text-destructive mt-1">{errors.birthday.message}</p>
                )}
              </div>
            </div>

            {/* Position + Hourly Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Position</Label>
                <Input {...register("position")} placeholder="e.g. Cleaner" className="mt-1" />
              </div>
              <div>
                <Label>Hourly Rate (USD)</Label>
                {(() => {
                  const field = register("hourly_rate");
                  return (
                    <Input
                      type="text"
                      inputMode="decimal"
                      {...field}
                      onChange={(e) => {
                        e.target.value = toDecimalString(e.target.value);
                        field.onChange(e);
                      }}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  );
                })()}
                {errors.hourly_rate && (
                  <p className="text-xs text-destructive mt-1">{errors.hourly_rate.message}</p>
                )}
              </div>
            </div>
          </section>

          <hr className="border-border" />

          {/* ── Available Days ───────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Available Days
            </h3>

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
          </section>

          <hr className="border-border" />

          {/* ── Additional Notes ─────────────────────────────────────── */}
          <section className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              {...register("additional_notes")}
              rows={3}
              placeholder="Any additional information..."
            />
          </section>

          <hr className="border-border" />

          {/* ── Upload Documents (ID, W-9, Non-compete) ──────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Upload Documents (ID, W-9, Non-compete)
            </h3>

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
          </section>

          {/* ── Actions ──────────────────────────────────────────────── */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending
                ? isEdit ? "Saving..." : "Adding..."
                : isEdit ? "Save Changes" : "Add Employee"}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
