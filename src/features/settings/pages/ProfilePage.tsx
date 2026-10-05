/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  UserPen,
  Building,
  Shield,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Loader2,
  FileSignature,
  LayoutGrid,
  Upload,
  User,
  Building2,
  KeyRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { PhoneInput } from "@/shared/components/ui/phone-input";
import { AddressAutocomplete } from "@/shared/components/AddressAutocomplete";
import { FormSection, FloatingInput, ReadOnlyField } from "@/shared/components/forms";
import { FORM_SECTION_GAP } from "@/shared/constants/formTokens";
import { toast } from "@/shared/components/ui/use-toast";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { useLocation } from "react-router-dom";
import { SubscriptionPlansContent } from "@/features/subscriptions/components/SubscriptionPlansContent";
import { useProfile } from "@/shared/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  useUpdatePersonalInfo,
  useUpdateCompanyInfo,
  useUpdatePassword,
  useUploadLogo,
} from "../hooks/useSettings";
import {
  editProfileSchema,
  buildEditCompanySchema,
  securitySchema,
  type EditProfileFormData,
  type EditCompanyFormData,
  type SecurityFormData,
} from "../schemas/settingsSchemas";
import { cn } from "@/shared/utils/cn";
import { postalRule, stateRule } from "@/shared/constants/countries";
import { useOwnerCountry } from "@/shared/hooks/useOwnerCountry";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type SettingsSection =
  | "edit-profile"
  | "company-info"
  | "security"
  | "subscriptions"
  | "stripe"
  | "contract";

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS: Array<{
  section: SettingsSection;
  icon: React.ElementType;
  label: string;
}> = [
  { section: "edit-profile",  icon: UserPen,   label: "Edit Profile" },
  { section: "company-info",  icon: Building,  label: "Company Information" },
  { section: "security",      icon: Shield,    label: "Security" },
  { section: "subscriptions", icon: CreditCard, label: "Subscriptions" },
  { section: "stripe",        icon: LayoutGrid, label: "Stripe Dashboard" },
];

/**
 * Barra de acciones de las secciones de ajustes.
 *
 * Es una pantalla completa, así que va en línea al final del scroll, no fija:
 * `Cancel` a la izquierda y la acción a la derecha, ambos compactos. Las tres
 * secciones la repetían con el orden invertido, cada una por su cuenta.
 */
function FormActions({
  pending,
  onCancel,
  label = "Save Changes",
  pendingLabel = "Saving…",
}: {
  pending: boolean;
  onCancel: () => void;
  label?: string;
  pendingLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{pendingLabel}</> : label}
      </Button>
    </div>
  );
}

// ─── Edit Profile section ────────────────────────────────────────────────────

