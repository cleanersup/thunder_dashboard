/**
 * @module CommDetailsStep — Step 2 (Commercial)
 * Group B (restaurant/food-truck): service schedule + grease level + restaurant condition + supplies + extras.
 * Group A (all others): supplies + service schedule + dust level + property condition + extras.
 */
import { Clock, Flame, Star, Wind, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "@/shared/utils/cn";
import { FormSection } from "@/shared/components/forms";

// Group B (restaurant / food-truck) extras.
const EXTRA_SERVICE_OPTIONS_GROUP_B = [
  { value: "hoods",         label: "Hoods" },
  { value: "windows",       label: "Windows" },
  { value: "refrigerators", label: "Refrigerators" },
];

// Group A (office-style properties) extras.
const EXTRA_SERVICE_OPTIONS_GROUP_A = [
  { value: "inside-windows",  label: "Inside Windows" },
  { value: "outside-windows", label: "Outside Windows" },
  { value: "sidewalks",       label: "Sidewalks" },
  { value: "store",           label: "Store" },
];

export interface CommDetailsStepProps {
  groupB:                 boolean;
  serviceSchedule:        string;
  greaseLevel:            string;
  restaurantCondition:    string;
  dustLevel:              string;
  propertyCondition:      string;
  clientProvidesSupplies: boolean;
  extraServices:          string[];
  errors:                 Record<string, boolean>;
  onServiceScheduleChange:        (v: string) => void;
  onGreaseLevelChange:            (v: string) => void;
  onRestaurantConditionChange:    (v: string) => void;
  onDustLevelChange:              (v: string) => void;
  onPropertyConditionChange:      (v: string) => void;
  onClientProvidesSuppliesChange: (v: boolean) => void;
  onExtraServiceToggle:           (v: string) => void;
  onClearError:                   (key: string) => void;
}

export function CommDetailsStep({
  groupB,
  serviceSchedule, greaseLevel, restaurantCondition, dustLevel, propertyCondition,
  clientProvidesSupplies, extraServices, errors,
  onServiceScheduleChange, onGreaseLevelChange, onRestaurantConditionChange,
  onDustLevelChange, onPropertyConditionChange,
  onClientProvidesSuppliesChange, onExtraServiceToggle, onClearError,
}: CommDetailsStepProps) {
  return (
    <div className="space-y-5">

      {/* Group B: service schedule at top */}
      {groupB && <FormSection
        icon={Clock}
        title="Service Schedule"
        subtitle="Select the service schedule"
      >
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "diurno",   label: "Day Shift" },
              { value: "nocturno", label: "Night Shift" },
            ].map(({ value, label }) => (
              <Button key={value} variant="outline"
                onClick={() => { onServiceScheduleChange(value); onClearError("serviceSchedule"); }}
                className={cn("h-12", serviceSchedule === value && "bg-primary/10 border-primary/20 text-primary", errors.serviceSchedule && !serviceSchedule && "border-destructive")}
              >
                {label}
              </Button>
            ))}
          </div>
          {errors.serviceSchedule && <p className="text-xs text-destructive">Please select a schedule</p>}
</FormSection>}

      {groupB && <FormSection
        icon={Flame}
        title="Grease Level"
        subtitle="Select the grease level"
      >
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "bajo",  label: "Low" },
              { value: "medio", label: "Medium" },
              { value: "alto",  label: "High" },
            ].map(({ value, label }) => (
              <Button key={value} variant="outline"
                onClick={() => { onGreaseLevelChange(value); onClearError("greaseLevel"); }}
                className={cn("h-12", greaseLevel === value && "bg-primary/10 border-primary/20 text-primary", errors.greaseLevel && !greaseLevel && "border-destructive")}
              >
                {label}
              </Button>
            ))}
          </div>
          {errors.greaseLevel && <p className="text-xs text-destructive">Please select a grease level</p>}
