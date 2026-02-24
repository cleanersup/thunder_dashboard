import { forwardRef } from "react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/utils/cn";

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  rightSlot?: React.ReactNode;
}

/**
 * Input with a CSS-only floating label and optional right slot (e.g. password toggle).
 *
 * @param id - Input id (also used for label htmlFor)
 * @param label - Floating label text
 * @param error - Error message shown below the input
 * @param rightSlot - Optional element rendered at the right edge (e.g. Eye icon button)
 *
 * @example
 * <FloatingLabelInput
 *   id="email"
 *   label="Email"
 *   type="email"
 *   value={email}
 *   onChange={...}
 *   error={errors.email?.message}
 * />
 */
export const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ id, label, error, rightSlot, className, ...props }, ref) => (
    <div className="relative">
      <Input
        ref={ref}
        id={id}
        placeholder=" "
        className={cn(
          "h-12 rounded-[5px] border focus-visible:ring-0 focus-visible:border-primary px-3 bg-white peer",
          rightSlot && "pr-10",
          error ? "border-red-500" : "border-slate-300",
          className,
        )}
        {...props}
      />
      <Label
        htmlFor={id}
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 text-sm bg-white px-1 transition-all pointer-events-none",
          "peer-focus:top-0 peer-focus:text-xs peer-focus:text-primary",
          "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary",
          error ? "text-red-500" : "text-slate-600",
        )}
      >
        {label}
      </Label>
      {rightSlot && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  ),
);

FloatingLabelInput.displayName = "FloatingLabelInput";
