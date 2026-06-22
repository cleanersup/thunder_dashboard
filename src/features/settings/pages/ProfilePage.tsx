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
  Eye,
  EyeOff,
  Loader2,
  FileSignature,
  LayoutGrid,
  Upload,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { PhoneInput } from "@/shared/components/ui/phone-input";
import { AddressAutocomplete } from "@/shared/components/AddressAutocomplete";
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
  editCompanySchema,
  securitySchema,
  type EditProfileFormData,
  type EditCompanyFormData,
  type SecurityFormData,
} from "../schemas/settingsSchemas";
import { cn } from "@/shared/utils/cn";
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

// ─── Edit Profile section ────────────────────────────────────────────────────

function EditProfileSection({ profile }: { profile: Profile }) {
  const { mutate: updateProfile, isPending } = useUpdatePersonalInfo();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isDirty } } =
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="ep-firstName">First Name <span className="text-destructive">*</span></Label>
          <Input id="ep-firstName" placeholder="John" {...register("firstName")}
            className={errors.firstName ? "border-destructive" : ""} />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ep-lastName">Last Name <span className="text-destructive">*</span></Label>
          <Input id="ep-lastName" placeholder="Doe" {...register("lastName")}
            className={errors.lastName ? "border-destructive" : ""} />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ep-phone">Phone Number <span className="text-destructive">*</span></Label>
          <PhoneInput
            id="ep-phone"
            value={watch("phoneNumber")}
            onChange={(val) => setValue("phoneNumber", val, { shouldDirty: true })}
            error={errors.phoneNumber?.message}
          />
        </div>

        {isDirty && (
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => reset()}>
              Cancel
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

// ─── Company Info section ─────────────────────────────────────────────────────

function CompanyInfoSection({ profile }: { profile: Profile }) {
  const { mutate: updateCompany, isPending } = useUpdateCompanyInfo();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isDirty } } =
    useForm<EditCompanyFormData>({
      resolver: zodResolver(editCompanySchema),
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="ci-name">Company Name <span className="text-destructive">*</span></Label>
          <Input id="ci-name" placeholder="Thunder Pro LLC" {...register("companyName")}
            className={errors.companyName ? "border-destructive" : ""} />
          {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ci-email">Company Email <span className="text-destructive">*</span></Label>
          <Input id="ci-email" type="email" placeholder="info@company.com" {...register("companyEmail")}
            className={errors.companyEmail ? "border-destructive" : ""} />
          {errors.companyEmail && <p className="text-xs text-destructive">{errors.companyEmail.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ci-phone">Company Phone <span className="text-destructive">*</span></Label>
          <PhoneInput id="ci-phone" value={watch("companyPhone")}
            onChange={(val) => setValue("companyPhone", val, { shouldDirty: true })}
            error={errors.companyPhone?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ci-address">Street Address <span className="text-destructive">*</span></Label>
          <AddressAutocomplete
            value={watch("address")}
            onChange={(val) => setValue("address", val, { shouldDirty: true })}
            onAddressSelect={(c) => {
              setValue("address", c.street, { shouldDirty: true });
              setValue("city", c.city, { shouldDirty: true });
              setValue("state", c.state, { shouldDirty: true });
              setValue("zip", c.zip, { shouldDirty: true });
            }}
            error={!!errors.address}
          />
          {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ci-apt">Apt/Suite</Label>
          <Input id="ci-apt" placeholder="Suite 200" {...register("aptSuite")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ci-city">City <span className="text-destructive">*</span></Label>
          <Input id="ci-city" placeholder="Los Angeles" {...register("city")}
            className={errors.city ? "border-destructive" : ""} />
          {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ci-state">State <span className="text-destructive">*</span></Label>
            <Input id="ci-state" placeholder="CA" maxLength={2}
              className={`uppercase ${errors.state ? "border-destructive" : ""}`}
              {...register("state", { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
            {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ci-zip">ZIP Code <span className="text-destructive">*</span></Label>
            <Input id="ci-zip" placeholder="90210" maxLength={5} {...register("zip")}
              className={errors.zip ? "border-destructive" : ""} />
            {errors.zip && <p className="text-xs text-destructive">{errors.zip.message}</p>}
          </div>
        </div>

        {isDirty && (
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => reset()}>
              Cancel
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

// ─── Security section ─────────────────────────────────────────────────────────

function SecuritySection() {
  const { mutate: changePassword, isPending } = useUpdatePassword();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } =
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {(
          [
            { id: "sec-cur", label: "Current Password", field: "currentPassword" as const, show: showCurrent, setShow: setShowCurrent },
            { id: "sec-new", label: "New Password",     field: "newPassword"     as const, show: showNew,     setShow: setShowNew     },
            { id: "sec-con", label: "Confirm New Password", field: "confirmPassword" as const, show: showConfirm, setShow: setShowConfirm },
          ] as const
        ).map(({ id, label, field, show, setShow }) => (
          <div key={id} className="space-y-1.5">
            <Label htmlFor={id}>{label} <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input id={id} type={show ? "text" : "password"}
                placeholder="••••••••"
                {...register(field)}
                className={`pr-10 ${errors[field] ? "border-destructive" : ""}`} />
              <button type="button" tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShow((v) => !v)}>
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors[field] && <p className="text-xs text-destructive">{errors[field]?.message}</p>}
          </div>
        ))}

        {isDirty && (
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</> : "Update Password"}
            </Button>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => reset()}>
              Cancel
            </Button>
          </div>
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
