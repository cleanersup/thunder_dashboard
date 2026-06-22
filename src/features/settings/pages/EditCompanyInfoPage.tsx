import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { PhoneInput } from "@/shared/components/ui/phone-input";
import { AddressAutocomplete } from "@/shared/components/AddressAutocomplete";
import { toast } from "@/shared/components/ui/use-toast";
import { useProfile } from "@/shared/hooks/useProfile";
import { useUpdateCompanyInfo } from "../hooks/useSettings";
import { editCompanySchema, type EditCompanyFormData } from "../schemas/settingsSchemas";

export function EditCompanyInfoPage() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { mutate: updateCompany, isPending } = useUpdateCompanyInfo();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<EditCompanyFormData>({
    resolver: zodResolver(editCompanySchema),
    defaultValues: {
      companyName: "",
      companyEmail: "",
      companyPhone: "",
      address: "",
      aptSuite: "",
      city: "",
      state: "",
      zip: "",
    },
  });

  // Pre-fill form when profile loads
  useEffect(() => {
    if (profile) {
      reset({
        companyName: profile.company_name ?? "",
        companyEmail: profile.company_email ?? "",
        companyPhone: profile.company_phone ?? "",
        address: profile.company_address ?? "",
        aptSuite: profile.company_apt_suite ?? "",
        city: profile.company_city ?? "",
        state: profile.company_state ?? "",
        zip: profile.company_zip ?? "",
      });
    }
  }, [profile, reset]);

  function onSubmit(data: EditCompanyFormData) {
    updateCompany(data, {
      onSuccess: () => {
        toast({ title: "Company information updated successfully" });
        navigate("/profile");
      },
      onError: (err) => {
        toast({
          title: "Failed to update company information",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      },
    });
  }

  return (
    <div className="min-h-full bg-background p-2.5 space-y-2.5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Company Information</h1>
      </div>

      <Card className="border border-border/50 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Business Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Company Name */}
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Thunder Pro LLC"
                {...register("companyName")}
                className={errors.companyName ? "border-destructive" : ""}
              />
              {errors.companyName && (
                <p className="text-xs text-destructive">{errors.companyName.message}</p>
              )}
            </div>

            {/* Company Email */}
            <div className="space-y-1.5">
              <Label htmlFor="companyEmail">Company Email</Label>
              <Input
                id="companyEmail"
                type="email"
                placeholder="info@company.com"
                {...register("companyEmail")}
                className={errors.companyEmail ? "border-destructive" : ""}
              />
              {errors.companyEmail && (
                <p className="text-xs text-destructive">{errors.companyEmail.message}</p>
              )}
            </div>

            {/* Company Phone */}
            <div className="space-y-1.5">
              <PhoneInput
                id="companyPhone"
                label="Company Phone"
                floatingLabel
                value={watch("companyPhone")}
                onChange={(val) => setValue("companyPhone", val, { shouldDirty: true })}
                error={errors.companyPhone?.message}
              />
            </div>

            {/* Street Address — with autocomplete */}
            <div className="space-y-1.5">
              <Label htmlFor="address">Street Address</Label>
              <AddressAutocomplete
                value={watch("address")}
                onChange={(val) => setValue("address", val, { shouldDirty: true })}
                onAddressSelect={(components) => {
                  setValue("address", components.street, { shouldDirty: true });
                  setValue("city", components.city, { shouldDirty: true });
                  setValue("state", components.state, { shouldDirty: true });
                  setValue("zip", components.zip, { shouldDirty: true });
                }}
                error={!!errors.address}
              />
              {errors.address && (
                <p className="text-xs text-destructive">{errors.address.message}</p>
              )}
            </div>

            {/* Apt/Suite */}
            <div className="space-y-1.5">
              <Label htmlFor="aptSuite">Apt/Suite (optional)</Label>
              <Input
                id="aptSuite"
                placeholder="Suite 200"
                {...register("aptSuite")}
              />
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Los Angeles"
                {...register("city")}
                className={errors.city ? "border-destructive" : ""}
              />
              {errors.city && (
                <p className="text-xs text-destructive">{errors.city.message}</p>
              )}
            </div>

            {/* State + ZIP — side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="CA"
                  maxLength={2}
                  className={`uppercase ${errors.state ? "border-destructive" : ""}`}
                  {...register("state", {
                    onChange: (e) => {
                      e.target.value = e.target.value.toUpperCase();
                    },
                  })}
                />
                {errors.state && (
                  <p className="text-xs text-destructive">{errors.state.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  placeholder="90210"
                  maxLength={5}
                  {...register("zip")}
                  className={errors.zip ? "border-destructive" : ""}
                />
                {errors.zip && (
                  <p className="text-xs text-destructive">{errors.zip.message}</p>
                )}
              </div>
            </div>

            {/* Save button — only visible when dirty */}
            {isDirty && (
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
