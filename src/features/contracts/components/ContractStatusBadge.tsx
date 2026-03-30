/**
 * @module ContractStatusBadge
 * Badge visual para cada estado de contrato, usando variables CSS semánticas del proyecto.
 */
import { Badge } from "@/shared/components/ui/badge";
import { cn }   from "@/shared/utils/cn";
import type { ContractStatus } from "../types/contract.types";

interface ContractStatusBadgeProps {
  status: ContractStatus;
  className?: string;
}

export const CONTRACT_STATUS_BADGE: Record<ContractStatus, string> = {
  Draft:    "bg-muted text-muted-foreground border-border/50",
  Pending:  "bg-[hsl(var(--info-subtle))] text-[hsl(var(--info-subtle-foreground))] border-[hsl(var(--info-subtle-border))]",
  Active:   "bg-[hsl(var(--success-subtle))] text-[hsl(var(--success-subtle-foreground))] border-[hsl(var(--success-subtle-border))]",
  Expiring: "bg-[hsl(var(--warning-subtle))] text-[hsl(var(--warning-subtle-foreground))] border-[hsl(var(--warning-subtle-border))]",
  Expired:  "bg-destructive/10 text-destructive border-destructive/20",
};

export const CONTRACT_STATUS_COLOR: Record<ContractStatus, string> = {
  Draft:    "hsl(var(--muted-foreground))",
  Pending:  "hsl(var(--info-subtle-foreground))",
  Active:   "hsl(var(--success-subtle-foreground))",
  Expiring: "hsl(var(--warning-subtle-foreground))",
  Expired:  "hsl(var(--destructive))",
};

export function ContractStatusBadge({ status, className }: ContractStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium text-[13px] w-fit",
        CONTRACT_STATUS_BADGE[status] ?? "",
        className
      )}
    >
      {status}
    </Badge>
  );
}
