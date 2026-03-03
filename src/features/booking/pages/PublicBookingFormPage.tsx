import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, CalendarIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Calendar } from "@/shared/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { usePublicProfile, usePublicBookingForms } from "../hooks/useBookings";
import { submitPublicBooking } from "../services/bookingService";
import { toast } from "sonner";
import { cn } from "@/shared/utils/cn";
import { toIntegerString } from "@/shared/utils/numericInput";
import { format } from "date-fns";
import type { CustomQuestion } from "../types/booking.types";

const ADDITIONAL_SERVICES = [
  "Kitchen", "Oven", "Refrigerator", "Living Room", "Dining Room",
  "Patio", "Garage", "Pets", "Laundry", "Windows",
];

const COMMERCIAL_TYPES = [
  "School", "Church", "Office", "Warehouse", "Restaurant", "Other",
];

/** Floating label input for the public form. */
function FloatingInput({
  id, label, type = "text", value, onChange,
}: {
  id: string; label: string; type?: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={type}
        placeholder=" "
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-md border border-border focus-visible:ring-0 focus-visible:border-primary px-3 bg-white peer"
      />
      <Label
        htmlFor={id}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground bg-white px-1 transition-all pointer-events-none peer-focus:top-0 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary"
      >
        {label}
      </Label>
    </div>
  );
}

/**
 * Public booking form page — accessible without authentication.
 * Route: /booking/:userId
 */
