import * as React from "react";

import { cn } from "@/shared/utils/cn";
import { FORM_CONTROL_FOCUS, FORM_CONTROL_HOVER } from "@/shared/constants/formTokens";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        FORM_CONTROL_HOVER,
        FORM_CONTROL_FOCUS,
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
