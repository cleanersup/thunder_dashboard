import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { PhoneInput } from "@/shared/components/ui/phone-input";
import { FloatingLabelInput } from "./FloatingLabelInput";
import { signupSchema, type SignupFormData } from "../schemas/signupSchema";
import { useSignup } from "../hooks/useSignup";
import thunderLogo from "@/assets/thunder-logo.png";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
  "Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
  "Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
  "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico",
  "New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania",
  "Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

/**
 * Signup form card with all registration fields and floating labels.
 * Handles submit via useSignup mutation.
 *
 * @param onSwitchToLogin - Called when user clicks "Already have an account? Sign in"
 */
export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { mutate: doSignup, isPending } = useSignup();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { agreeToTerms: false },
  });

  const phoneNumber = watch("phoneNumber") ?? "";
  const agreeToTerms = watch("agreeToTerms");
  const companyState = watch("companyState");

  const onSubmit = (data: SignupFormData) => {
    doSignup({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      companyName: data.companyName,
      companyState: data.companyState,
      referralCode: data.referralCode,
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center overflow-y-auto py-8 lg:py-12">
      <Card className="w-full max-w-md mx-4 lg:my-0 rounded-[5px] lg:backdrop-blur-sm lg:bg-card lg:border-white/20 border-0 lg:border bg-transparent shadow-none lg:shadow-sm">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="mx-auto w-20 h-20 flex items-center justify-center">
            <img src={thunderLogo} alt="Thunder Pro" className="w-full h-full object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900">Create Account</CardTitle>
            <CardDescription className="text-sm text-slate-700 mt-2">
              Sign up to get started
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <FloatingLabelInput
              id="firstName"
              label="First Name *"
              error={errors.firstName?.message}
              {...register("firstName")}
            />

            <FloatingLabelInput
              id="lastName"
              label="Last Name *"
              error={errors.lastName?.message}
              {...register("lastName")}
            />

            <FloatingLabelInput
              id="email"
              type="email"
              label="Email *"
              error={errors.email?.message}
              {...register("email")}
            />

            <PhoneInput
              id="phoneNumber"
              label="Phone Number *"
              value={phoneNumber}
              onChange={(val) => setValue("phoneNumber", val, { shouldValidate: true })}
              error={errors.phoneNumber?.message}
              floatingLabel
            />

            <FloatingLabelInput
              id="companyName"
              label="Company Name"
              {...register("companyName")}
            />

            {/* State selector */}
            <div>
              <Select
                value={companyState}
                onValueChange={(val) => setValue("companyState", val, { shouldValidate: true })}
              >
                <SelectTrigger
                  className={`h-12 rounded-[5px] border ${
                    errors.companyState ? "border-red-500" : "border-slate-300"
                  } focus:ring-0 focus:border-primary bg-white`}
                >
                  <SelectValue placeholder="State *" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-white z-50">
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.companyState && (
                <p className="text-xs text-red-500 mt-1">{errors.companyState.message}</p>
              )}
            </div>

            <FloatingLabelInput
              id="referralCode"
              label="Referral Code (Optional)"
              {...register("referralCode")}
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

            <FloatingLabelInput
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              label="Confirm Password"
              error={errors.confirmPassword?.message}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="text-slate-600 hover:text-slate-900"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              {...register("confirmPassword")}
            />

            {/* Terms */}
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="agreeToTerms"
                checked={agreeToTerms}
                onCheckedChange={(checked) =>
                  setValue("agreeToTerms", checked as boolean, { shouldValidate: true })
                }
              />
              <Label htmlFor="agreeToTerms" className="text-xs text-slate-700 leading-relaxed cursor-pointer">
                By signing up, you agree to our Terms of Use and Privacy Policy
              </Label>
            </div>
            {errors.agreeToTerms && (
              <p className="text-xs text-red-500 -mt-4">{errors.agreeToTerms.message}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-[5px] text-base font-semibold"
              disabled={isPending}
            >
              {isPending ? "Please wait..." : "Create Account"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-sm text-slate-900 hover:text-slate-700 font-medium hover:underline"
              >
                Already have an account? Sign in
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
