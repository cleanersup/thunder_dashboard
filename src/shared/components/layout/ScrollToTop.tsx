import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets the scroll position to the top of the page on every route change.
 * Targets the `#root` element (which handles scrolling in this app's CSS architecture).
 * Renders nothing — place inside the router alongside route definitions.
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const root = document.getElementById("root");
    if (root) {
      root.scrollTo(0, 0);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, search]);

  return null;
}
