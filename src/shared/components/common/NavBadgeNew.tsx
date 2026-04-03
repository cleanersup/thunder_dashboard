/**
 * @module NavBadgeNew
 * Reusable "New" badge for sidebar nav items.
 * Hidden when collapsed (icon-only) mode is active.
 */
interface NavBadgeNewProps {
  visible:    boolean;
  collapsed?: boolean;
}

export function NavBadgeNew({ visible, collapsed }: NavBadgeNewProps) {
  if (!visible || collapsed) return null;
  return (
    <span className="ml-auto text-[10px] font-semibold leading-none px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground flex-shrink-0">
      New
    </span>
  );
}
