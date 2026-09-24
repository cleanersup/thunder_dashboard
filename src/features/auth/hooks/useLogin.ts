import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { login } from "../services/authService";
import { getErrorMessage } from "@/shared/utils/errorHandler";

/**
 * React Query mutation for user login.
 * On success navigates to /home and invalidates all cached queries.
 *
 * @example
 * const { mutate: doLogin, isPending } = useLogin();
 * doLogin({ email, password });
 */
export function useLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries();
      navigate("/home");
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      let friendly = message;

      if (message.includes("Invalid login credentials")) {
        friendly = "Invalid email or password. Please try again.";
      } else if (message.includes("Email not confirmed")) {
        friendly = "Please verify your email before signing in.";
      }

      toast.error(friendly);
    },
  });
}
