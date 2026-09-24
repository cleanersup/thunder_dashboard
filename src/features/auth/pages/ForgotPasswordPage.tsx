import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { AuthBackground } from "../components/AuthBackground";
import { FloatingLabelInput } from "../components/FloatingLabelInput";
import { useSendPasswordReset } from "../hooks/usePasswordReset";
import thunderLogo from "@/assets/thunder-logo.png";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

type FormData = z.infer<typeof schema>;

/**
 * ForgotPasswordPage — requests a password reset email.
 * Shows a confirmation message after successful submission.
 */
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { mutate: sendReset, isPending, isSuccess, variables } = useSendPasswordReset();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => sendReset({ email: data.email });

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      <AuthBackground />

      <Card className="w-full max-w-md rounded-[5px] relative z-10 backdrop-blur-sm bg-card border-white/20 text-card-foreground shadow-xl">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="mx-auto w-20 h-20 flex items-center justify-center">
            <img src={thunderLogo} alt="Thunder Pro" className="w-full h-full object-contain" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-card-foreground">Forgot Password</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {isSuccess
                ? "We've sent you a password reset link"
                : "Enter your email to reset your password"}
            </p>
          </div>
        </CardHeader>

        <CardContent>
          {!isSuccess ? (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <FloatingLabelInput
                id="email"
                type="email"
                label="Email"
                error={errors.email?.message}
                {...register("email")}
              />

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/auth")}
                  className="w-full sm:flex-1 h-12 rounded-[5px] bg-white hover:bg-white/90"
                >
                  Back to Login
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:flex-1 h-12 rounded-[5px] font-semibold"
                  disabled={isPending}
                >
                  {isPending ? "Sending..." : "Send Reset Link"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                If an account exists with <strong>{variables?.email}</strong>, you will receive a
                password reset link shortly.
              </p>
              <Button
                onClick={() => navigate("/auth")}
                className="w-full h-12 rounded-[5px] font-semibold"
              >
                Back to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