export function PublicBookingFormPage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: profile, isLoading: profileLoading } = usePublicProfile(userId);
  const { data: formData = [] }                       = usePublicBookingForms(userId);

  // ─── Form state ──────────────────────────────────────────────────────────
  const [fullName, setFullName]     = useState("");
  const [email, setEmail]           = useState("");
  const [phone, setPhone]           = useState("");
  const [street, setStreet]         = useState("");
  const [apt, setApt]               = useState("");
  const [city, setCity]             = useState("");
  const [state, setState]           = useState("");
  const [zip, setZip]               = useState("");
  const [serviceType, setServiceType]             = useState("");
  const [selectedDate, setSelectedDate]           = useState<Date | undefined>(undefined);
  const [timePreference, setTimePreference]       = useState("");
  const [bedrooms, setBedrooms]                   = useState("");
  const [bathrooms, setBathrooms]                 = useState("");
  const [additionalServices, setAdditionalServices] = useState<string[]>([]);
  const [commercialType, setCommercialType]       = useState("");
  const [otherCommercialType, setOtherCommercialType] = useState("");
  const [serviceDetails, setServiceDetails]       = useState("");
  const [customAnswers, setCustomAnswers]         = useState<Record<string, string>>({});
  const [submitted, setSubmitted]                 = useState(false);

  // ─── Custom questions from form config ───────────────────────────────────
  const customQuestions: CustomQuestion[] = formData.flatMap((f) =>
    Array.isArray(f.custom_questions)
      ? (f.custom_questions as unknown as CustomQuestion[]).filter((q) => q.formType === serviceType)
      : []
  );

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => {
      if (!fullName || !email || !phone || !street || !city || !state || !zip || !serviceType) {
        throw new Error("Please fill in all required fields.");
      }
      return submitPublicBooking(userId!, {
        lead_name:                fullName,
        email,
        phone:                    phone.replace(/\D/g, ""),
        street,
        apt_suite:                apt || null,
        city,
        state,
        zip_code:                 zip,
        service_type:             serviceType,
        preferred_date:           selectedDate ? format(selectedDate, "yyyy-MM-dd") : null,
        time_preference:          timePreference || null,
        bedrooms:                 bedrooms ? Number(bedrooms) : null,
        bathrooms:                bathrooms ? Number(bathrooms) : null,
        additional_services:      additionalServices.length > 0 ? additionalServices : null,
        commercial_property_type: commercialType || null,
        other_commercial_type:    otherCommercialType || null,
        service_details:          serviceDetails || null,
        custom_answers:           Object.keys(customAnswers).length > 0 ? customAnswers : null,
      });
    },
    onSuccess: () => setSubmitted(true),
    onError:   (err: Error) => toast.error(err.message ?? "Failed to submit booking"),
  });

  const toggleAdditionalService = (s: string) =>
    setAdditionalServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  // ─── Loading / error / success states ────────────────────────────────────
  if (profileLoading) return <LoadingSpinner fullScreen />;

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Booking page not found.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <CheckCircle2 className="h-16 w-16 text-success" />
        <h1 className="text-2xl font-bold text-center">Request Received!</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          Thank you for your booking request. {profile.company_name ?? "We"} will contact you shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-sidebar text-white py-6 px-4 text-center">
        {profile.company_logo && (
          <img src={profile.company_logo} alt={profile.company_name ?? ""} className="h-12 mx-auto mb-3 object-contain" />
        )}
        <h1 className="text-xl font-bold">{profile.company_name ?? "Book a Service"}</h1>
        <p className="text-white/70 text-sm mt-1">Fill out the form below to request a service</p>
      </div>

      <div className="max-w-lg mx-auto space-y-[5px] pt-[5px]">

        {/* ── Personal Information ─────────────────────────────────────── */}
        <Card className="rounded-none border-x-0">
          <CardContent className="p-4 space-y-6">
            <h3 className="text-base font-semibold">Personal Information</h3>
            <div className="space-y-6">
              <FloatingInput id="fullName" label="Full Name *" value={fullName} onChange={setFullName} />
              <FloatingInput id="email"    label="Email *"     value={email}    onChange={setEmail}    type="email" />
              <FloatingInput id="phone"    label="Phone *"     value={phone}    onChange={setPhone} />
            </div>
          </CardContent>
        </Card>

        {/* ── Address ─────────────────────────────────────────────────── */}
        <Card className="rounded-none border-x-0">
          <CardContent className="p-4 space-y-6">
            <h3 className="text-base font-semibold">Address</h3>
            <div className="space-y-6">
              <FloatingInput id="street" label="Street *"   value={street} onChange={setStreet} />
              <div className="grid grid-cols-2 gap-3">
                <FloatingInput id="apt"  label="Apt/Suite" value={apt}  onChange={setApt} />
                <FloatingInput id="city" label="City *"    value={city} onChange={setCity} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FloatingInput id="state" label="State *"    value={state} onChange={setState} />
                <FloatingInput id="zip"   label="Zip Code *" value={zip}   onChange={setZip} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Preferred Date & Time / Service Type ─────────────────────── */}
        <Card className="rounded-none border-x-0">
          <CardContent className="p-4 space-y-6">
            <h3 className="text-base font-semibold">Preferred Cleaning Date & Time</h3>
            <div className="space-y-6">

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-12 justify-start text-left font-normal rounded-md bg-white hover:bg-primary/10 hover:text-primary hover:border-primary",
                      !selectedDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Select Preferred Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Select value={timePreference} onValueChange={setTimePreference}>
                <SelectTrigger className="h-12 rounded-md border border-border bg-white">
                  <SelectValue placeholder="Time Preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="am">AM</SelectItem>
                  <SelectItem value="pm">PM</SelectItem>
                </SelectContent>
              </Select>

              <Select value={serviceType} onValueChange={(v) => { setServiceType(v); setCommercialType(""); }}>
                <SelectTrigger className="h-12 rounded-md border border-border bg-white">
                  <SelectValue placeholder="Service Type *" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Residential Section ──────────────────────────────────────── */}
        {serviceType === "residential" && (
          <Card className="rounded-none border-x-0">
            <CardContent className="p-4 space-y-6">
              <h3 className="text-base font-semibold">Residential Service Details</h3>
              <div className="space-y-6">
                <FloatingInput id="bedrooms"  label="How many bedrooms"  value={bedrooms}  onChange={(v) => setBedrooms(toIntegerString(v))}  type="text" />
                <FloatingInput id="bathrooms" label="How many bathrooms" value={bathrooms} onChange={(v) => setBathrooms(toIntegerString(v))} type="text" />

                <div>
                  <Label className="text-sm font-medium mb-3 block">Additional Services</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {ADDITIONAL_SERVICES.map((s) => (
                      <div
                        key={s}
                        onClick={() => toggleAdditionalService(s)}
                        className={cn(
                          "flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all",
                          additionalServices.includes(s)
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border bg-white hover:border-primary/50",
                        )}
                      >
                        <span className="text-sm">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="serviceDetails" className="text-sm font-medium mb-2 block">Service Details</Label>
                  <Textarea
                    id="serviceDetails"
                    placeholder="Service details..."
                    value={serviceDetails}
                    onChange={(e) => setServiceDetails(e.target.value)}
                    className="min-h-[100px] rounded-md border border-border bg-white"
                  />
                </div>

                {customQuestions.map((q) => (
                  <FloatingInput
                    key={q.id}
                    id={q.id}
                    label={q.question}
                    value={customAnswers[q.question] ?? ""}
                    onChange={(v) => setCustomAnswers((prev) => ({ ...prev, [q.question]: v }))}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Commercial Section ───────────────────────────────────────── */}
        {serviceType === "commercial" && (
          <Card className="rounded-none border-x-0">
            <CardContent className="p-4 space-y-6">
              <h3 className="text-base font-semibold">Select the property type</h3>
              <div className="space-y-6">

                <div className="grid grid-cols-2 gap-3">
                  {COMMERCIAL_TYPES.map((t) => (
                    <div
                      key={t}
                      onClick={() => setCommercialType(t)}
                      className={cn(
                        "flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all",
                        commercialType === t
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border bg-white hover:border-primary/50",
                      )}
                    >
                      <span className="text-sm">{t}</span>
                    </div>
                  ))}
                </div>

                {commercialType === "Other" && (
                  <FloatingInput
                    id="otherCommercialType"
                    label="Specify Property Type"
                    value={otherCommercialType}
                    onChange={setOtherCommercialType}
                  />
                )}

                <div>
                  <Label htmlFor="commercialDetails" className="text-sm font-medium mb-2 block">Service Details</Label>
                  <Textarea
                    id="commercialDetails"
                    placeholder="Service details..."
                    value={serviceDetails}
                    onChange={(e) => setServiceDetails(e.target.value)}
                    className="min-h-[100px] rounded-md border border-border bg-white"
                  />
                </div>

                {customQuestions.map((q) => (
                  <FloatingInput
                    key={q.id}
                    id={q.id}
                    label={q.question}
                    value={customAnswers[q.question] ?? ""}
                    onChange={(v) => setCustomAnswers((prev) => ({ ...prev, [q.question]: v }))}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Submit ──────────────────────────────────────────────────── */}
        <Card className="rounded-none border-x-0">
          <CardContent className="p-4">
            <Button className="w-full h-12 rounded-md" onClick={() => submit()} disabled={isPending}>
              {isPending ? "Submitting..." : "Book Now"}
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
