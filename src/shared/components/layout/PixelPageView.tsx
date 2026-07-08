import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Fires a Meta (Facebook) Pixel `PageView` on every client-side route change.
 *
 * The initial page load is already tracked by the base pixel snippet in
 * `index.html`, so the first render is skipped here to avoid double-counting.
 * Renders nothing — place inside the router alongside route definitions.
 */
export function PixelPageView() {
  const { pathname } = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  return null;
}
