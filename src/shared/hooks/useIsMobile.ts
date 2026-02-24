import { useState, useEffect } from "react";

/** Breakpoint in px at which the desktop sidebar layout activates (Tailwind `lg`). */
const MOBILE_BREAKPOINT = 1024;

/**
 * Returns true when the viewport width is below the desktop breakpoint (< 1024px).
 * Initializes synchronously to prevent layout flash on first render.
 * @returns Boolean indicating whether the current viewport is mobile/tablet
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    return false;
  });

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
