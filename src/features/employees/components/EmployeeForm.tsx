import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Upload, X } from "lucide-react";
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
import { cn } from "@/shared/utils/cn";
import { employeeSchema, type EmployeeFormData } from "../schemas/employeeSchema";
import { toDecimalString } from "@/shared/utils/numericInput";
import { useCreateEmployee } from "../hooks/useEmployees";
import type { EntityOption } from "@/shared/components/common/EntityPickerField";

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
  /** Called with the newly created employee after successful creation */
  onCreated?: (employee: EntityOption) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmployeeForm({ open, onClose, onCreated }: EmployeeFormProps) {
  const { mutate: createEmployee, isPending } = useCreateEmployee();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
  });

  // Local state for complex fields
  const [birthdayDate, setBirthdayDate]   = useState<Date | undefined>(undefined);
  const [birthdayOpen, setBirthdayOpen]   = useState(false);
  const [availableDays, setAvailableDays] = useState<AvailableDays>(makeDefaultDays());
  const [docFiles, setDocFiles]           = useState<File[]>([]);
  const [dragOver, setDragOver]           = useState(false);
  const fileInputRef                      = useRef<HTMLInputElement>(null);

  // Reset every time the modal opens
  useEffect(() => {
    if (open) {
      reset();
      setBirthdayDate(undefined);
      setAvailableDays(makeDefaultDays());
      setDocFiles([]);
    }
  }, [open, reset]);

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

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  const onSubmit = (data: EmployeeFormData) => {
    // Attach available_days and document file names
    const enriched: EmployeeFormData = {
      ...data,
      available_days: availableDays,
      documents: docFiles.map((f) => f.name),
    };
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
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-2">

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
                <Input {...register("street")} placeholder="123 Main St" className="mt-1" />
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
                      {birthdayDate ? format(birthdayDate, "MM/dd/yyyy") : "Select date"}
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

            {/* Selected files list */}
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
              {isPending ? "Adding..." : "Add Employee"}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
