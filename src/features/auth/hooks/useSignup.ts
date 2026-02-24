import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { signUp, type SignUpData } from "../services/authService";
import { getErrorMessage } from "@/shared/utils/errorHandler";

/**
 * React Query mutation for user signup.
 * On success navigates to /verify-email passing email and verificationCode in location state.
 *
 * @example
 * const { mutate: doSignup, isPending } = useSignup();
 * doSignup({ email, password, firstName, ... });
 */
export function useSignup() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: SignUpData) => signUp(data),
    onSuccess: ({ verificationCode }, variables) => {
      navigate("/verify-email", {
        state: { email: variables.email, verificationCode },
      });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      let friendly = message;

      if (message.includes("User already registered")) {
        friendly = "This email is already registered. Please sign in instead.";
      }

      toast.error(friendly);
    },
  });
}
