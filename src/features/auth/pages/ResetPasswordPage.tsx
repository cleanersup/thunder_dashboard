import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { AuthBackground } from "../components/AuthBackground";
import { FloatingLabelInput } from "../components/FloatingLabelInput";
import { resetPasswordSchema, type ResetPasswordFormData } from "../schemas/resetPasswordSchema";
import { useUpdatePassword } from "../hooks/usePasswordReset";
import { supabase } from "@/integrations/supabase/client";
import thunderLogo from "@/assets/thunder-logo.png";

/**
 * ResetPasswordPage — updates the user's password after clicking an email reset link.
 * Validates that a Supabase session is present (from the magic link).
 * Shows an "Invalid Link" state if no session is found.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const { mutate: doUpdate, isPending } = useUpdatePassword();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsValidToken(!!session);
    });
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = (data: ResetPasswordFormData) => doUpdate({ password: data.password });

  if (isValidToken === null) return null;

  if (!isValidToken) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
        <AuthBackground />
        <Card className="w-full max-w-md rounded-[5px] relative z-10 backdrop-blur-sm bg-card border-white/20 text-slate-900">
          <CardHeader className="space-y-4 text-center pb-6">
            <div className="mx-auto w-20 h-20 flex items-center justify-center">
              <img src={thunderLogo} alt="Thunder Pro" className="w-full h-full object-contain" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-slate-900">Invalid Link</CardTitle>
              <p className="text-sm text-slate-700 mt-2">
                This password reset link is invalid or has expired.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => navigate("/forgot-password")}
              className="w-full h-12 rounded-[5px]"
            >
              Request New Link
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/auth")}
              className="w-full h-12 rounded-[5px] bg-white hover:bg-white/90"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      <AuthBackground />
      <Card className="w-full max-w-md rounded-[5px] relative z-10 backdrop-blur-sm bg-card border-white/20 text-slate-900">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="mx-auto w-20 h-20 flex items-center justify-center">
            <img src={thunderLogo} alt="Thunder Pro" className="w-full h-full object-contain" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-slate-900">Reset Password</CardTitle>
            <p className="text-sm text-slate-700 mt-2">Enter your new password below</p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FloatingLabelInput
              id="password"
              type={showPassword ? "text" : "password"}
              label="New Password"
              error={errors.password?.message}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              }
              {...register("password")}
            />

            <FloatingLabelInput
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              label="Confirm Password"
              error={errors.confirmPassword?.message}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              }
              {...register("confirmPassword")}
            />

            <Button
              type="submit"
              className="w-full h-12 rounded-[5px] font-semibold"
              disabled={isPending}
            >
              {isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
