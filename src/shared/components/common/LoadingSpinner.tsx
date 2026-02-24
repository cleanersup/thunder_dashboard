import { cn } from "@/shared/utils/cn";

interface LoadingSpinnerProps {
  /** Visual size of the spinner. Defaults to "md". */
  size?: "sm" | "md" | "lg";
  /** Additional class names for the wrapper div. */
  className?: string;
  /** When true, centers the spinner in a full-screen container. */
  fullScreen?: boolean;
}

const SIZE_CLASSES = {
  sm: "w-5 h-5 border-2",
  md: "w-10 h-10 border-4",
  lg: "w-16 h-16 border-4",
} as const;

/**
 * Animated border spinner used for page and section loading states.
 *
 * @param size - Spinner size: "sm" | "md" | "lg". Defaults to "md".
 * @param fullScreen - Centers the spinner in a min-h-screen container.
 * @param className - Extra classes applied to the spinner element.
 *
 * @example
 * <LoadingSpinner />
 * <LoadingSpinner size="sm" />
 * <LoadingSpinner fullScreen />
 */
export function LoadingSpinner({ size = "md", className, fullScreen }: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={cn(
        "rounded-full border-primary border-t-transparent animate-spin",
        SIZE_CLASSES[size],
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          {spinner}
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return spinner;
}
