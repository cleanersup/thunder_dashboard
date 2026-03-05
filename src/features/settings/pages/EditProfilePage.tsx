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
import { toast } from "@/shared/components/ui/use-toast";
import { useProfile } from "@/shared/hooks/useProfile";
import { useUpdatePersonalInfo } from "../hooks/useSettings";
import { editProfileSchema, type EditProfileFormData } from "../schemas/settingsSchemas";

export function EditProfilePage() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { mutate: updateProfile, isPending } = useUpdatePersonalInfo();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: { firstName: "", lastName: "", phoneNumber: "" },
  });

  // Pre-fill form when profile loads
  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.first_name ?? "",
        lastName: profile.last_name ?? "",
        phoneNumber: profile.phone_number ?? "",
      });
    }
  }, [profile, reset]);

  function onSubmit(data: EditProfileFormData) {
    updateProfile(data, {
      onSuccess: () => {
        toast({ title: "Profile updated successfully" });
        navigate("/profile");
      },
      onError: (err) => {
        toast({
          title: "Failed to update profile",
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
        <h1 className="text-xl font-bold">Edit Profile</h1>
      </div>

      <Card className="border border-border/50 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* First Name */}
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="John"
                {...register("firstName")}
                className={errors.firstName ? "border-destructive" : ""}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                {...register("lastName")}
                className={errors.lastName ? "border-destructive" : ""}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <PhoneInput
                id="phoneNumber"
                label="Phone Number"
                floatingLabel
                value={watch("phoneNumber")}
                onChange={(val) => setValue("phoneNumber", val, { shouldDirty: true })}
                error={errors.phoneNumber?.message}
              />
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
