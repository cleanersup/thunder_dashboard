import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Home, Bed, Plus, Camera, X, Package, PawPrint, FileText,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import { toast } from "sonner";
import {
  FormSection, FloatingInput, TextareaField, OptionGrid,
} from "@/shared/components/forms";

/** Sí/no de mascotas — el valor que guarda la columna, no la etiqueta. */
const PETS_OPTIONS = [
  { value: "yes", label: "Yes, I have pets" },
  { value: "no",  label: "No pets" },
];
import { PickerDialog } from "../components/PickerDialog";
import { WalkthroughContactCard } from "../components/WalkthroughContactCard";
import {
  useWalkthroughForForm,
  useSubmitResidentialWalkthroughData,
  useUpdateWalkthroughStatus,
} from "../hooks/useWalkthroughs";
import { usePhotoCapture } from "../hooks/usePhotoCapture";
import {
  RESIDENTIAL_PROPERTY_TYPES,
  RESIDENTIAL_SERVICE_TYPES,
  RESIDENTIAL_EXTRA_SERVICES,
} from "../config/walkthroughConfig";

export function ResidentialWalkthroughFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: walkthrough, isLoading } = useWalkthroughForForm(id);
  const { mutateAsync: submitData }      = useSubmitResidentialWalkthroughData();
  const { mutateAsync: updateStatus }    = useUpdateWalkthroughStatus();
  const { photos, fileInputRef, handlePhotoCapture, removePhoto, openPicker } = usePhotoCapture();

  // ── Form state ────────────────────────────────────────────────────────────
  const [propertyType,   setPropertyType]   = useState("");
  const [serviceType,    setServiceType]    = useState("");
  const [squareFootage,  setSquareFootage]  = useState("");
  const [bedrooms,       setBedrooms]       = useState("");
  const [kitchen,        setKitchen]        = useState("");
  const [livingRoom,     setLivingRoom]     = useState("");
  const [diningRoom,     setDiningRoom]     = useState("");
  const [office,         setOffice]         = useState("");
  const [fullBath,       setFullBath]       = useState("");
  const [halfBath,       setHalfBath]       = useState("");
  const [fans,           setFans]           = useState("");
  const [oven,           setOven]           = useState("");
  const [refrigerator,   setRefrigerator]   = useState("");
  const [blinds,         setBlinds]         = useState("");
  const [windowsInside,  setWindowsInside]  = useState("");
  const [windowsOutside, setWindowsOutside] = useState("");
  const [extraServices,  setExtraServices]  = useState<string[]>([]);
  const [hasPets,        setHasPets]        = useState("");
  const [notes,          setNotes]          = useState("");
  const [isSaving,       setIsSaving]       = useState(false);

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [showPropertyTypeDialog, setShowPropertyTypeDialog] = useState(false);
  const [showServiceTypeDialog,  setShowServiceTypeDialog]  = useState(false);
  const [showCancelDialog,       setShowCancelDialog]       = useState(false);
  const [showCompletionDialog,   setShowCompletionDialog]   = useState(false);

  async function handleFinish() {
    if (!id) return;
    setIsSaving(true);
    try {
      await submitData({
        walkthroughId: id,
        data: {
          property_type: propertyType,  service_type:    serviceType,
          square_footage: squareFootage, bedrooms,        kitchen,
          living_room: livingRoom,       dining_room:     diningRoom,
          office,        full_bath:      fullBath,        half_bath:  halfBath,
          fans,          oven,           refrigerator,    blinds,
          windows_inside: windowsInside, windows_outside: windowsOutside,
          extra_services: extraServices, has_pets:        hasPets,
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
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!walkthrough) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Walkthrough not found</p>
      </div>
    );
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
              <h1 className="font-semibold text-base leading-tight">Residential Walkthrough</h1>
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
          <FormSection icon={Home} title="Property" subtitle="Type of property and how big it is">
              <Button variant="field" className="w-full justify-start" onClick={() => setShowPropertyTypeDialog(true)}>
                {propertyType || "Select Property Type"}
              </Button>
              <Button variant="field" className="w-full justify-start" onClick={() => setShowServiceTypeDialog(true)}>
                {serviceType || "Service Type"}
              </Button>
              <FloatingInput type="integer" id="sqft" label="Enter Square Footage" value={squareFootage} onChange={setSquareFootage} />
          </FormSection>

          {/* Main Data */}
          <FormSection icon={Bed} title="Main Data" subtitle="Rooms included in the service">
              <div className="grid grid-cols-2 gap-3">
                <FloatingInput type="integer" id="bedrooms"   label="Bedrooms"    value={bedrooms}   onChange={setBedrooms} />
                <FloatingInput type="integer" id="kitchen"    label="Kitchen"     value={kitchen}    onChange={setKitchen} />
                <FloatingInput type="integer" id="livingRoom" label="Living Room" value={livingRoom} onChange={setLivingRoom} />
                <FloatingInput type="integer" id="diningRoom" label="Dining Room" value={diningRoom} onChange={setDiningRoom} />
                <FloatingInput type="integer" id="office"     label="Office"      value={office}     onChange={setOffice} />
                <FloatingInput type="integer" id="fullBath"   label="Full Bath"   value={fullBath}   onChange={setFullBath} />
                <FloatingInput type="integer" id="halfBath"   label="Half Bath"   value={halfBath}   onChange={setHalfBath} />
              </div>
          </FormSection>

          {/* Additional */}
          <FormSection icon={Plus} title="Additional" subtitle="Items priced per unit">
              <div className="grid grid-cols-2 gap-3">
                <FloatingInput type="integer" id="fans"           label="Fans"            value={fans}           onChange={setFans} />
                <FloatingInput type="integer" id="oven"           label="Oven"            value={oven}           onChange={setOven} />
                <FloatingInput type="integer" id="refrigerator"   label="Refrigerator"    value={refrigerator}   onChange={setRefrigerator} />
                <FloatingInput type="integer" id="blinds"         label="Blinds"          value={blinds}         onChange={setBlinds} />
                <FloatingInput type="integer" id="windowsInside"  label="Windows Inside"  value={windowsInside}  onChange={setWindowsInside} />
                <FloatingInput type="integer" id="windowsOutside" label="Windows Outside" value={windowsOutside} onChange={setWindowsOutside} />
              </div>
          </FormSection>

          {/* Extra */}
          <FormSection icon={Package} title="Extra" subtitle="Areas that add labor to the service">
              <OptionGrid
                multiple
                options={RESIDENTIAL_EXTRA_SERVICES}
                value={extraServices}
                onChange={setExtraServices}
              />
          </FormSection>

          {/* Pets */}
          <FormSection icon={PawPrint} title="Pets" subtitle="Whether there are animals at the property">
              <OptionGrid options={PETS_OPTIONS} value={hasPets} onChange={setHasPets} />
          </FormSection>

          {/* Notes */}
          <FormSection icon={FileText} title="Notes" subtitle="Anything worth recording from the visit">
              <TextareaField
                id="walkthrough-notes"
                placeholder="Add your notes here..."
                value={notes}
                onChange={setNotes}
              />
          </FormSection>

          {/* Photos */}
          <FormSection icon={Camera} title="Photos" subtitle="Capture images of the property for reference">
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square">
                      <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
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
        title="Select Property Type" subtitle="Choose the type of property"
        options={RESIDENTIAL_PROPERTY_TYPES} onSelect={setPropertyType} icon={Home}
      />
      <PickerDialog
        open={showServiceTypeDialog} onOpenChange={setShowServiceTypeDialog}
        title="Select Service Type" subtitle="Choose the type of service"
        options={RESIDENTIAL_SERVICE_TYPES} onSelect={setServiceType} icon={Bed}
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
