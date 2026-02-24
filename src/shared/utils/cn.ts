import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names intelligently, resolving conflicts.
 * @param inputs - Class names or conditional class objects
 * @returns Merged class string
 * @example cn("px-4 py-2", isActive && "bg-primary", "text-sm")
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
