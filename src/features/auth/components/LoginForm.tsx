import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { loginSchema, type LoginFormData } from "../schemas/loginSchema";
import { FloatingLabelInput } from "./FloatingLabelInput";
import { useLogin } from "../hooks/useLogin";
import thunderLogo from "@/assets/thunder-logo.png";

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onForgotPassword: () => void;
}

/**
 * Login form card with email + password fields and floating labels.
 * Handles submit via useLogin mutation.
 *
 * @param onSwitchToSignup - Called when user clicks "Don't have an account? Sign up"
 * @param onForgotPassword - Called when user clicks "Forgot Password?"
 */
export function LoginForm({ onSwitchToSignup, onForgotPassword }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { mutate: doLogin, isPending } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data: LoginFormData) => {
    doLogin({ email: data.email, password: data.password });
  };

  return (
    <Card className="w-full max-w-md mx-4 my-8 lg:my-0 rounded-[5px] backdrop-blur-sm bg-card border-white/20 text-slate-900">
      <CardHeader className="space-y-4 text-center pb-6">
        <div className="mx-auto w-20 h-20 flex items-center justify-center">
          <img src={thunderLogo} alt="Thunder Pro" className="w-full h-full object-contain" />
        </div>
        <div>
          <CardTitle className="text-xl font-bold text-slate-900">
            Welcome back to Thunder Pro
          </CardTitle>
          <p className="text-sm text-slate-700 mt-2">Sign in to access your account</p>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          <FloatingLabelInput
            id="email"
            type="email"
            label="Email"
            error={errors.email?.message}
            {...register("email")}
          />

          <FloatingLabelInput
            id="password"
            type={showPassword ? "text" : "password"}
            label="Password"
            error={errors.password?.message}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-slate-600 hover:text-slate-900"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            {...register("password")}
          />

          <div className="text-right -mt-2">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-primary hover:underline font-medium"
            >
              Forgot Password?
            </button>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-[5px] text-base font-semibold"
            disabled={isPending}
          >
            {isPending ? "Please wait..." : "Sign In"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-sm text-slate-900 hover:text-slate-700 font-medium hover:underline"
            >
              Don't have an account? Sign up
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
