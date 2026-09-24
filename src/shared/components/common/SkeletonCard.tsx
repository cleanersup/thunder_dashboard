import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";

interface SkeletonCardProps {
  /** Number of skeleton rows to render inside the card body. Defaults to 3. */
  rows?: number;
  /** Show a skeleton header above the rows. Defaults to true. */
  showHeader?: boolean;
  /** Additional class names for the Card element. */
  className?: string;
}

/**
 * Generic loading skeleton shaped like a card.
 * Use while async data is loading on list and detail pages.
 *
 * @example
 * {isLoading && <SkeletonCard rows={4} />}
 */
export function SkeletonCard({ rows = 3, showHeader = true, className }: SkeletonCardProps) {
  return (
    <Card className={cn("w-full", className)}>
      {showHeader && (
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24 mt-1" />
        </CardHeader>
      )}
      <CardContent className="space-y-3 pt-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Specialized skeletons used in Dashboard ─────────────────────────────────

/**
 * Skeleton for a single stat card (KPI tile).
 */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4 pt-5 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for a chart section.
 */
export function ChartSkeleton({ height = 120, className }: { height?: number; className?: string }) {
  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4 pt-5 space-y-3">
        <div>
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-9 w-32 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="w-full rounded-md" style={{ height: `${height}px` }} />
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for the activity feed section.
 */
export function ActivitySkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="px-4 py-3">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