function EditProfileSection({ profile }: { profile: Profile }) {
  const { mutate: updateProfile, isPending } = useUpdatePersonalInfo();
  const { handleSubmit, reset, setValue, watch, formState: { errors, isDirty } } =
    useForm<EditProfileFormData>({
      resolver: zodResolver(editProfileSchema),
      defaultValues: { firstName: "", lastName: "", phoneNumber: "" },
    });

  useEffect(() => {
    reset({
      firstName: profile.first_name ?? "",
      lastName: profile.last_name ?? "",
      phoneNumber: profile.phone_number ?? "",
    });
  }, [profile.id, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(data: EditProfileFormData) {
    updateProfile(data, {
      onSuccess: () => toast({ title: "Profile updated successfully" }),
      onError: (err) =>
        toast({
          title: "Failed to update profile",
          description: err instanceof Error ? err.message : undefined,
          variant: "destructive",
        }),
    });
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-bold">Edit Profile</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Update your personal information</p>

      <form onSubmit={handleSubmit(onSubmit)} className={FORM_SECTION_GAP}>
        <FormSection icon={User} title="Personal Information" subtitle="How your name appears to clients">
          <FloatingInput
            id="ep-firstName" label="First Name" required
            value={watch("firstName") ?? ""}
            onChange={(v) => setValue("firstName", v, { shouldDirty: true, shouldValidate: true })}
            error={errors.firstName?.message}
          />
          <FloatingInput
            id="ep-lastName" label="Last Name" required
            value={watch("lastName") ?? ""}
            onChange={(v) => setValue("lastName", v, { shouldDirty: true, shouldValidate: true })}
            error={errors.lastName?.message}
          />
          <PhoneInput
            id="ep-phone" label="Phone Number" floatingLabel required
            value={watch("phoneNumber")}
            onChange={(val) => setValue("phoneNumber", val, { shouldDirty: true })}
            error={errors.phoneNumber?.message}
          />
        </FormSection>

        {isDirty && <FormActions pending={isPending} onCancel={() => reset()} />}
      </form>
    </div>
  );
}

// ─── Company Info section ─────────────────────────────────────────────────────

function CompanyInfoSection({ profile }: { profile: Profile }) {
  const { mutate: updateCompany, isPending } = useUpdateCompanyInfo();
  const { country, countryName } = useOwnerCountry();
  const postal = postalRule(country);
  const state  = stateRule(country);

  const { handleSubmit, reset, setValue, watch, formState: { errors, isDirty } } =
    useForm<EditCompanyFormData>({
      resolver: zodResolver(buildEditCompanySchema(country)),
      defaultValues: { companyName: "", companyEmail: "", companyPhone: "", address: "", aptSuite: "", city: "", state: "", zip: "" },
    });

  useEffect(() => {
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
  }, [profile.id, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(data: EditCompanyFormData) {
    updateCompany(data, {
      onSuccess: () => toast({ title: "Company information updated" }),
      onError: (err) =>
        toast({
          title: "Failed to update company information",
          description: err instanceof Error ? err.message : undefined,
          variant: "destructive",
        }),
    });
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-bold">Company Information</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Update your business details</p>

      <form onSubmit={handleSubmit(onSubmit)} className={FORM_SECTION_GAP}>
        <FormSection icon={Building2} title="Business Details" subtitle="How your company identifies itself">
          <FloatingInput
            id="ci-name" label="Company Name" required
            value={watch("companyName") ?? ""}
            onChange={(v) => setValue("companyName", v, { shouldDirty: true, shouldValidate: true })}
            error={errors.companyName?.message}
          />
          {/* El país se fija en el registro: aquí solo se muestra. */}
          <ReadOnlyField label="Country" value={countryName} />
          <FloatingInput
            id="ci-email" label="Company Email" type="email" required
            value={watch("companyEmail") ?? ""}
            onChange={(v) => setValue("companyEmail", v, { shouldDirty: true, shouldValidate: true })}
            error={errors.companyEmail?.message}
          />
          <PhoneInput
            id="ci-phone" label="Company Phone" floatingLabel required
            value={watch("companyPhone")}
            onChange={(val) => setValue("companyPhone", val, { shouldDirty: true })}
            error={errors.companyPhone?.message}
          />
        </FormSection>

        <FormSection icon={MapPin} title="Address" subtitle="Where the business is based">
          <AddressAutocomplete
            value={watch("address")}
            onChange={(val) => setValue("address", val, { shouldDirty: true })}
            onAddressSelect={(c) => {
              setValue("address", c.street, { shouldDirty: true });
              setValue("city", c.city, { shouldDirty: true });
              setValue("state", c.state, { shouldDirty: true });
              setValue("zip", c.zip, { shouldDirty: true });
            }}
            country={country}
            error={!!errors.address}
          />
          {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}

          <FloatingInput
            id="ci-apt" label="Apt/Suite"
            value={watch("aptSuite") ?? ""}
            onChange={(v) => setValue("aptSuite", v, { shouldDirty: true })}
          />
          <FloatingInput
            id="ci-city" label="City" required
            value={watch("city") ?? ""}
            onChange={(v) => setValue("city", v, { shouldDirty: true, shouldValidate: true })}
            error={errors.city?.message}
          />

          <div className="grid grid-cols-2 gap-3">
            <FloatingInput
              id="ci-state" label="State" required maxLength={state.maxLength}
              value={watch("state") ?? ""}
              onChange={(v) => setValue("state", state.uppercase ? v.toUpperCase() : v, { shouldDirty: true, shouldValidate: true })}
              error={errors.state?.message}
            />
            <FloatingInput
              id="ci-zip" label="ZIP Code" required
              type={postal.numeric ? "integer" : "text"}
              maxLength={postal.maxLength}
              value={watch("zip") ?? ""}
              onChange={(v) => setValue("zip", v, { shouldDirty: true, shouldValidate: true })}
              error={errors.zip?.message}
            />
          </div>
        </FormSection>

        {isDirty && <FormActions pending={isPending} onCancel={() => reset()} />}
      </form>
    </div>
  );
}

// ─── Security section ─────────────────────────────────────────────────────────

const PASSWORD_FIELDS = [
  { id: "sec-cur", label: "Current Password",     field: "currentPassword" as const },
  { id: "sec-new", label: "New Password",         field: "newPassword"     as const },
  { id: "sec-con", label: "Confirm New Password", field: "confirmPassword" as const },
];

function SecuritySection() {
  const { mutate: changePassword, isPending } = useUpdatePassword();

  const { handleSubmit, reset, setValue, watch, formState: { errors, isDirty } } =
    useForm<SecurityFormData>({
      resolver: zodResolver(securitySchema),
      defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });

  function onSubmit(data: SecurityFormData) {
    changePassword(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      {
        onSuccess: () => {
          toast({ title: "Password updated successfully" });
          reset();
        },
        onError: (err) =>
          toast({
            title: "Failed to update password",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          }),
      }
    );
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-bold">Security</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Update your security settings</p>

      <form onSubmit={handleSubmit(onSubmit)} className={FORM_SECTION_GAP}>
        <FormSection icon={KeyRound} title="Password" subtitle="Change the password you sign in with">
          {PASSWORD_FIELDS.map(({ id, label, field }) => (
            <FloatingInput
              key={id}
              id={id} label={label} type="password" required
              value={watch(field) ?? ""}
              onChange={(v) => setValue(field, v, { shouldDirty: true, shouldValidate: true })}
              error={errors[field]?.message}
            />
          ))}
        </FormSection>

        {isDirty && (
          <FormActions pending={isPending} onCancel={() => reset()} label="Update Password" pendingLabel="Updating…" />
        )}
      </form>
    </div>
  );
}

// ─── Contract section ─────────────────────────────────────────────────────────

function ContractSection() {
  return (
    <div className="max-w-xl flex flex-col items-center text-center pt-12">
      <div className="p-4 rounded-full bg-primary/10 mb-4">
        <FileSignature className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-xl font-bold">Contract Module</h2>
      <p className="text-muted-foreground mt-2 text-sm">Coming soon</p>
      <p className="text-muted-foreground mt-3 text-sm leading-relaxed max-w-xs">
        Soon you'll be able to create, manage, and sign your contracts directly from Thunder Pro.
      </p>
    </div>
  );
}

// ─── Profile completion helper ────────────────────────────────────────────────

function calculateProfileCompletion(profile: Profile) {
  const fields = [
    profile.first_name,
    profile.last_name,
    profile.phone_number,
    profile.company_name,
    profile.company_email,
    profile.company_phone,
    profile.company_address,
    profile.company_city,
    profile.company_state,
    profile.company_zip,
    profile.company_logo,
  ];
  const filled = fields.filter((f) => f && f.trim() !== "").length;
  return Math.round((filled / fields.length) * 100);
}

// ─── Main ProfilePage ─────────────────────────────────────────────────────────

export function ProfilePage() {
  const location = useLocation();
  const { data: profile, isLoading } = useProfile();
  const uploadLogo = useUploadLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    (location.state as any)?.section ?? "edit-profile"
  );
  const [stripeLoading, setStripeLoading] = useState(false);

  // ── Logo upload ─────────────────────────────────────────────────────────────

  function handleLogoClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be smaller than 5MB",
        variant: "destructive",
      });
      return;
    }
    uploadLogo.mutate(file);
    e.target.value = "";
  }

  // ── Nav click handler ───────────────────────────────────────────────────────

  async function handleNavClick(section: SettingsSection) {
    if (section === "stripe") {
      setStripeLoading(true);
      try {
        const p = profile as any;
        const isConfigured = !!(p?.stripe_account_id && p?.stripe_onboarding_completed);
        const fnName = isConfigured ? "stripe-dashboard-link" : "stripe-onboard";
        const { data, error } = await supabase.functions.invoke(fnName);
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (data?.url) window.open(data.url, "_blank");
        else throw new Error("No redirect URL returned");
      } catch {
        toast({ title: "Failed to open Stripe Dashboard", variant: "destructive" });
      } finally {
        setStripeLoading(false);
      }
      return;
    }
    setActiveSection(section);
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = profile
    ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  const profileCompletion = profile ? calculateProfileCompletion(profile) : 0;

  return (
    <>
    <div className="min-h-full bg-background p-4 flex justify-center">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <div className="w-full max-w-2xl space-y-4 mx-auto">

        {/* Profile Card + Tabs: constrained to max-w-2xl for visual balance */}
        <div className="max-w-2xl mx-auto w-full space-y-4">

        {/* ── Profile Card ──────────────────────────────────────────────────── */}
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-6 flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative group flex-shrink-0 cursor-pointer" onClick={handleLogoClick} title="Click to change logo">
              <Avatar className="w-16 h-16 border-2 border-background shadow-md">
                <AvatarImage src={profile?.company_logo ?? undefined} alt="Company logo" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {uploadLogo.isPending
                    ? <Loader2 className="w-6 h-6 animate-spin" />
                    : initials || <Upload className="w-6 h-6" />}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                <Upload className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Name + company */}
            <div className="text-center mt-3">
              <h2 className="text-base font-semibold text-foreground">
                {profile?.first_name && profile?.last_name
                  ? `${profile.first_name} ${profile.last_name}`
                  : "Complete Your Profile"}
              </h2>
              <p className="text-sm text-muted-foreground">{profile?.company_name || "Not set"}</p>
            </div>

            {/* Profile completion progress */}
            {profileCompletion < 100 && (
              <div className="flex items-center gap-2 mt-3">
                <Progress value={profileCompletion} className="h-1.5 w-20" />
                <span className="text-xs font-medium text-muted-foreground">{profileCompletion}%</span>
              </div>
            )}

            {/* Horizontal contact info */}
            <div className="flex items-center justify-center gap-5 mt-4 pt-4 border-t border-border/50 w-full flex-wrap">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-foreground">{profile?.company_email || "Not set"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-foreground">{profile?.company_phone || "Not set"}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-foreground">
                  {profile?.company_city && profile?.company_state
                    ? `${profile.company_city}, ${profile.company_state}`
                    : "Not set"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Tabs Navigation Card ──────────────────────────────────────────── */}
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-0">
            <div className="flex justify-center px-2 pt-2 flex-wrap">
              {NAV_ITEMS.map((item) => {
                const isActive = activeSection === item.section && item.section !== "stripe";
                const Icon = item.icon;
                return (
                  <button
                    key={item.section}
                    onClick={() => handleNavClick(item.section)}
                    disabled={item.section === "stripe" && stripeLoading}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px disabled:opacity-50 disabled:cursor-not-allowed",
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    )}
                  >
                    {item.section === "stripe" && stripeLoading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Icon className="w-4 h-4" />}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        </div>{/* end max-w-2xl */}

        {/* ── Content Card ──────────────────────────────────────────────────── */}
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-6">
            {profile && activeSection === "edit-profile"  && <EditProfileSection profile={profile} />}
            {profile && activeSection === "company-info"  && <CompanyInfoSection profile={profile} />}
            {activeSection === "security"                  && <SecuritySection />}
            {activeSection === "contract"                  && <ContractSection />}
            {activeSection === "subscriptions"             && <SubscriptionPlansContent />}
          </CardContent>
        </Card>

      </div>
    </div>

    {/* Stripe loading dialog */}
    <AlertDialog open={stripeLoading}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Opening Stripe Dashboard</AlertDialogTitle>
          <AlertDialogDescription>
            Please wait while we redirect you to your Stripe account…
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-center py-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
