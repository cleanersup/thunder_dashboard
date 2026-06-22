import { Suspense, type ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/shared/components/ui/sidebar";
import { DesktopSidebar } from "./DesktopSidebar";
import { DesktopHeader } from "./DesktopHeader";
import { TrialWelcomeModal } from "@/shared/components/common/TrialWelcomeModal";
import { useSubscription } from "@/features/subscriptions/context/SubscriptionContext";

interface MainLayoutProps {
  children: ReactNode;
}

/**
 * Root authenticated layout — responsive web layout for all screen sizes.
 * On desktop (≥1024px): collapsible sidebar + top header.
 * On mobile/tablet (<1024px): sidebar renders as a Sheet (drawer) toggled via the header hamburger button.
 */
export function MainLayout({ children }: MainLayoutProps) {
  const { isTrial, trialDaysLeft, isLegacyUser, trialWelcomeShown, isLoading, markTrialWelcomeShown } = useSubscription();

  const showWelcomeModal = !isLoading && isTrial && !trialWelcomeShown;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full font-sans">
        <DesktopSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <DesktopHeader />
          <main className="flex-1 overflow-auto">
            {/* Inner Suspense boundary: keeps sidebar + header persistent while
                the lazy page chunk loads, so navigation doesn't trigger the
                full-screen route loader. Each page renders its own content loader. */}
            <Suspense fallback={null}>{children}</Suspense>
          </main>
        </SidebarInset>
      </div>

      <TrialWelcomeModal
        open={showWelcomeModal}
        onClose={markTrialWelcomeShown}
        trialDaysLeft={trialDaysLeft}
        isLegacyUser={isLegacyUser}
      />
    </SidebarProvider>
  );
}
