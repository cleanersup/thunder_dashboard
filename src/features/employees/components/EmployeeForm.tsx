import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { PhoneInput } from "@/shared/components/ui/phone-input";
import { employeeSchema, type EmployeeFormData } from "../schemas/employeeSchema";
import { useCreateEmployee } from "../hooks/useEmployees";
import type { EntityOption } from "@/shared/components/common/EntityPickerField";

interface EmployeeFormProps {
  open: boolean;
  onClose: () => void;
  /** Called with the newly created employee after successful creation */
  onCreated?: (employee: EntityOption) => void;
}

/**
 * Modal form for creating a new employee.
 * Designed to work both as a standalone modal and as a nested modal
 * (inside TaskForm, EstimateForm, etc.) via the onCreated callback.
 *
 * Fields mirror the swift-slate /add-employee screen (documents and
 * available-days schedule are managed in the dedicated Employees section).
 */
export function EmployeeForm({ open, onClose, onCreated }: EmployeeFormProps) {
  const { mutate: createEmployee, isPending } = useCreateEmployee();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
  });

  // Reset the form every time the modal opens
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const onSubmit = (data: EmployeeFormData) => {
    createEmployee(data, {
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">

          {/* ── Personal Information ──────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Personal Information
            </h3>

            <div>
              <Label>Full Name *</Label>
              <Input {...register("full_name")} placeholder="First Last" />
              {errors.full_name && (
                <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email *</Label>
                <Input type="email" {...register("email")} placeholder="email@example.com" />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Label>Phone *</Label>
                <Controller
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <PhoneInput
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="(555)555-5555"
                    />
                  )}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Gender *</Label>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
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
                <Input type="date" {...register("birthday")} />
                {errors.birthday && (
                  <p className="text-xs text-destructive mt-1">{errors.birthday.message}</p>
                )}
              </div>
            </div>
          </section>

          <hr className="border-border" />

          {/* ── Employment Details ────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Employment Details
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Position</Label>
                <Input {...register("position")} placeholder="e.g. Cleaner" />
              </div>
              <div>
                <Label>Hourly Rate ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("hourly_rate")}
                  placeholder="0.00"
                />
                {errors.hourly_rate && (
                  <p className="text-xs text-destructive mt-1">{errors.hourly_rate.message}</p>
                )}
              </div>
            </div>
          </section>

          <hr className="border-border" />

          {/* ── Address (optional) ───────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Address <span className="normal-case font-normal">(optional)</span>
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>Street</Label>
                <Input {...register("street")} placeholder="123 Main St" />
              </div>
              <div>
                <Label>Apt / Suite</Label>
                <Input {...register("apt_suite")} placeholder="Apt 4B" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>City</Label>
                <Input {...register("city")} placeholder="City" />
              </div>
              <div>
                <Label>State</Label>
                <Input {...register("state")} placeholder="FL" />
              </div>
              <div>
                <Label>Zip</Label>
                <Input {...register("zip")} placeholder="33101" />
              </div>
            </div>
          </section>

          <hr className="border-border" />

          {/* ── Additional Notes ─────────────────────────────────────── */}
          <section>
            <Label>Additional Notes</Label>
            <Textarea
              {...register("additional_notes")}
              rows={3}
              placeholder="Any additional information..."
            />
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
