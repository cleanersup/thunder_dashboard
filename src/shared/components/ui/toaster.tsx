import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { ToastOverlay } from "@/components/ui/toast-overlay";
import { CheckCircle } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();
  const hasToasts = toasts.length > 0;

  return (
    <ToastProvider duration={2000}>
      {hasToasts && <ToastOverlay />}
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} duration={2000} {...props}>
            <div className="grid gap-2 pr-6">
              <div className="flex items-center justify-center gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {!props.variant || props.variant === "default" ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 animate-scale-in" />
                ) : null}
              </div>
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
