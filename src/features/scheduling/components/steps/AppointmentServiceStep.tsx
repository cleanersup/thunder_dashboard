import { useState } from "react";
import { ChevronDown, Wrench, CalendarDays, Plus, Check } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import type { AppointmentFormData } from "../../types/scheduling.types";

// ─── Constants (exact strings from swift-slate source of truth) ───────────────

const ONE_TIME_CLEANING_TYPES = [
  "Deep cleaning",
  "Move in/Move out",
  "Post-construction",
] as const;

const RECURRING_CLEANING_TYPES = ["Residential", "Commercial"] as const;

const FREQ_OPTIONS = [
  { value: "multiple",  label: "Multiple times per week" },
  { value: "weekly",    label: "Once per week"           },
  { value: "biweekly",  label: "Every 2 weeks"           },
  { value: "triweekly", label: "Every 3 weeks"           },
  { value: "monthly",   label: "Once per month"          },
] as const;

const DAYS = [
  { value: "sunday",    label: "Sunday"    },
  { value: "monday",    label: "Monday"    },
  { value: "tuesday",   label: "Tuesday"   },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday",  label: "Thursday"  },
  { value: "friday",    label: "Friday"    },
  { value: "saturday",  label: "Saturday"  },
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  serviceType:            string;
  cleaningType:           string | null;
  recurringFrequency:     AppointmentFormData["recurring_frequency"];
  recurringDuration:      string | null;
  recurringDurationUnit:  string | null;
  selectedWeekDays:       string[];
  customCleaningTypes:    string[];
  errors: Partial<Record<
    "service_type" | "cleaning_type" | "recurring_frequency" | "selected_week_days" | "recurring_duration",
    string
  >>;
  onChange: <K extends keyof AppointmentFormData>(key: K, value: AppointmentFormData[K]) => void;
  onCustomCleaningTypesChange: (types: string[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentServiceStep({
  serviceType,
  cleaningType,
  recurringFrequency,
  recurringDuration,
  recurringDurationUnit,
  selectedWeekDays,
  customCleaningTypes,
  errors,
  onChange,
  onCustomCleaningTypesChange,
}: Props) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTypeName, setNewTypeName]     = useState("");

  const isRecurring = serviceType === "Recurring";
  const freqLabel   = FREQ_OPTIONS.find((f) => f.value === recurringFrequency)?.label;

  // Contract duration section is visible when:
  // frequency is set AND (not "multiple" OR at least one day is selected)
  const showContractDuration =
    isRecurring &&
    cleaningType &&
    recurringFrequency &&
    recurringFrequency !== "none" &&
    (recurringFrequency !== "multiple" || selectedWeekDays.length > 0);

  function handleAddCustomType() {
    const name = newTypeName.trim();
    if (!name) return;
    onCustomCleaningTypesChange([...customCleaningTypes, name]);
    onChange("cleaning_type", name);
    setNewTypeName("");
    setShowAddDialog(false);
  }

  function toggleWeekDay(day: string) {
    const next = selectedWeekDays.includes(day)
      ? selectedWeekDays.filter((d) => d !== day)
      : [...selectedWeekDays, day];
    onChange("selected_week_days", next);
  }

  return (
    <div className="space-y-6">

      {/* ── Service type ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Service type</h2>
          <p className="text-sm text-muted-foreground">
            Choose between one-time or recurring service
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className={serviceType ? "text-foreground" : "text-muted-foreground"}>
                {serviceType || "Select service type"}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[240px]">
            <DropdownMenuItem
              onClick={() => {
                onChange("service_type", "One time");
                onChange("recurring_frequency", "none");
                onChange("cleaning_type", null);
              }}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              One time
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onChange("service_type", "Recurring");
                onChange("cleaning_type", null);
              }}
            >
              <Wrench className="h-4 w-4 mr-2" />
              Recurring
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {errors.service_type && (
          <p className="text-xs text-destructive">{errors.service_type}</p>
        )}
      </div>

      {/* ── Cleaning type ─────────────────────────────────────────── */}
      {serviceType && (
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Cleaning type</h2>
            <p className="text-sm text-muted-foreground">
              Choose the type of cleaning service
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className={cleaningType ? "text-foreground" : "text-muted-foreground"}>
                  {cleaningType || "Select cleaning type"}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[240px]">
              {isRecurring ? (
                RECURRING_CLEANING_TYPES.map((type) => (
                  <DropdownMenuItem key={type} onClick={() => onChange("cleaning_type", type)}>
                    <Wrench className="h-4 w-4 mr-2" />
                    {type}
                  </DropdownMenuItem>
                ))
              ) : (
                <>
                  {ONE_TIME_CLEANING_TYPES.map((type) => (
                    <DropdownMenuItem key={type} onClick={() => onChange("cleaning_type", type)}>
                      <Wrench className="h-4 w-4 mr-2" />
                      {type}
                    </DropdownMenuItem>
                  ))}
                  {customCleaningTypes.map((type) => (
                    <DropdownMenuItem key={type} onClick={() => onChange("cleaning_type", type)}>
                      <Wrench className="h-4 w-4 mr-2" />
                      {type}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add cleaning type
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {errors.cleaning_type && (
            <p className="text-xs text-destructive">{errors.cleaning_type}</p>
          )}
        </div>
      )}

      {/* ── Recurring frequency ───────────────────────────────────── */}
      {isRecurring && cleaningType && (
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Recurring frequency</h2>
            <p className="text-sm text-muted-foreground">How often should this service repeat?</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className={freqLabel ? "text-foreground" : "text-muted-foreground"}>
                  {freqLabel ?? "Select frequency"}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[240px]">
              {FREQ_OPTIONS.map(({ value, label }) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => {
                    onChange(
                      "recurring_frequency",
                      value as AppointmentFormData["recurring_frequency"],
                    );
                    onChange("selected_week_days", []);
                  }}
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {errors.recurring_frequency && (
            <p className="text-xs text-destructive">{errors.recurring_frequency}</p>
          )}
        </div>
      )}

      {/* ── Days of the week ──────────────────────────────────────── */}
      {isRecurring && recurringFrequency === "multiple" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Select days of the week</h2>
            <p className="text-sm text-muted-foreground">
              Choose which days the service should repeat
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {DAYS.map(({ value, label }) => {
              const checked = selectedWeekDays.includes(value);
              return (
                <Button
                  key={value}
                  type="button"
                  variant={checked ? "default" : "outline"}
                  className="w-full"
                  onClick={() => toggleWeekDay(value)}
                >
                  {checked && <Check className="h-4 w-4 mr-2" />}
                  {label}
                </Button>
              );
            })}
          </div>
          {errors.selected_week_days && (
            <p className="text-xs text-destructive">{errors.selected_week_days}</p>
          )}
        </div>
      )}

      {/* ── Contract duration ─────────────────────────────────────── */}
      {showContractDuration && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Contract duration</h2>
            <p className="text-sm text-muted-foreground">
              How long should this recurring service last?
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rec-duration">Duration</Label>
            <Input
              id="rec-duration"
              type="number"
              min="1"
              placeholder="Enter duration"
              value={recurringDuration ?? ""}
              onChange={(e) => onChange("recurring_duration", e.target.value || null)}
              className={errors.recurring_duration ? "border-destructive" : ""}
            />
            {errors.recurring_duration && (
              <p className="text-xs text-destructive">{errors.recurring_duration}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Time unit</Label>
            <Select
              value={recurringDurationUnit ?? "months"}
              onValueChange={(v) =>
                onChange(
                  "recurring_duration_unit",
                  v as AppointmentFormData["recurring_duration_unit"],
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select time unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weeks">Weeks</SelectItem>
                <SelectItem value="months">Months</SelectItem>
                <SelectItem value="years">Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* ── Add Custom Cleaning Type dialog ───────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={(v) => !v && setShowAddDialog(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Custom Cleaning Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="custom-type-name">Cleaning Type Name</Label>
            <Input
              id="custom-type-name"
              placeholder="e.g., Window Cleaning"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCustomType()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowAddDialog(false); setNewTypeName(""); }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddCustomType} disabled={!newTypeName.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
