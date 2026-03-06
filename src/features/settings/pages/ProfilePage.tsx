import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  UserPen,
  Building,
  Shield,
  CreditCard,
  Sparkles,
  Mail,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  Loader2,
  FileSignature,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { PhoneInput } from "@/shared/components/ui/phone-input";
import { AddressAutocomplete } from "@/shared/components/AddressAutocomplete";
import { toast } from "@/shared/components/ui/use-toast";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { useNavigate, useLocation } from "react-router-dom";
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
  icon: React.ReactNode;
  label: string;
}> = [
  { section: "edit-profile",  icon: <UserPen className="w-4 h-4" />,      label: "Edit Profile" },
  { section: "company-info",  icon: <Building className="w-4 h-4" />,      label: "Company Information" },
  { section: "security",      icon: <Shield className="w-4 h-4" />,        label: "Security" },
  { section: "subscriptions", icon: <CreditCard className="w-4 h-4" />,    label: "Subscriptions" },
  { section: "stripe",        icon: <Building2 className="w-4 h-4" />,     label: "Stripe Dashboard" }
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

// ─── Main ProfilePage ─────────────────────────────────────────────────────────

export function ProfilePage() {
  const navigate = useNavigate();
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
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }
    uploadLogo.mutate(file);
    e.target.value = "";
  }

  // ── Nav click handler ───────────────────────────────────────────────────────

  async function handleNavClick(section: SettingsSection) {
    if (section === "subscriptions") {
      navigate("/subscription-plans");
      return;
    }
    if (section === "stripe") {
      setStripeLoading(true);
      try {
        const p = profile as any;
        const isConfigured = !!(p?.stripe_account_id && p?.stripe_onboarding_completed);
        const fnName = isConfigured ? "stripe-dashboard-link" : "stripe-onboard";
        const { data, error } = await supabase.functions.invoke(fnName);
        if (error) throw error;
        if (data?.url) window.open(data.url, "_blank");
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

  const fullAddress = [
    profile?.company_address,
    profile?.company_apt_suite,
    profile?.company_city,
    profile?.company_state,
    profile?.company_zip,
  ]
    .filter(Boolean)
    .join(", ");

  const INFO_ROWS = [
    { icon: <Sparkles className="w-4 h-4 text-violet-500" />, bg: "bg-violet-50", label: "Company Name", value: profile?.company_name },
    { icon: <Mail className="w-4 h-4 text-blue-500" />,       bg: "bg-blue-50",   label: "Email",        value: profile?.company_email },
    { icon: <Phone className="w-4 h-4 text-green-500" />,     bg: "bg-green-50",  label: "Phone",        value: profile?.company_phone },
    { icon: <MapPin className="w-4 h-4 text-purple-500" />,   bg: "bg-purple-50", label: "Address",      value: fullAddress || undefined },
  ];

  return (
    <div className="flex min-h-full bg-background">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* ── Left panel ───────────────────────────────────────────────────────── */}
      <div className="w-[320px] flex-shrink-0 flex flex-col border-r border-border bg-background">
        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3 p-6 pb-5">
          <div className="relative cursor-pointer group" onClick={handleLogoClick} title="Click to change logo">
            <Avatar className="w-28 h-28 ring-4 ring-background shadow-md">
              <AvatarImage src={profile?.company_logo ?? undefined} alt="Company logo" />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {uploadLogo.isPending ? <Loader2 className="w-7 h-7 animate-spin" /> : initials || <Building2 className="w-8 h-8" />}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium">Change</span>
            </div>
          </div>
          <h2 className="text-lg font-bold text-center">
            {profile?.first_name} {profile?.last_name}
          </h2>
        </div>

        <Separator />

        {/* Info rows */}
        <div className="p-4 space-y-4">
          {INFO_ROWS.filter((r) => r.value).map((row) => (
            <div key={row.label} className="flex items-start gap-3">
              <div className={`p-1.5 rounded-lg flex-shrink-0 ${row.bg}`}>{row.icon}</div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{row.label}</p>
                <p className="text-sm font-medium truncate">{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Settings nav */}
        <div className="p-4 flex-1">
          <p className="text-base font-bold mb-3">Settings</p>
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.section &&
                item.section !== "subscriptions" &&
                item.section !== "stripe";
              return (
                <button
                  key={item.section}
                  onClick={() => handleNavClick(item.section)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left
                    ${isActive
                      ? "border border-primary text-primary bg-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────────── */}
      <div className="flex-1 p-8 overflow-y-auto">
        {profile && activeSection === "edit-profile"  && <EditProfileSection profile={profile} />}
        {profile && activeSection === "company-info"  && <CompanyInfoSection profile={profile} />}
        {activeSection === "security"                  && <SecuritySection />}
        {activeSection === "contract"                  && <ContractSection />}
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
    </div>
  );
}
