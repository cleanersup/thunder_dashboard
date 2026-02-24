import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";

interface PageHeaderProps {
  /** Main heading of the page. */
  title: string;
  /** Optional subtitle displayed below the title. */
  subtitle?: string;
  /**
   * When true, shows a back chevron that calls navigate(-1).
   * Pass a string path to navigate to a specific route instead.
   */
  backTo?: boolean | string;
  /** Action buttons or elements rendered on the right side of the header. */
  actions?: ReactNode;
  /** Additional class names for the header container. */
  className?: string;
}

/**
 * Consistent page header used across all internal pages.
 * Supports a back button, title, subtitle, and right-aligned action slots.
 *
 * @example
 * // Simple header
 * <PageHeader title="Clients" />
 *
 * // With back button and action
 * <PageHeader
 *   title="Client Details"
 *   backTo="/crm"
 *   actions={<Button onClick={openEdit}>Edit</Button>}
 * />
 */
export function PageHeader({ title, subtitle, backTo, actions, className }: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (typeof backTo === "string") {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={cn("flex items-center justify-between px-4 py-4 lg:px-6 lg:py-5", className)}>
      <div className="flex items-center gap-3 min-w-0">
        {backTo && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0 -ml-2"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground truncate lg:text-2xl">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 ml-4">{actions}</div>
      )}
    </div>
  );
}
