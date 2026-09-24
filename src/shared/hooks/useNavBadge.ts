/**
 * @module useNavBadge
 * Manages visibility of a "New" badge on a sidebar nav item.
 * The badge is hidden once the user visits the route OR once the expiry date passes.
 * State is persisted in localStorage so it survives page reloads.
 */
import { useState, useCallback } from "react";

interface UseNavBadgeOptions {
  /** Unique localStorage key, e.g. "nav-new-contracts" */
  storageKey: string;
  /** ISO date string — badge auto-hides after this date, e.g. "2026-06-01" */
  expiryDate: string;
  /** Number of clicks before the badge is hidden (default: 1) */
  clickThreshold?: number;
}

interface UseNavBadgeReturn {
  /** Whether the badge should currently be visible */
  visible: boolean;
  /** Call this when the user navigates to the route */
  markSeen: () => void;
}

export function useNavBadge({ storageKey, expiryDate, clickThreshold = 1 }: UseNavBadgeOptions): UseNavBadgeReturn {
  const isExpired  = new Date() >= new Date(expiryDate);
  const clicks     = parseInt(localStorage.getItem(storageKey) ?? "0", 10);
  const isDismissed = clicks >= clickThreshold;
  const [visible, setVisible] = useState(!isExpired && !isDismissed);

  const markSeen = useCallback(() => {
    if (!visible) return;
    const next = parseInt(localStorage.getItem(storageKey) ?? "0", 10) + 1;
    localStorage.setItem(storageKey, String(next));
    if (next >= clickThreshold) setVisible(false);
  }, [storageKey, clickThreshold, visible]);

  return { visible, markSeen };
}
