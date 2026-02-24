import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/shared/components/ui/input-otp";
import { AuthBackground } from "../components/AuthBackground";
import { resendVerificationEmail } from "../services/authService";
import thunderLogo from "@/assets/thunder-logo.png";

interface LocationState {
  email: string;
  verificationCode: string;
}

/**
 * VerifyEmailPage — 6-digit OTP verification after signup.
 * Reads email and verificationCode from React Router location state.
 * On correct code navigates to /home.
 */
export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  // Mutable ref keeps the current verification code without causing re-renders
  const currentCode = useRef(state?.verificationCode ?? "");

  const email = state?.email;

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      if (code === currentCode.current) {
        toast.success("Email verified! Welcome to Thunder Pro.");
        navigate("/home", { replace: true });
      } else {
        toast.error("Incorrect code. Please try again.");
        setCode("");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("Email not found. Please sign up again.");
      return;
    }

    setLoading(true);
    try {
      const newCode = await resendVerificationEmail(email);
      currentCode.current = newCode;
      toast.success("A new verification code has been sent to your email.");
    } catch {
      toast.error("Failed to resend verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Guard: if navigated directly without state, redirect to auth
  if (!email) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <AuthBackground />
        <Card className="w-full max-w-md rounded-[5px] relative z-10 backdrop-blur-sm bg-card border-white/20 text-slate-900">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl font-bold">Session Expired</CardTitle>
            <p className="text-sm text-slate-700 mt-2">
              Please sign up again to receive a new verification code.
            </p>
          </CardHeader>
          <CardContent>
            <Button className="w-full h-12 rounded-[5px]" onClick={() => navigate("/auth")}>
              Back to Sign In
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
            <CardTitle className="text-xl font-bold text-slate-900">Verify Your Email</CardTitle>
            <p className="text-sm text-slate-700 mt-2">Enter the 6-digit code we sent to</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">{email}</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={handleVerify}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="w-12 h-14 text-lg border-slate-300"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={handleVerify}
            className="w-full h-12 rounded-[5px] font-semibold"
            disabled={loading || code.length !== 6}
          >
            {loading ? "Verifying..." : "Verify Email"}
          </Button>

          <div className="text-center space-y-2">
            <p className="text-sm text-slate-700">Didn't receive the code?</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="text-sm text-primary hover:underline font-medium disabled:opacity-50"
            >
              Resend Code
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="text-sm text-slate-900 hover:text-slate-700 font-medium hover:underline"
            >
              Back to Sign In
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
