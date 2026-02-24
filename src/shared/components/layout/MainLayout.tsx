import type { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/shared/components/ui/sidebar";
import { DesktopSidebar } from "./DesktopSidebar";
import { DesktopHeader } from "./DesktopHeader";
import { BottomNav } from "./BottomNav";
import { useIsMobile } from "@/shared/hooks/useIsMobile";

interface MainLayoutProps {
  children: ReactNode;
  /** Pass true on pages where the bottom nav should be hidden (detail / form pages). */
  hideBottomNav?: boolean;
}

/**
 * Root authenticated layout.
 * - Mobile/tablet (< 1024px): renders children with a fixed BottomNav.
 * - Desktop (≥ 1024px): renders a collapsible sidebar + top header wrapping the content.
 *
 * @param hideBottomNav - Explicitly hides the BottomNav on mobile if true
 */
export function MainLayout({ children, hideBottomNav = false }: MainLayoutProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        {children}
        {!hideBottomNav && <BottomNav />}
      </>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full font-sans">
        <DesktopSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <DesktopHeader />
          <main className="flex-1 overflow-auto">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
