/**
 * @module CommPropertyStep — Step 1 (Commercial)
 * Property type grid + size + service type + recurring frequency/days.
 */
import {
  Building2, Store, Warehouse, GraduationCap, Landmark, Hospital,
  Church, Truck, Hotel, Dumbbell, Film, CarFront, FileText,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { cn } from "@/shared/utils/cn";
import { toIntegerString } from "@/shared/utils/numericInput";

const PROPERTY_TYPES = [
  { value: "restaurant",      label: "Restaurant",      icon: Store },
  { value: "office",          label: "Office Building", icon: Building2 },
  { value: "warehouse",       label: "Warehouse",       icon: Warehouse },
  { value: "school",          label: "School",          icon: GraduationCap },
  { value: "bank",            label: "Bank",            icon: Landmark },
  { value: "clinic",          label: "Clinic",          icon: Hospital },
  { value: "church",          label: "Church",          icon: Church },
  { value: "food-truck",      label: "Food Truck",      icon: Truck },
  { value: "hotel",           label: "Hotel",           icon: Hotel },
  { value: "gym",             label: "Gym",             icon: Dumbbell },
  { value: "movie-theater",   label: "Movie Theater",   icon: Film },
  { value: "auto-dealership", label: "Auto Dealership", icon: CarFront },
] as const;

const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface CommPropertyStepProps {
  propertyType:        string;
  isOtherProperty:     boolean;
  otherPropertyType:   string;
  propertySize:        string;
  serviceType:         "one-time" | "recurrent" | "";
  recurringFrequency:  string;
  selectedWeekDays:    string[];
  contractDuration:    string;
  contractTimeUnit:    string;
  errors:              Record<string, boolean>;
  onPropertyTypeChange:       (v: string) => void;
  onIsOtherPropertyChange:    (v: boolean) => void;
  onOtherPropertyTypeChange:  (v: string) => void;
  onPropertySizeChange:       (v: string) => void;
  onServiceTypeChange:        (v: "one-time" | "recurrent") => void;
  onRecurringFrequencyChange: (v: string) => void;
  onWeekDayToggle:            (day: string) => void;
  onContractDurationChange:   (v: string) => void;
  onContractTimeUnitChange:   (v: string) => void;
  onClearError:               (key: string) => void;
}

export function CommPropertyStep({
  propertyType, isOtherProperty, otherPropertyType, propertySize,
  serviceType, recurringFrequency, selectedWeekDays,
  contractDuration, contractTimeUnit, errors,
  onPropertyTypeChange, onIsOtherPropertyChange, onOtherPropertyTypeChange,
  onPropertySizeChange, onServiceTypeChange, onRecurringFrequencyChange,
  onWeekDayToggle, onContractDurationChange, onContractTimeUnitChange, onClearError,
}: CommPropertyStepProps) {
  return (
    <div className="space-y-[5px]">

      {/* Property type grid */}
      <Card className="rounded-none border-0">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Property Type
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Select the type of property for this estimate</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PROPERTY_TYPES.map(({ value, label, icon: Icon }) => (
              <Button key={value} variant="outline"
                onClick={() => { onPropertyTypeChange(value); onIsOtherPropertyChange(false); onOtherPropertyTypeChange(""); onClearError("propertyType"); }}
                className={cn(
                  "h-20 flex flex-col items-center justify-center gap-2",
                  propertyType === value && !isOtherProperty && "bg-primary/10 border-primary/20 text-primary",
                  errors.propertyType && !propertyType && !otherPropertyType && "border-destructive",
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold text-center">{label}</span>
              </Button>
            ))}
            <Button variant="outline"
              onClick={() => { onIsOtherPropertyChange(true); onPropertyTypeChange(""); onClearError("propertyType"); }}
              className={cn(
                "h-20 flex flex-col items-center justify-center gap-2",
                isOtherProperty && "bg-primary/10 border-primary/20 text-primary",
              )}
            >
              <FileText className="w-5 h-5" />
              <span className="text-xs font-semibold">Other</span>
            </Button>
          </div>
          {isOtherProperty && (
            <Input
              placeholder="Enter property type"
              value={otherPropertyType}
              onChange={(e) => { onOtherPropertyTypeChange(e.target.value); onClearError("propertyType"); }}
              className={errors.propertyType && !otherPropertyType ? "border-destructive" : ""}
            />
          )}
          {errors.propertyType && <p className="text-xs text-destructive">Please select a property type</p>}
        </CardContent>
      </Card>

      {/* Property size */}
      <Card className="rounded-none border-0">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Property Size</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter the total size of the property in square feet</p>
          </div>
          <div className="relative">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Enter square feet"
              value={propertySize}
              onChange={(e) => { onPropertySizeChange(toIntegerString(e.target.value)); onClearError("propertySize"); }}
              className={cn("pr-14", errors.propertySize && "border-destructive")}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">sq ft</span>
          </div>
          {errors.propertySize && <p className="text-xs text-destructive">Please enter property size</p>}
        </CardContent>
      </Card>

      {/* Service type */}
      <Card className="rounded-none border-0">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Service Type</h2>
            <p className="text-sm text-muted-foreground mt-1">Select the type of cleaning service</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "one-time",   label: "One Time Cleaning" },
              { value: "recurrent",  label: "Recurring" },
            ].map(({ value, label }) => (
              <Button key={value} variant="outline"
                onClick={() => { onServiceTypeChange(value as any); onClearError("serviceType"); }}
                className={cn("h-12", serviceType === value && "bg-primary/10 border-primary/20 text-primary", errors.serviceType && !serviceType && "border-destructive")}
              >
                {label}
              </Button>
            ))}
          </div>
          {errors.serviceType && <p className="text-xs text-destructive">Please select a service type</p>}
        </CardContent>
      </Card>

      {/* Recurring frequency */}
      {serviceType === "recurrent" && (
        <Card className="rounded-none border-0">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Recurring Frequency</h2>
              <p className="text-sm text-muted-foreground mt-1">Select how often the service should occur</p>
            </div>
            <div className="space-y-2">
              {[
                { value: "once-per-week",     label: "Once per week" },
                { value: "every-2-weeks",     label: "Every 2 weeks" },
                { value: "every-3-weeks",     label: "Every 3 weeks" },
                { value: "once-per-month",    label: "Once per month" },
                { value: "multiple-per-week", label: "Multiple times per week" },
              ].map(({ value, label }) => (
                <Button key={value} variant="outline"
                  onClick={() => { onRecurringFrequencyChange(value); onClearError("recurringFrequency"); }}
                  className={cn("w-full h-11 justify-start", recurringFrequency === value && "bg-primary/10 border-primary/20 text-primary", errors.recurringFrequency && !recurringFrequency && "border-destructive")}
                >
                  {label}
                </Button>
              ))}
            </div>
            {errors.recurringFrequency && <p className="text-xs text-destructive">Please select a frequency</p>}
          </CardContent>
        </Card>
      )}

      {/* Select days (multiple times per week only) */}
      {serviceType === "recurrent" && recurringFrequency === "multiple-per-week" && (
        <Card className="rounded-none border-0">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Select Days</h2>
              <p className="text-sm text-muted-foreground mt-1">Choose the days for the recurring service</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {WEEK_DAYS.map((day) => (
                <Button key={day} variant="outline" onClick={() => onWeekDayToggle(day)}
                  className={cn("h-10 text-sm", selectedWeekDays.includes(day) && "bg-primary/10 border-primary/20 text-primary")}
                >
                  {day}
                </Button>
              ))}
            </div>
            {selectedWeekDays.length > 0 && (
              <p className="text-xs text-muted-foreground">{selectedWeekDays.length} day(s) selected</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contract duration */}
      {serviceType === "recurrent" && (
        <Card className="rounded-none border-0">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Contract Duration</h2>
              <p className="text-sm text-muted-foreground mt-1">Specify the length of the service contract (optional)</p>
            </div>
            <div className="flex gap-2">
              <Input
                type="text" inputMode="numeric" placeholder="Duration"
                value={contractDuration}
                onChange={(e) => onContractDurationChange(toIntegerString(e.target.value))}
                className="w-24"
              />
              <Select value={contractTimeUnit} onValueChange={onContractTimeUnitChange}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="months">Months</SelectItem>
                  <SelectItem value="years">Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

