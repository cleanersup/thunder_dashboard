import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { toast } from "@/shared/components/ui/use-toast";
import { useUpdatePassword } from "../hooks/useSettings";
import { securitySchema, type SecurityFormData } from "../schemas/settingsSchemas";

export function SecurityPage() {
  const navigate = useNavigate();
  const { mutate: changePassword, isPending } = useUpdatePassword();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SecurityFormData>({
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
          navigate("/profile");
        },
        onError: (err) => {
          toast({
            title: "Failed to update password",
            description: err instanceof Error ? err.message : "Unknown error",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-full bg-background p-2.5 space-y-2.5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Security</h1>
      </div>

      <Card className="border border-border/50 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter current password"
                  {...register("currentPassword")}
                  className={errors.currentPassword ? "border-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrent((v) => !v)}
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  placeholder="Min 8 characters"
                  {...register("newPassword")}
                  className={errors.newPassword ? "border-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNew((v) => !v)}
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs text-destructive">{errors.newPassword.message}</p>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  {...register("confirmPassword")}
                  className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Save button — only visible when dirty */}
            {isDirty && (
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating…
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
