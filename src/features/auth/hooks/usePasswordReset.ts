import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { sendPasswordResetEmail, updatePassword } from "../services/authService";
import { getErrorMessage } from "@/shared/utils/errorHandler";

/**
 * React Query mutation for sending a password reset email.
 * Returns isPending and isSuccess for UI state management.
 *
 * @example
 * const { mutate: sendReset, isPending, isSuccess } = useSendPasswordReset();
 * sendReset({ email });
 */
export function useSendPasswordReset() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) => sendPasswordResetEmail(email),
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}

/**
 * React Query mutation for updating the user's password after clicking a reset link.
 * On success shows a toast and redirects to /auth after 2 seconds.
 *
 * @example
 * const { mutate: doUpdate, isPending } = useUpdatePassword();
 * doUpdate({ password });
 */
export function useUpdatePassword() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ password }: { password: string }) => updatePassword(password),
    onSuccess: () => {
      toast.success("Password updated! Redirecting to login...");
      setTimeout(() => navigate("/auth"), 2000);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}
