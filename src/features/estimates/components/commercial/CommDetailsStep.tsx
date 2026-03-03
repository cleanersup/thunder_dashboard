/**
 * @module CommDetailsStep — Step 2 (Commercial, Group B only: restaurant/food-truck)
 * Service schedule + grease level + property condition + client provides supplies + extra services.
 */
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "@/shared/utils/cn";

const EXTRA_SERVICE_OPTIONS = [
  { value: "hoods",         label: "Hoods" },
  { value: "windows",       label: "Windows" },
  { value: "refrigerators", label: "Refrigerators" },
];

export interface CommDetailsStepProps {
  serviceSchedule:        string;
  greaseLevel:            string;
  restaurantCondition:    string;
  clientProvidesSupplies: boolean;
  extraServices:          string[];
  errors:                 Record<string, boolean>;
  onServiceScheduleChange:        (v: string) => void;
  onGreaseLevelChange:            (v: string) => void;
  onRestaurantConditionChange:    (v: string) => void;
  onClientProvidesSuppliesChange: (v: boolean) => void;
  onExtraServiceToggle:           (v: string) => void;
  onClearError:                   (key: string) => void;
}

export function CommDetailsStep({
  serviceSchedule, greaseLevel, restaurantCondition, clientProvidesSupplies, extraServices, errors,
  onServiceScheduleChange, onGreaseLevelChange, onRestaurantConditionChange,
  onClientProvidesSuppliesChange, onExtraServiceToggle, onClearError,
}: CommDetailsStepProps) {
  return (
    <div className="space-y-[5px]">

      {/* Service schedule */}
      <Card className="rounded-none border-0">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Service Schedule</h2>
            <p className="text-sm text-muted-foreground mt-1">Select the service schedule</p>
          </div>
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
      </Card>

      {/* Grease level */}
      <Card className="rounded-none border-0">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Grease Level</h2>
            <p className="text-sm text-muted-foreground mt-1">Select the grease level</p>
          </div>
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
      </Card>

      {/* Restaurant condition */}
      <Card className="rounded-none border-0">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Restaurant Condition</h2>
            <p className="text-sm text-muted-foreground mt-1">Select the restaurant condition</p>
          </div>
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
      </Card>

      {/* Client provides supplies */}
      <Card className="rounded-none border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Client Provides Supplies</p>
              <p className="text-xs text-muted-foreground mt-0.5">Will the client provide cleaning supplies?</p>
            </div>
            <Switch checked={clientProvidesSupplies} onCheckedChange={onClientProvidesSuppliesChange} />
          </div>
        </CardContent>
      </Card>

      {/* Extra services */}
      <Card className="rounded-none border-0">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Extra Services</h2>
            <p className="text-sm text-muted-foreground mt-1">Select additional services (optional)</p>
          </div>
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
