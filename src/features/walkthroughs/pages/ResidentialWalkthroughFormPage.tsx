import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QK } from "@/shared/config/queryKeys";
import {
  ChevronLeft,
  User,
  Home,
  Bed,
  Plus,
  Camera,
  X,
  Mail,
  Phone as PhoneIcon,
  MapPin,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/shared/utils/cn";
import { FloatInput } from "../components/FloatInput";
import { PickerDialog } from "../components/PickerDialog";
import { useUpdateWalkthroughStatus } from "../hooks/useWalkthroughs";
import {
  RESIDENTIAL_PROPERTY_TYPES,
  RESIDENTIAL_SERVICE_TYPES,
  RESIDENTIAL_EXTRA_SERVICES,
} from "../config/walkthroughConfig";
import { fetchContactInfo } from "../utils/walkthroughUtils";

// ─── Component ────────────────────────────────────────────────────────────────

export function ResidentialWalkthroughFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: updateStatus } = useUpdateWalkthroughStatus();

  // ── Fetch walkthrough + contact info ──────────────────────────────────────
  const { data: walkthrough, isLoading } = useQuery({
    queryKey: QK.walkthroughForm(id!),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("walkthroughs")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const contactInfo = await fetchContactInfo(data.walkthrough_type, data.client_id, data.lead_id);
      return { ...data, contactInfo };
    },
    enabled: Boolean(id),
  });

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
  const [photos,         setPhotos]         = useState<string[]>([]);
  const [isSaving,       setIsSaving]       = useState(false);

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [showPropertyTypeDialog, setShowPropertyTypeDialog] = useState(false);
  const [showServiceTypeDialog,  setShowServiceTypeDialog]  = useState(false);
  const [showCancelDialog,       setShowCancelDialog]       = useState(false);
  const [showCompletionDialog,   setShowCompletionDialog]   = useState(false);

  function toggleExtra(service: string) {
    setExtraServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  }

  function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => setPhotos((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  }

  async function handleFinish() {
    if (!id) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsSaving(false); return; }

      const { error: insertErr } = await supabase
        .from("residential_walkthrough_data")
        .insert({
          walkthrough_id:  id,            user_id:         user.id,
          property_type:   propertyType,  service_type:    serviceType,
          square_footage:  squareFootage, bedrooms,        kitchen,
          living_room:     livingRoom,    dining_room:     diningRoom,
          office,          full_bath:     fullBath,        half_bath:  halfBath,
          fans,            oven,          refrigerator,    blinds,
          windows_inside:  windowsInside, windows_outside: windowsOutside,
          extra_services:  extraServices, has_pets:        hasPets,
          notes,           photos,
        });

      if (insertErr) {
        toast.error("Failed to save walkthrough data");
        setIsSaving(false);
        return;
      }

      // useUpdateWalkthroughStatus handles status update + cache invalidation + edge fn invocations
      await updateStatus({ id, status: "Completed" });
      setShowCompletionDialog(true);
    } catch {
      toast.error("An error occurred");
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
    <div className="min-h-screen bg-background">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background">
        <Button variant="ghost" size="icon" type="button" onClick={() => setShowCancelDialog(true)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold">Residential Walkthrough</h1>
          {info && <p className="text-xs text-muted-foreground truncate">{info.full_name}</p>}
        </div>
      </div>

      <div className="space-y-1.5 mt-1.5 pb-24">

        {/* Contact Info */}
        {info && (
          <div className="px-6 py-4 space-y-3 bg-card border-b border-border/50">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              {walkthrough.walkthrough_type === "client" ? "Client Information" : "Lead Information"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Full Name</p>
                <p className="text-sm font-medium">{info.full_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Email</p>
                <p className="text-sm font-medium">{info.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><PhoneIcon className="w-3 h-3" /> Phone</p>
                <p className="text-sm font-medium">{info.phone || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</p>
                <p className="text-sm font-medium">
                  {info.service_street
                    ? `${info.service_street}, ${info.service_city}, ${info.service_state} ${info.service_zip}`
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Property */}
        <Card className="rounded-none border-x-0">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Home className="w-4 h-4" /> Property
            </h2>
            <Button
              variant="outline"
              className="w-full justify-start h-10"
              onClick={() => setShowPropertyTypeDialog(true)}
            >
              {propertyType || "Select Property Type"}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-10"
              onClick={() => setShowServiceTypeDialog(true)}
            >
              {serviceType || "Service Type"}
            </Button>
            <FloatInput id="sqft" label="Enter Square Footage" value={squareFootage} onChange={setSquareFootage} />
          </CardContent>
        </Card>

        {/* Main Data */}
        <Card className="rounded-none border-x-0">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Bed className="w-4 h-4" /> Main Data
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <FloatInput id="bedrooms"   label="Bedrooms"    value={bedrooms}   onChange={setBedrooms} />
              <FloatInput id="kitchen"    label="Kitchen"     value={kitchen}    onChange={setKitchen} />
              <FloatInput id="livingRoom" label="Living Room" value={livingRoom} onChange={setLivingRoom} />
              <FloatInput id="diningRoom" label="Dining Room" value={diningRoom} onChange={setDiningRoom} />
              <FloatInput id="office"     label="Office"      value={office}     onChange={setOffice} />
              <FloatInput id="fullBath"   label="Full Bath"   value={fullBath}   onChange={setFullBath} />
              <FloatInput id="halfBath"   label="Half Bath"   value={halfBath}   onChange={setHalfBath} />
            </div>
          </CardContent>
        </Card>

        {/* Additional */}
        <Card className="rounded-none border-x-0">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Additional
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <FloatInput id="fans"           label="Fans"            value={fans}           onChange={setFans} />
              <FloatInput id="oven"           label="Oven"            value={oven}           onChange={setOven} />
              <FloatInput id="refrigerator"   label="Refrigerator"    value={refrigerator}   onChange={setRefrigerator} />
              <FloatInput id="blinds"         label="Blinds"          value={blinds}         onChange={setBlinds} />
              <FloatInput id="windowsInside"  label="Windows Inside"  value={windowsInside}  onChange={setWindowsInside} />
              <FloatInput id="windowsOutside" label="Windows Outside" value={windowsOutside} onChange={setWindowsOutside} />
            </div>
          </CardContent>
        </Card>

        {/* Extra */}
        <Card className="rounded-none border-x-0">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-base font-semibold">Extra</h2>
            <div className="grid grid-cols-2 gap-3">
              {RESIDENTIAL_EXTRA_SERVICES.map((service) => (
                <Button
                  key={service}
                  variant="outline"
                  className={cn(
                    "h-10 justify-center",
                    extraServices.includes(service) && "bg-accent text-accent-foreground border-accent-foreground/30"
                  )}
                  onClick={() => toggleExtra(service)}
                >
                  {service}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pets */}
        <Card className="rounded-none border-x-0">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-base font-semibold">Pets</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: "yes", label: "Yes, I have pets" },
                { val: "no",  label: "No pets" },
              ].map(({ val, label }) => (
                <Button
                  key={val}
                  variant="outline"
                  className={cn(
                    "h-10 justify-center",
                    hasPets === val && "bg-accent text-accent-foreground border-accent-foreground/30"
                  )}
                  onClick={() => setHasPets(val)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="rounded-none border-x-0">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-base font-semibold">Notes</h2>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes here..."
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        {/* Photos */}
        <Card className="rounded-none border-x-0">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Camera className="w-4 h-4" /> Photos
            </h2>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square">
                    <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card className="rounded-none border-x-0">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-12" onClick={() => setShowCancelDialog(true)}>
                Cancel
              </Button>
              <Button className="h-12" onClick={handleFinish} disabled={isSaving}>
                {isSaving ? "Saving..." : "Finish Walkthrough"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Floating Camera FAB ───────────────────────────────────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePhotoCapture}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="fixed bottom-6 right-6 z-20 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        <Camera className="w-6 h-6" />
      </button>

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

      {/* ── Cancel Confirmation Dialog ────────────────────────────────────── */}
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
              <Button variant="outline" className="flex-1" onClick={() => setShowCancelDialog(false)}>
                Stay
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => navigate("/walkthroughs")}>
                Yes, Cancel
              </Button>
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
            <Button className="w-full" onClick={() => navigate("/walkthroughs")}>
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