</FormSection>}

      {groupB && <FormSection
        icon={Star}
        title="Restaurant Condition"
        subtitle="Select the restaurant condition"
      >
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "bien-mantenido", label: "Well Maintained" },
              { value: "sucio",          label: "Dirty" },
              { value: "muy-sucio",      label: "Very Dirty" },
            ].map(({ value, label }) => (
              <Button key={value} variant="outline"
                onClick={() => { onRestaurantConditionChange(value); onClearError("restaurantCondition"); }}
                className={cn("h-12 text-xs", restaurantCondition === value && "bg-primary/10 border-primary/20 text-primary", errors.restaurantCondition && !restaurantCondition && "border-destructive")}
              >
                {label}
              </Button>
            ))}
          </div>
          {errors.restaurantCondition && <p className="text-xs text-destructive">Please select property condition</p>}
</FormSection>}

      {/* Client provides supplies */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Client Provides Supplies</p>
              <p className="text-xs text-muted-foreground mt-0.5">Will the client provide cleaning supplies?</p>
            </div>
            <Switch checked={clientProvidesSupplies} onCheckedChange={onClientProvidesSuppliesChange} />
          </div>
        </CardContent>
      </Card>

      {/* Group A: service schedule, dust level, property condition */}
      {!groupB && <FormSection
        icon={Clock}
        title="Service Schedule"
        subtitle="Select the service schedule"
      >
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "diurno",   label: "Day Shift" },
              { value: "nocturno", label: "Night Shift" },
            ].map(({ value, label }) => (
              <Button key={value} variant="outline"
                onClick={() => { onServiceScheduleChange(value); onClearError("serviceSchedule"); }}
                className={cn("h-12", serviceSchedule === value && "bg-primary/10 border-primary/20 text-primary", errors.serviceSchedule && !serviceSchedule && "border-destructive")}
              >
                {label}
              </Button>
            ))}
          </div>
          {errors.serviceSchedule && <p className="text-xs text-destructive">Please select a schedule</p>}
</FormSection>}

      {!groupB && <FormSection
        icon={Wind}
        title="Dust Level"
        subtitle="Select the dust level"
      >
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "bajo",  label: "Low" },
              { value: "medio", label: "Medium" },
              { value: "alto",  label: "High" },
            ].map(({ value, label }) => (
              <Button key={value} variant="outline"
                onClick={() => { onDustLevelChange(value); onClearError("dustLevel"); }}
                className={cn("h-12", dustLevel === value && "bg-primary/10 border-primary/20 text-primary", errors.dustLevel && !dustLevel && "border-destructive")}
              >
                {label}
              </Button>
            ))}
          </div>
          {errors.dustLevel && <p className="text-xs text-destructive">Please select a dust level</p>}
</FormSection>}

      {!groupB && <FormSection
        icon={Star}
        title="Property Condition"
        subtitle="Select the current condition of the property"
      >
          <div className="grid grid-cols-1 gap-3">
            {[
              { value: "bien-mantenido", label: "Well Maintained" },
              { value: "sucio",          label: "Dirty" },
              { value: "muy-sucio",      label: "Very Dirty" },
            ].map(({ value, label }) => (
              <Button key={value} variant="outline"
                onClick={() => { onPropertyConditionChange(value); onClearError("propertyCondition"); }}
                className={cn("h-12", propertyCondition === value && "bg-primary/10 border-primary/20 text-primary", errors.propertyCondition && !propertyCondition && "border-destructive")}
              >
                {label}
              </Button>
            ))}
          </div>
          {errors.propertyCondition && <p className="text-xs text-destructive">Please select property condition</p>}
</FormSection>}

      {/* Extra services */}
      <FormSection
        icon={Plus}
        title="Extra Services"
        subtitle="Select additional services (optional)"
      >
          <div className="grid grid-cols-2 gap-3">
            {(groupB ? EXTRA_SERVICE_OPTIONS_GROUP_B : EXTRA_SERVICE_OPTIONS_GROUP_A).map(({ value, label }) => (
              <Button key={value} variant="outline"
                onClick={() => onExtraServiceToggle(value)}
                className={cn("h-12 text-xs justify-start gap-2", extraServices.includes(value) && "bg-primary/10 border-primary/20 text-primary")}
              >
                {label}
              </Button>
            ))}
          </div>
</FormSection>
    </div>
  );
}
