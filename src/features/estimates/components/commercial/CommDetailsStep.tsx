/**
 * @module CommDetailsStep — Step 2 (Commercial)
 * Group B (restaurant/food-truck): service schedule + grease level + restaurant condition + supplies + extras.
 * Group A (all others): supplies + service schedule + dust level + property condition + extras.
 */
import { Clock, Flame, Star, Wind, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "@/shared/utils/cn";

const EXTRA_SERVICE_OPTIONS = [
  { value: "hoods",         label: "Hoods" },
  { value: "windows",       label: "Windows" },
  { value: "refrigerators", label: "Refrigerators" },
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
      {groupB && <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Service Schedule
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Select the service schedule</p>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>}

      {groupB && <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Flame className="h-5 w-5 text-muted-foreground" />
            Grease Level
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Select the grease level</p>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>}

      {groupB && <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 text-muted-foreground" />
            Restaurant Condition
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Select the restaurant condition</p>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>}

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
      {!groupB && <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Service Schedule
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Select the service schedule</p>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>}

      {!groupB && <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wind className="h-5 w-5 text-muted-foreground" />
            Dust Level
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Select the dust level</p>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>}

      {!groupB && <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 text-muted-foreground" />
            Property Condition
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Select the current condition of the property</p>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>}

      {/* Extra services */}
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Plus className="h-5 w-5 text-muted-foreground" />
            Extra Services
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Select additional services (optional)</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {EXTRA_SERVICE_OPTIONS.map(({ value, label }) => (
              <Button key={value} variant="outline"
                onClick={() => onExtraServiceToggle(value)}
                className={cn("h-12 text-xs justify-start gap-2", extraServices.includes(value) && "bg-primary/10 border-primary/20 text-primary")}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
