import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Building2, Camera, X, CalendarClock, CalendarDays, Droplets, Sparkles,
  Package, Repeat, Users, DollarSign, Clock, FileText, SprayCan,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
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
import { FORM_CONTROL_ERROR } from "@/shared/constants/formTokens";
import {
  FormSection, FloatingInput, TextareaField, TimeField, OptionGrid,
} from "@/shared/components/forms";
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
          <FormSection icon={Building2} title="Property" subtitle="Select property details and service type">
              <div className="space-y-3">
                <Button
                  variant="field"
                  className={cn("w-full justify-start", validationErrors.propertyType && FORM_CONTROL_ERROR)}
                  onClick={() => setShowPropertyTypeDialog(true)}
                >
                  {propertyType || "Select Property Type"}
                </Button>
                <Button
                  variant="field"
                  className="w-full justify-start"
                  onClick={() => setShowServiceTypeDialog(true)}
                >
                  {serviceType === "one-time" ? "One-time" : serviceType === "recurring" ? "Recurring" : "Service Type"}
                </Button>
                <FloatingInput type="integer" id="propertySize" label="Property Size (sq ft)" value={propertySize} onChange={setPropertySize} />
              </div>
          </FormSection>

          {/* Restaurant / Food-Truck specific */}
          {isRestaurant && (
            <>
              <FormSection icon={CalendarClock} title="Service Schedule" subtitle="Choose when the service will be performed">
                  <Button
                    variant="field"
                    className={cn("w-full justify-start", validationErrors.serviceSchedule && FORM_CONTROL_ERROR)}
                    onClick={() => setShowServiceScheduleDialog(true)}
                  >
                    {serviceSchedule || "Select Schedule"}
                  </Button>
              </FormSection>

              <FormSection icon={Droplets} title="Grease Level" subtitle="Indicate the current grease accumulation level">
                  <Button
                    variant="field"
                    className={cn("w-full justify-start", validationErrors.greaseLevel && FORM_CONTROL_ERROR)}
                    onClick={() => setShowGreaseLevelDialog(true)}
                  >
                    {greaseLevel || "Select Level"}
                  </Button>
              </FormSection>

              <FormSection icon={Sparkles} title="Restaurant Condition" subtitle="Rate the overall cleanliness of the property">
                  <Button
                    variant="field"
                    className={cn("w-full justify-start", validationErrors.restaurantCondition && FORM_CONTROL_ERROR)}
                    onClick={() => setShowConditionDialog(true)}
                  >
                    {restaurantCondition || "Select Condition"}
                  </Button>
              </FormSection>

              <FormSection icon={Package} title="Extra Services" subtitle="Select additional services (optional)">
                  <OptionGrid multiple options={COMMERCIAL_EXTRA_GROUP_B} value={extraServices} onChange={setExtraServices} />
              </FormSection>
            </>
          )}

          {/* Recurring frequency (non-restaurant only) */}
          {serviceType === "recurring" && !isRestaurant && (
            <>
              <FormSection icon={Repeat} title="Recurring Frequency">
                  <Button variant="field" className="w-full justify-start" onClick={() => setShowFrequencyDialog(true)}>
                    {frequencyLabel(recurringFrequency)}
                  </Button>
              </FormSection>

              {recurringFrequency === "multiple-per-week" && (
                <FormSection icon={CalendarDays} title="Select Days">
                    <OptionGrid multiple options={WEEK_DAYS} value={selectedWeekDays} onChange={setSelectedWeekDays} />
                </FormSection>
              )}
            </>
          )}

          {/* Group A specific */}
          {shouldShowGroupAFields && (
            <>
              <FormSection
                icon={SprayCan}
                title="Client Provides Supplies"
                subtitle="Will the client provide cleaning supplies?"
                action={<Switch checked={clientProvidesSupplies} onCheckedChange={setClientProvidesSupplies} />}
              >
                <></>
              </FormSection>

              <FormSection icon={CalendarClock} title="Service Schedule" subtitle="Choose when the service will be performed">
                  <Button variant="field" className="w-full justify-start" onClick={() => setShowServiceScheduleDialog(true)}>
                    {serviceSchedule || "Select Schedule"}
                  </Button>
              </FormSection>

              <FormSection icon={Droplets} title="Dust Level" subtitle="Indicate the current dust accumulation level">
                  <Button variant="field" className="w-full justify-start" onClick={() => setShowGreaseLevelDialog(true)}>
                    {greaseLevel || "Select Level"}
                  </Button>
              </FormSection>

              <FormSection icon={Sparkles} title="Property Condition" subtitle="Rate the overall cleanliness of the property">
                  <Button variant="field" className="w-full justify-start" onClick={() => setShowConditionDialog(true)}>
                    {restaurantCondition || "Select Condition"}
                  </Button>
              </FormSection>

              <FormSection icon={Package} title="Extra Services" subtitle="Select additional services (optional)">
                  <OptionGrid multiple options={COMMERCIAL_EXTRA_GROUP_A} value={extraServices} onChange={setExtraServices} />
              </FormSection>
            </>
          )}

          {/* Main service detail fields */}
          {serviceType && (
            <>
              <FormSection icon={Users} title="Employee Count" subtitle="Number of employees needed for this service">
                  <FloatingInput type="integer" id="empCount" label="Number of employees" value={employeeCount}
                    onChange={(v) => { setEmployeeCount(v); setValidationErrors((p) => ({ ...p, employeeCount: false })); }}
                    error={validationErrors.employeeCount}
                  />
              </FormSection>

              <FormSection icon={DollarSign} title="Hourly Rate" subtitle="Cost per employee per hour">
                  <FloatingInput id="hrRate" label="Enter hourly rate ($)" value={hourlyRate} type="decimal"
                    onChange={(v) => { setHourlyRate(v); setValidationErrors((p) => ({ ...p, hourlyRate: false })); }}
                    error={validationErrors.hourlyRate}
                  />
              </FormSection>

              <FormSection icon={Clock} title="Cleaning Duration" subtitle="Estimated time needed to complete the service">
                  <FloatingInput id="cleanDur" label="Duration (hours)" value={cleaningDuration} type="decimal"
                    onChange={(v) => { setCleaningDuration(v); setValidationErrors((p) => ({ ...p, cleaningDuration: false })); }}
                    error={validationErrors.cleaningDuration}
                  />
              </FormSection>

              <FormSection icon={Clock} title="Start Time" subtitle="When will the service begin?">
                  <TimeField id="startTime" label="Start Time" value={startTime} onChange={setStartTime} />
              </FormSection>

              <FormSection icon={FileText} title="Notes" subtitle="Add any additional information or special instructions">
                  <TextareaField id="walkthrough-notes" placeholder="Add any additional notes..."
                    value={notes} onChange={setNotes} />
              </FormSection>

              <FormSection icon={Camera} title="Photos" subtitle="Capture images of the property for reference">
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
              </FormSection>
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
