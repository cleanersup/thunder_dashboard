import * as React from "react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/utils/cn";

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  floatingLabel?: boolean;
}

/**
 * PhoneInput component with automatic US phone number formatting (XXX)XXX-XXXX
 *
 * @example
 * // With floating label (recommended)
 * <PhoneInput
 *   id="phone"
 *   label="Phone Number"
 *   value={phone}
 *   onChange={setPhone}
 *   error={errors.phone}
 *   floatingLabel
 * />
 *
 * @example
 * // With regular label
 * <PhoneInput
 *   id="phone"
 *   label="Phone Number"
 *   value={phone}
 *   onChange={setPhone}
 *   error={errors.phone}
 * />
 *
 * @example
 * // With react-hook-form
 * <PhoneInput
 *   id="phone"
 *   label="Phone Number"
 *   value={watch('phone')}
 *   onChange={(value) => setValue('phone', value, { shouldValidate: true })}
 *   error={errors.phone?.message}
 *   floatingLabel
 * />
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({
    value = '',
    onChange,
    label,
    error,
    floatingLabel = false,
    className,
    id,
    ...props
  }, ref) => {

    /**
     * Format phone number to (XXX)XXX-XXXX
     */
    const formatPhoneNumber = (rawValue: string): string => {
      // Remove all non-numeric characters
      const phoneNumber = rawValue.replace(/[^\d]/g, '');

      // Format based on length
      if (phoneNumber.length <= 3) {
        return phoneNumber;
      } else if (phoneNumber.length <= 6) {
        return `(${phoneNumber.slice(0, 3)})${phoneNumber.slice(3)}`;
      } else {
        return `(${phoneNumber.slice(0, 3)})${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
      }
    };

    /**
     * Handle input change and format automatically
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneNumber(e.target.value);
      onChange?.(formatted);
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
              "h-12 rounded-md border focus-visible:ring-0 focus-visible:border-primary px-3 bg-white peer",
              error ? "border-destructive" : "border-border",
              className
            )}
            {...props}
          />
          <Label
            htmlFor={id}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground bg-white px-1 transition-all pointer-events-none peer-focus:top-0 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary"
          >
            {label}
          </Label>
          {error && (
            <p className="text-sm text-destructive mt-1">{error}</p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={id}>{label}</Label>
        )}
        <Input
          ref={ref}
          id={id}
          type="tel"
          value={value}
          onChange={handleChange}
          maxLength={13}
          className={cn(
            error && "border-destructive",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
