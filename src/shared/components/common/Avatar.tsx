/**
 * Shared avatar component that renders a colored circle with initials.
 * Color is deterministically derived from the name so it's consistent across renders.
 *
 * @example
 * <InitialsAvatar name="John Doe" />         // "JD" with a stable color
 * <InitialsAvatar name="Pamela Funk" size="lg" />
 */

const COLORS = [
  "bg-info-subtle text-info-subtle-foreground",
  "bg-success-subtle text-success-subtle-foreground",
  "bg-purple-vibrant/15 text-purple-vibrant",
  "bg-warning-subtle text-warning-subtle-foreground",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
  "bg-yellow-vibrant/15 text-yellow-vibrant",
  "bg-destructive/10 text-destructive",
];

/**
 * Returns 1-2 uppercase initials from a full name.
 * @param name - Full display name
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Deterministically picks a color class from a name string.
 * @param name - Full display name
 */
export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

const SIZE_CLASSES = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
} as const;

interface InitialsAvatarProps {
  /** Display name used to derive initials and color. */
  name: string;
  /** Avatar size. Defaults to "md". */
  size?: keyof typeof SIZE_CLASSES;
  /** Additional class names. */
  className?: string;
}

export function InitialsAvatar({ name, size = "md", className = "" }: InitialsAvatarProps) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold shrink-0 ${SIZE_CLASSES[size]} ${getAvatarColor(name)} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
