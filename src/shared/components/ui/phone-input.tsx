import * as React from "react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/utils/cn";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  floatingLabel?: boolean;
}

/**
 * PhoneInput with automatic US phone number formatting (XXX)XXX-XXXX.
 * @param value - Formatted phone string
 * @param onChange - Called with formatted value on every change
 * @param label - Field label text
 * @param error - Error message to display below the field
 * @param floatingLabel - When true renders a CSS floating-label over the input
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = "", onChange, label, error, floatingLabel = false, className, id, ...props }, ref) => {
    const formatPhoneNumber = (raw: string): string => {
      const digits = raw.replace(/[^\d]/g, "");
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `(${digits.slice(0, 3)})${digits.slice(3)}`;
      return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(formatPhoneNumber(e.target.value));
    };

    if (floatingLabel && label) {
      return (
        <div className="relative">
          <Input
            ref={ref}
            id={id}
            type="tel"
            placeholder=" "
            value={value}
            onChange={handleChange}
            maxLength={13}
            className={cn(
              "h-12 rounded-[5px] border focus-visible:ring-0 focus-visible:border-primary px-3 bg-white peer",
              error ? "border-destructive" : "border-input",
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
              error ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {label}
          </Label>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {label && <Label htmlFor={id}>{label}</Label>}
        <Input
          ref={ref}
          id={id}
          type="tel"
          value={value}
          onChange={handleChange}
          maxLength={13}
          className={cn(error && "border-destructive", className)}
          {...props}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  },
);

PhoneInput.displayName = "PhoneInput";
