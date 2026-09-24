import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Building2,
  Camera,
  X,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import { toast } from "sonner";
import { cn } from "@/shared/utils/cn";
import { FloatInput } from "../components/FloatInput";
import { PickerDialog } from "../components/PickerDialog";
import { WalkthroughContactCard } from "../components/WalkthroughContactCard";
import {
  useWalkthroughForForm,
  useSubmitCommercialWalkthroughData,
  useUpdateWalkthroughStatus,
} from "../hooks/useWalkthroughs";
import { usePhotoCapture } from "../hooks/usePhotoCapture";
import {
  COMMERCIAL_PROPERTY_TYPES,
  COMMERCIAL_RESTAURANT_TYPES,
  COMMERCIAL_GROUP_A_TYPES,
  COMMERCIAL_SERVICE_SCHEDULE_OPTIONS,
  COMMERCIAL_GREASE_LEVEL_OPTIONS,
  COMMERCIAL_CONDITION_OPTIONS,
  COMMERCIAL_FREQUENCY_OPTIONS,
  COMMERCIAL_EXTRA_GROUP_A,
  COMMERCIAL_EXTRA_GROUP_B,
  WEEK_DAYS,
} from "../config/walkthroughConfig";

export function CommercialWalkthroughFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: walkthrough, isLoading } = useWalkthroughForForm(id);
  const { mutateAsync: submitData }      = useSubmitCommercialWalkthroughData();
  const { mutateAsync: updateStatus }    = useUpdateWalkthroughStatus();
  const { photos, fileInputRef, handlePhotoCapture, removePhoto, openPicker } = usePhotoCapture();

  // ── Form state ────────────────────────────────────────────────────────────
  const [propertyType,           setPropertyType]           = useState("");
  const [propertySize,           setPropertySize]           = useState("");
  const [serviceType,            setServiceType]            = useState("");
  const [serviceSchedule,        setServiceSchedule]        = useState("");
  const [greaseLevel,            setGreaseLevel]            = useState("");
  const [restaurantCondition,    setRestaurantCondition]    = useState("");
  const [extraServices,          setExtraServices]          = useState<string[]>([]);
  const [clientProvidesSupplies, setClientProvidesSupplies] = useState(false);
  const [recurringFrequency,     setRecurringFrequency]     = useState("");
  const [selectedWeekDays,       setSelectedWeekDays]       = useState<string[]>([]);
  const [employeeCount,          setEmployeeCount]          = useState("");
  const [hourlyRate,             setHourlyRate]             = useState("");
  const [cleaningDuration,       setCleaningDuration]       = useState("");
  const [startTime,              setStartTime]              = useState("");
  const [notes,                  setNotes]                  = useState("");
  const [isSaving,               setIsSaving]               = useState(false);
  const [validationErrors,       setValidationErrors]       = useState({
    propertyType: false, serviceSchedule: false, greaseLevel: false,
    restaurantCondition: false, employeeCount: false, hourlyRate: false, cleaningDuration: false,
  });

  // ── Dialog visibility ─────────────────────────────────────────────────────
  const [showPropertyTypeDialog,    setShowPropertyTypeDialog]    = useState(false);
  const [showServiceTypeDialog,     setShowServiceTypeDialog]     = useState(false);
  const [showServiceScheduleDialog, setShowServiceScheduleDialog] = useState(false);
  const [showGreaseLevelDialog,     setShowGreaseLevelDialog]     = useState(false);
  const [showConditionDialog,       setShowConditionDialog]       = useState(false);
  const [showFrequencyDialog,       setShowFrequencyDialog]       = useState(false);
  const [showCancelDialog,          setShowCancelDialog]          = useState(false);
  const [showCompletionDialog,      setShowCompletionDialog]      = useState(false);

  const isRestaurant           = COMMERCIAL_RESTAURANT_TYPES.includes(propertyType);
  const shouldShowGroupAFields = COMMERCIAL_GROUP_A_TYPES.includes(propertyType);

  const frequencyLabel = (v: string) =>
    COMMERCIAL_FREQUENCY_OPTIONS.find((f) => f.value === v)?.label ?? "Select Frequency";

  function toggleExtra(s: string) {
    setExtraServices((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }
  function toggleWeekDay(d: string) {
    setSelectedWeekDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }

  async function handleFinish() {
    const errors = {
      propertyType:        !propertyType,
      serviceSchedule:     isRestaurant && !serviceSchedule,
      greaseLevel:         isRestaurant && !greaseLevel,
      restaurantCondition: isRestaurant && !restaurantCondition,
      employeeCount:       !employeeCount,
      hourlyRate:          !hourlyRate,
      cleaningDuration:    !cleaningDuration,
    };
    setValidationErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    if (!id) return;

    setIsSaving(true);
    try {
      await submitData({
        walkthroughId: id,
        data: {
          property_type: propertyType,           property_size:            propertySize,
          service_type:  serviceType,            service_schedule:         serviceSchedule,
          grease_level:  greaseLevel,            restaurant_condition:     restaurantCondition,
          extra_services: extraServices,         recurring_frequency:      recurringFrequency,
          selected_week_days: selectedWeekDays,  employee_count:           employeeCount,
          hourly_rate:   hourlyRate,             cleaning_duration:        cleaningDuration,
          start_time:    startTime,              client_provides_supplies: clientProvidesSupplies,
          notes,         photos,
        },
      });
      await updateStatus({ id, status: "Completed" });
      setShowCompletionDialog(true);
    } catch {
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Loading / not found ───────────────────────────────────────────────────
  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div>;
  }
  if (!walkthrough) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Walkthrough not found</p></div>;
  }

  const info = walkthrough.contactInfo;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <FullScreenModal open onClose={() => setShowCancelDialog(true)}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="border-b flex-shrink-0 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="w-1/3" />
            <div className="w-1/3 text-center">
              <h1 className="font-semibold text-base leading-tight">Commercial Walkthrough</h1>
              {info && <p className="text-xs text-muted-foreground truncate">{info.full_name}</p>}
            </div>
            <div className="flex items-center w-1/3 justify-end">
              <Button variant="ghost" size="icon" className="h-8 w-8" type="button" onClick={() => setShowCancelDialog(true)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-2xl mx-auto px-4 space-y-4 py-6">

          {info && (
            <WalkthroughContactCard
              info={info}
              walkthroughType={walkthrough.walkthrough_type}
            />
          )}

          {/* Property */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Property
              </h2>
              <p className="text-sm text-muted-foreground">Select property details and service type</p>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className={cn("w-full justify-start h-10", validationErrors.propertyType && "border-destructive")}
                  onClick={() => setShowPropertyTypeDialog(true)}
                >
                  {propertyType || "Select Property Type"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-10"
                  onClick={() => setShowServiceTypeDialog(true)}
                >
                  {serviceType === "one-time" ? "One-time" : serviceType === "recurring" ? "Recurring" : "Service Type"}
                </Button>
                <FloatInput id="propertySize" label="Property Size (sq ft)" value={propertySize} onChange={setPropertySize} />
              </div>
            </CardContent>
          </Card>

          {/* Restaurant / Food-Truck specific */}
          {isRestaurant && (
            <>
              <Card>
                <CardContent className="p-5 space-y-3">
                  <h2 className="text-base font-semibold">Service Schedule</h2>
                  <p className="text-sm text-muted-foreground">Choose when the service will be performed</p>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start h-10", validationErrors.serviceSchedule && "border-destructive")}
                    onClick={() => setShowServiceScheduleDialog(true)}
                  >
                    {serviceSchedule || "Select Schedule"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 space-y-3">
                  <h2 className="text-base font-semibold">Grease Level</h2>
                  <p className="text-sm text-muted-foreground">Indicate the current grease accumulation level</p>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start h-10", validationErrors.greaseLevel && "border-destructive")}
                    onClick={() => setShowGreaseLevelDialog(true)}
                  >
                    {greaseLevel || "Select Level"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 space-y-3">
                  <h2 className="text-base font-semibold">Restaurant Condition</h2>
                  <p className="text-sm text-muted-foreground">Rate the overall cleanliness of the property</p>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start h-10", validationErrors.restaurantCondition && "border-destructive")}
                    onClick={() => setShowConditionDialog(true)}
                  >
                    {restaurantCondition || "Select Condition"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 space-y-4">
                  <h2 className="text-base font-semibold">Extra Services</h2>
                  <p className="text-sm text-muted-foreground">Select additional services (optional)</p>
                  <div className="grid grid-cols-2 gap-3">
                    {COMMERCIAL_EXTRA_GROUP_B.map((s) => (
                      <Button key={s} variant="outline"
                        className={cn("h-10", extraServices.includes(s) && "bg-accent text-accent-foreground border-accent-foreground/30")}
                        onClick={() => toggleExtra(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Recurring frequency (non-restaurant only) */}
          {serviceType === "recurring" && !isRestaurant && (
            <>
              <Card>
                <CardContent className="p-5 space-y-3">
                  <h2 className="text-base font-semibold">Recurring Frequency</h2>
                  <Button variant="outline" className="w-full justify-start h-10" onClick={() => setShowFrequencyDialog(true)}>
                    {frequencyLabel(recurringFrequency)}
                  </Button>
                </CardContent>
              </Card>

              {recurringFrequency === "multiple-per-week" && (
                <Card>
                  <CardContent className="p-5 space-y-3">
                    <h2 className="text-base font-semibold">Select Days</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {WEEK_DAYS.map((day) => (
                        <Button key={day} variant="outline"
                          className={cn("h-10", selectedWeekDays.includes(day) && "bg-accent text-accent-foreground border-accent-foreground/30")}
                          onClick={() => toggleWeekDay(day)}
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Group A specific */}
          {shouldShowGroupAFields && (
            <>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Client Provides Supplies</p>
                      <p className="text-xs text-muted-foreground">Will the client provide cleaning supplies?</p>
                    </div>
                    <Switch checked={clientProvidesSupplies} onCheckedChange={setClientProvidesSupplies} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 space-y-3">
                  <h2 className="text-base font-semibold">Service Schedule</h2>
                  <p className="text-sm text-muted-foreground">Choose when the service will be performed</p>
                  <Button variant="outline" className="w-full justify-start h-10" onClick={() => setShowServiceScheduleDialog(true)}>
                    {serviceSchedule || "Select Schedule"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 space-y-3">
                  <h2 className="text-base font-semibold">Dust Level</h2>
                  <p className="text-sm text-muted-foreground">Indicate the current dust accumulation level</p>
                  <Button variant="outline" className="w-full justify-start h-10" onClick={() => setShowGreaseLevelDialog(true)}>
                    {greaseLevel || "Select Level"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 space-y-3">
                  <h2 className="text-base font-semibold">Property Condition</h2>
                  <p className="text-sm text-muted-foreground">Rate the overall cleanliness of the property</p>
                  <Button variant="outline" className="w-full justify-start h-10" onClick={() => setShowConditionDialog(true)}>
                    {restaurantCondition || "Select Condition"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 space-y-4">
                  <h2 className="text-base font-semibold">Extra Services</h2>
                  <p className="text-sm text-muted-foreground">Select additional services (optional)</p>
                  <div className="grid grid-cols-2 gap-3">
                    {COMMERCIAL_EXTRA_GROUP_A.map((s) => (
                      <Button key={s} variant="outline"
                        className={cn("h-10", extraServices.includes(s) && "bg-accent text-accent-foreground border-accent-foreground/30")}
                        onClick={() => toggleExtra(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Main service detail fields */}
          {serviceType && (
            <>
              <Card>
                <CardContent className="p-5 space-y-3">
                  <h2 className="text-base font-semibold">Employee Count</h2>
                  <p className="text-sm text-muted-foreground">Number of employees needed for this service</p>
                  <FloatInput id="empCount" label="Number of employees" value={employeeCount}
                    onChange={(v) => { setEmployeeCount(v); setValidationErrors((p) => ({ ...p, employeeCount: false })); }}
                    hasError={validationErrors.employeeCount}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 space-y-3">
                  <h2 className="text-base font-semibold">Hourly Rate</h2>
                  <p className="text-sm text-muted-foreground">Cost per employee per hour</p>
                  <FloatInput id="hrRate" label="Enter hourly rate ($)" value={hourlyRate} inputType="decimal"
                    onChange={(v) => { setHourlyRate(v); setValidationErrors((p) => ({ ...p, hourlyRate: false })); }}
                    hasError={validationErrors.hourlyRate}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 space-y-3">
                  <h2 className="text-base font-semibold">Cleaning Duration</h2>
                  <p className="text-sm text-muted-foreground">Estimated time needed to complete the service</p>
                  <FloatInput id="cleanDur" label="Duration (hours)" value={cleaningDuration} inputType="decimal"
                    onChange={(v) => { setCleaningDuration(v); setValidationErrors((p) => ({ ...p, cleaningDuration: false })); }}
                    hasError={validationErrors.cleaningDuration}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 space-y-3">
                  <h2 className="text-base font-semibold">Start Time</h2>
                  <p className="text-sm text-muted-foreground">When will the service begin?</p>
                  <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-10" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 space-y-3">
                  <h2 className="text-base font-semibold">Notes</h2>
                  <p className="text-sm text-muted-foreground">Add any additional information or special instructions</p>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes..." className="min-h-[100px]" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 space-y-4">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Camera className="w-4 h-4" /> Photos
                  </h2>
                  <p className="text-sm text-muted-foreground">Capture images of the property for reference</p>
                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative aspect-square">
                          <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                          <button type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" className="w-full h-10 gap-2" type="button" onClick={openPicker}>
                    <Camera className="w-4 h-4" /> Add Photos
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoCapture} />
                </CardContent>
              </Card>
            </>
          )}

          {/* Footer */}
          <div className="bg-white rounded-lg border p-4 flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" type="button" onClick={() => setShowCancelDialog(true)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleFinish} disabled={isSaving}>
              {isSaving ? "Saving..." : "Finish Walkthrough"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Picker Dialogs ────────────────────────────────────────────────── */}
      <PickerDialog
        open={showPropertyTypeDialog} onOpenChange={setShowPropertyTypeDialog}
        title="Select Property Type" subtitle="Choose the type of commercial property"
        options={COMMERCIAL_PROPERTY_TYPES} onSelect={setPropertyType} icon={Building2}
      />
      <PickerDialog
        open={showServiceTypeDialog} onOpenChange={setShowServiceTypeDialog}
        title="Select Service Type" subtitle="Choose the type of service"
        options={["One-time", "Recurring"]}
        onSelect={(v) => setServiceType(v.toLowerCase() === "one-time" ? "one-time" : "recurring")}
      />
      <PickerDialog
        open={showServiceScheduleDialog} onOpenChange={setShowServiceScheduleDialog}
        title="Service Schedule" subtitle="Choose when the service will be performed"
        options={COMMERCIAL_SERVICE_SCHEDULE_OPTIONS} onSelect={setServiceSchedule}
      />
      <PickerDialog
        open={showGreaseLevelDialog} onOpenChange={setShowGreaseLevelDialog}
        title={isRestaurant ? "Grease Level" : "Dust Level"}
        subtitle={isRestaurant ? "Indicate the current grease accumulation level" : "Indicate the current dust accumulation level"}
        options={COMMERCIAL_GREASE_LEVEL_OPTIONS} onSelect={setGreaseLevel}
      />
      <PickerDialog
        open={showConditionDialog} onOpenChange={setShowConditionDialog}
        title={isRestaurant ? "Restaurant Condition" : "Property Condition"}
        subtitle="Rate the overall cleanliness of the property"
        options={COMMERCIAL_CONDITION_OPTIONS} onSelect={setRestaurantCondition}
      />
      <PickerDialog
        open={showFrequencyDialog} onOpenChange={setShowFrequencyDialog}
        title="Recurring Frequency"
        options={COMMERCIAL_FREQUENCY_OPTIONS.map((f) => f.label)}
        onSelect={(label) => setRecurringFrequency(COMMERCIAL_FREQUENCY_OPTIONS.find((f) => f.label === label)?.value ?? "")}
      />

      {/* ── Cancel Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <DialogTitle>Cancel Walkthrough</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-6">
            <p className="text-sm text-muted-foreground mb-6">
              If you leave now, all the data you've entered will not be saved. Are you sure you want to cancel?
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCancelDialog(false)}>Stay</Button>
              <Button variant="destructive" className="flex-1" onClick={() => navigate("/walkthroughs")}>Yes, Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Completion Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent className="max-w-md p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <DialogTitle>Congratulations!</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-6">
            <p className="text-sm text-muted-foreground mb-6">
              You have successfully completed the walkthrough. The status has been updated to completed.
            </p>
            <Button className="w-full" onClick={() => navigate("/walkthroughs")}>Continue</Button>
          </div>
        </DialogContent>
      </Dialog>

    </FullScreenModal>
  );
}
