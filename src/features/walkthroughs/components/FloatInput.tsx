import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/utils/cn";
import { toIntegerString, toDecimalString } from "@/shared/utils/numericInput";

interface FloatInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** "integer" (default) → whole numbers only. "decimal" → allows one decimal point. */
  inputType?: "integer" | "decimal";
  hasError?: boolean;
}

export function FloatInput({ id, label, value, onChange, inputType = "integer", hasError }: FloatInputProps) {
  const sanitize = inputType === "decimal" ? toDecimalString : toIntegerString;

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        inputMode={inputType === "decimal" ? "decimal" : "numeric"}
        placeholder=" "
        value={value}
        onChange={(e) => onChange(sanitize(e.target.value))}
        className={cn(
          "h-10 peer bg-background focus-visible:ring-0 focus-visible:border-primary px-3",
          hasError && "border-destructive",
        )}
      />
      <Label
        htmlFor={id}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground bg-background px-1 transition-all pointer-events-none
          peer-focus:top-0 peer-focus:text-xs peer-focus:text-primary
          peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary"
      >
        {label}
      </Label>
    </div>
  );
}
