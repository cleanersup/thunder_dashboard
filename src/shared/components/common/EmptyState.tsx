import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";

interface EmptyStateProps {
  /** Lucide icon component to display. Defaults to Inbox. */
  icon?: LucideIcon;
  /** Primary heading text. */
  title: string;
  /** Supporting description text. */
  description?: string;
  /** Label for the optional action button. */
  actionLabel?: string;
  /** Callback invoked when the action button is clicked. */
  onAction?: () => void;
  /** Additional class names for the container. */
  className?: string;
}

/**
 * Generic empty state for lists and data pages.
 * Shows an icon, title, optional description, and an optional call-to-action button.
 *
 * @example
 * <EmptyState
 *   icon={Users}
 *   title="No clients yet"
 *   description="Add your first client to get started."
 *   actionLabel="Add Client"
 *   onAction={() => setModalOpen(true)}
 * />
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-8 text-center", className)}>
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
