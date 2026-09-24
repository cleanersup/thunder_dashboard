/**
 * @module SidePanel
 * Shared shell for right-side detail panels.
 *
 * Replaces centered Dialog modals with a slide-in panel that keeps the
 * sidebar visible and provides a more native feel on both desktop and mobile.
 *
 * Structure:
 *   - Fixed overlay (dims the content area, closes panel on click)
 *   - Panel: dark header (ID + badge + close) · scrollable body · optional footer
 *
 * Usage:
 *   <SidePanel
 *     open={open}
 *     onClose={onClose}
 *     title="EST-9ef07b"
 *     badge={{ label: "Pending", color: "hsl(var(--orange-vibrant))", bg: "hsl(var(--orange-vibrant) / 0.12)" }}
 *     footer={<MyFooterButtons />}
 *   >
 *     ...content...
 *   </SidePanel>
 */
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { cn } from "@/shared/utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SidePanelBadge {
  /** Text shown inside the badge. */
  label: string;
  /** CSS color value for text and border (e.g. "hsl(var(--orange-vibrant))"). */
  color: string;
  /** CSS color value for background (e.g. "hsl(var(--orange-vibrant) / 0.12)"). */
  bg: string;
}

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  /** Primary title shown in the dark header (e.g. invoice number, estimate ID). */
  title: string;
  /** Optional status badge rendered next to the title. */
  badge?: SidePanelBadge;
  /**
   * Content for the sticky footer (action buttons).
   * Rendered below the scrollable body with a top border.
   */
  footer?: React.ReactNode;
  /** Body content — will be placed inside a ScrollArea. */
  children: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SidePanel({
  open,
  onClose,
  title,
  badge,
  footer,
  children,
}: SidePanelProps) {

  // ── Side effects ────────────────────────────────────────────────────────────

  // Lock body scroll while the panel is open.
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else      document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape key.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return createPortal(
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      {/* ── Panel ─────────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          // Position & size
          "fixed right-0 top-0 z-50 flex h-screen flex-col",
          "w-full md:w-[440px]",
          // Background
          "bg-background shadow-2xl",
          // Slide animation
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* ── Dark header ─────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between gap-3 bg-[#202B3D] px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="truncate text-lg font-bold text-white">{title}</h2>

            {badge && (
              <span
                className="shrink-0 rounded-full border px-3 py-0.5 text-xs font-semibold"
                style={{
                  color:           badge.color,
                  backgroundColor: badge.bg,
                  borderColor:     badge.color,
                }}
              >
                {badge.label}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Close panel"
            className="shrink-0 rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <ScrollArea className="flex-1">
          {children}
        </ScrollArea>

        {/* ── Sticky footer (optional) ────────────────────────────────────── */}
        {footer && (
          <div className="shrink-0 border-t border-border bg-background px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}
