import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { createNotification } from "@/features/notifications/services/notificationsService";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { FloatingInput, SelectField, DateField, TextareaField, OptionGrid } from "@/shared/components/forms";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { usePublicProfile, usePublicBookingForms } from "../hooks/useBookings";
import { submitPublicBooking } from "../services/bookingService";
import { toast } from "sonner";
import { toIntegerString } from "@/shared/utils/numericInput";
import { TIME_PREFERENCE_OPTIONS } from "@/shared/utils/timePreference";
import { format } from "date-fns";
import type { CustomQuestion } from "../types/booking.types";

const ADDITIONAL_SERVICES = [
  "Kitchen", "Oven", "Refrigerator", "Living Room", "Dining Room",
  "Patio", "Garage", "Pets", "Laundry", "Windows",
];

const SERVICE_TYPE_OPTIONS = [
  { value: "residential", label: "Residential" },
  { value: "commercial",  label: "Commercial" },
];

const COMMERCIAL_TYPES = [
  "School", "Church", "Office", "Warehouse", "Restaurant", "Other",
];

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
    mutationFn: async () => {
      if (!fullName || !email || !phone || !street || !city || !state || !zip || !serviceType) {
        throw new Error("Please fill in all required fields.");
      }

      const booking = await submitPublicBooking(userId!, {
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

      // create-booking already sends the confirmation email to the lead.
      // Create in-app notification for business owner (fire-and-forget).
      void createNotification({
        userId:      userId!,
        type:        "booking_new",
        title:       "New Booking Request",
        message:     `${fullName} submitted a new ${serviceType} booking request`,
        relatedId:   booking.id,
        relatedType: "booking",
      }).catch(() => {});
    },
    onSuccess: () => setSubmitted(true),
    onError:   (err: Error) => toast.error(err.message ?? "Failed to submit booking"),
  });

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
              <FloatingInput id="fullName" label="Full Name" required value={fullName} onChange={setFullName} />
              <FloatingInput id="email"    label="Email" required     value={email}    onChange={setEmail}    type="email" />
              <FloatingInput id="phone"    label="Phone" required     value={phone}    onChange={setPhone} />
            </div>
          </CardContent>
        </Card>

        {/* ── Address ─────────────────────────────────────────────────── */}
        <Card className="rounded-none border-x-0">
          <CardContent className="p-4 space-y-6">
            <h3 className="text-base font-semibold">Address</h3>
            <div className="space-y-6">
              <FloatingInput id="street" label="Street" required   value={street} onChange={setStreet} />
              <div className="grid grid-cols-2 gap-3">
                <FloatingInput id="apt"  label="Apt/Suite" value={apt}  onChange={setApt} />
                <FloatingInput id="city" label="City" required    value={city} onChange={setCity} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FloatingInput id="state" label="State" required    value={state} onChange={setState} />
                <FloatingInput id="zip"   label="Zip Code" required value={zip}   onChange={setZip} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Preferred Date & Time / Service Type ─────────────────────── */}
        <Card className="rounded-none border-x-0">
          <CardContent className="p-4 space-y-6">
            <h3 className="text-base font-semibold">Preferred Cleaning Date & Time</h3>
            <div className="space-y-6">

              <DateField
                placeholder="Select Preferred Date"
                value={selectedDate}
                onChange={setSelectedDate}
                disabledDates={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />

              <SelectField
                placeholder="Time Preference"
                value={timePreference}
                onChange={setTimePreference}
                options={TIME_PREFERENCE_OPTIONS}
              />

              <SelectField
                placeholder="Service Type" required
                value={serviceType}
                onChange={(v) => { setServiceType(v); setCommercialType(""); }}
                options={SERVICE_TYPE_OPTIONS}
              />
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

                <OptionGrid
                  label="Additional Services"
                  multiple
                  options={ADDITIONAL_SERVICES}
                  value={additionalServices}
                  onChange={setAdditionalServices}
                />

                <TextareaField
                  id="serviceDetails"
                  label="Service Details"
                  placeholder="Service details..."
                  value={serviceDetails}
                  onChange={setServiceDetails}
                />

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

                <OptionGrid
                  options={COMMERCIAL_TYPES}
                  value={commercialType}
                  onChange={setCommercialType}
                />

                {commercialType === "Other" && (
                  <FloatingInput
                    id="otherCommercialType"
                    label="Specify Property Type"
                    value={otherCommercialType}
                    onChange={setOtherCommercialType}
                  />
                )}

                <TextareaField
                  id="commercialDetails"
                  label="Service Details"
                  placeholder="Service details..."
                  value={serviceDetails}
                  onChange={setServiceDetails}
                />

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
