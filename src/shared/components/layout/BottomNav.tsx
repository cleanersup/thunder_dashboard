import { useState } from "react";
import { Home, FileText, Plus, Receipt, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { FloatingActionButtons } from "./FloatingActionButtons";

/** Routes on which the bottom nav should be hidden (detail/form pages). */
const HIDDEN_ROUTES = new Set([
  "/auth",
  "/add-client",
  "/add-employee",
  "/add-lead",
  "/add-task",
  "/add-walkthrough",
  "/booking/edit-form",
  "/edit-company-info",
  "/edit-profile",
  "/edit-security",
  "/edit-subscriptions",
  "/create-invoice",
  "/create-residential-estimate",
  "/create-commercial-estimate",
  "/notifications",
  "/add-service-to-route",
]);

const HIDDEN_PREFIXES = [
  "/booking/public/",
  "/client/",
  "/edit-client/",
  "/edit-lead/",
  "/edit-task/",
  "/employee/",
  "/estimate/",
  "/estimate-commercial/",
  "/invoice/",
  "/lead/",
  "/route/",
  "/task/",
];

const NAV_ITEMS = [
  { path: "/home", icon: Home, label: "Home" },
  { path: "/invoices", icon: FileText, label: "Invoices" },
  { path: "/estimates", icon: Receipt, label: "Estimates" },
  { path: "/profile", icon: User, label: "Profile" },
] as const;

/**
 * Mobile bottom navigation bar with a floating action button (FAB) in the center.
 * Automatically hides on detail/form pages to avoid visual clutter.
 */
export function BottomNav() {
  const location = useLocation();
  const [showFAB, setShowFAB] = useState(false);

  const shouldHide =
    HIDDEN_ROUTES.has(location.pathname) ||
    HIDDEN_PREFIXES.some((prefix) => location.pathname.startsWith(prefix));

  if (shouldHide) return null;

  return (
    <>
      <FloatingActionButtons isOpen={showFAB} onClose={() => setShowFAB(false)} />
      <div className="fixed bottom-0 left-0 right-0 z-50">
        {/* Central FAB */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-10">
          <Button
            size="icon"
            className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90 border-4 border-background"
            onClick={() => setShowFAB((v) => !v)}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
        {/* Nav bar */}
        <div
          className="relative bg-card pt-4 rounded-t-3xl"
          style={{ paddingBottom: "max(0.5rem, var(--safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-around px-4">
            {/* Left two items */}
            {NAV_ITEMS.slice(0, 2).map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center justify-center flex-1"
                  onClick={() => setShowFAB(false)}
                >
                  <div className={`flex flex-col items-center gap-0.5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    <Icon className="h-6 w-6" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
            {/* Center spacer for FAB */}
            <div className="w-14" />
            {/* Right two items */}
            {NAV_ITEMS.slice(2).map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center justify-center flex-1"
                  onClick={() => setShowFAB(false)}
                >
                  <div className={`flex flex-col items-center gap-0.5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    <Icon className="h-6 w-6" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
