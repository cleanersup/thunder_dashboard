import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  FileText,
  Receipt,
  CalendarClock,
  Users,
  Settings,
  LogOut,
  FileSignature,
  Briefcase,
  ListTodo,
  CalendarRange,
  UserPlus,
  UserCheck,
  ClipboardList,
  Clock,
  MapPin,
  Lock,
} from "lucide-react";
import thunderProLogo from "@/assets/logo_thunder_pro_w.png";
import thunderLogo from "@/assets/thunder-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/shared/hooks/useProfile";
import { useSubscription } from "@/features/subscriptions/context/SubscriptionContext";
import { hasFeatureAccess, getMinimumPlanForFeature, type FeatureKey } from "@/shared/config/planFeatures";
import { useContractAccess } from "@/features/contracts/hooks/useContractAccess";
import { useNavBadge } from "@/shared/hooks/useNavBadge";
import { NavBadgeNew } from "@/shared/components/common/NavBadgeNew";
import { cn } from "@/shared/utils/cn";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/shared/components/ui/sidebar";

type NavItem = {
  path: string;
  icon: React.ElementType;
  label: string;
  feature?: FeatureKey;
};

const SCHEDULE_ITEM: NavItem = {
  path: "/create-route",
  icon: CalendarRange,
  label: "Schedule",
  feature: "routes",
};

const WORKFLOW_NAV: NavItem[] = [
  { path: "/requests", icon: CalendarClock, label: "Requests", feature: "requests" },
  { path: "/walkthroughs", icon: ClipboardList, label: "Walkthrough", feature: "walkthrough" },
  { path: "/estimates", icon: Receipt, label: "Estimates", feature: "estimates" },
  { path: "/jobs", icon: Briefcase, label: "Jobs", feature: "jobs" },
  { path: "/invoices", icon: FileText, label: "Invoices", feature: "invoices" },
];

const OPERATIONS_NAV: NavItem[] = [
  { path: "/leads", icon: Users, label: "CRM", feature: "crm" },
  // Clients is always accessible (no feature gate) — matches swift-slate navConfig.
  { path: "/clients", icon: UserCheck, label: "Clients" },
  { path: "/tasks", icon: ListTodo, label: "Tasks", feature: "crm" },
  { path: "/contracts", icon: FileSignature, label: "Contracts", feature: "contracts" },
  { path: "/employees", icon: UserPlus, label: "Employees", feature: "employee" },
  { path: "/time-clock", icon: Clock, label: "Time Clock", feature: "time_clock" },
  { path: "/smart-map", icon: MapPin, label: "Smart Map", feature: "smart_map" },
];

const ACCOUNT_NAV = [{ path: "/profile", icon: Settings, label: "Settings" }] as const;

/**
 * Collapsible desktop sidebar.
 *
 * Layout (expanded):
 *   Home
 *   Schedule
 *   ────────────
 *   Workflow  ▸ Requests · Walkthrough · Estimates · Jobs · Invoices
 *   Operations ▸ CRM · Clients · Tasks · Contracts · Employees · Time Clock · Smart Map
 */
export function DesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { planTier, isLoading } = useSubscription();
  const { hasAccess: hasContractAccess } = useContractAccess();
  const contractsBadge = useNavBadge({
    storageKey: "nav-new-contracts",
    expiryDate: "2026-06-01",
    clickThreshold: 10,
  });

  const isActive = (path: string) =>
    path === "/home" ? location.pathname === "/home" : location.pathname.startsWith(path);

  // Contracts has its own trial logic; everything else uses the plan→feature matrix.
  const isLocked = (item: NavItem) =>
    item.path === "/contracts"
      ? !hasContractAccess
      : !!item.feature && !hasFeatureAccess(planTier, item.feature);

  // Minimum plan label shown in the upgrade prompt (contracts unlocks at essential).
  const requiredPlan = (item: NavItem) =>
    item.path === "/contracts"
      ? "ESSENTIAL"
      : item.feature
        ? getMinimumPlanForFeature(item.feature).toUpperCase()
        : "";

  const goToUpgrade = (item: NavItem) =>
    navigate("/subscription-plans", {
      state: {
        message: `${item.label} requires the ${requiredPlan(item)} plan`,
        highlightFeature: item.feature,
      },
    });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const locked = isLocked(item);

    // Locked items stay visible (with a padlock) so users see the feature exists,
    // but clicking routes to the plans page instead of the gated page.
    const iconEl = (
      <span className="relative shrink-0">
        <Icon className={cn("h-5 w-5", isCollapsed && "ml-1")} />
        {locked && (
          <span className="absolute -bottom-1 -right-1 rounded-full bg-sidebar p-px">
            <Lock className="h-2.5 w-2.5 text-sidebar-foreground/70" />
          </span>
        )}
      </span>
    );

    if (locked) {
      return (
        <SidebarMenuItem key={item.path}>
          <SidebarMenuButton
            tooltip={`${item.label} — ${requiredPlan(item)} plan`}
            onClick={() => goToUpgrade(item)}
            className="text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent text-[13px]"
          >
            {iconEl}
            <span>{item.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuItem key={item.path}>
        <SidebarMenuButton
          asChild
          isActive={isActive(item.path)}
          tooltip={item.label}
          className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-white data-[active=true]:text-primary text-[13px]"
        >
          <Link
            to={item.path}
            onClick={item.path === "/contracts" ? contractsBadge.markSeen : undefined}
          >
            {iconEl}
            <span>{item.label}</span>
            {item.path === "/contracts" && (
              <NavBadgeNew visible={contractsBadge.visible} collapsed={isCollapsed} />
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Logo + collapse trigger */}
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/home" className="flex items-center">
            {isCollapsed ? (
              <img src={thunderLogo} alt="Thunder" className="h-7 w-auto" />
            ) : (
              <img src={thunderProLogo} alt="Thunder Pro" className="h-12 w-auto" />
            )}
          </Link>
          <SidebarTrigger className={isCollapsed ? "mx-auto" : "-mr-2"} />
        </div>
      </SidebarHeader>

      <SidebarContent className={cn("px-2", isCollapsed && "px-0 items-center")}>
        {isLoading ? (
          /* Skeleton while subscription loads */
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <div
                      className={cn(
                        "h-9 rounded-md bg-sidebar-accent/30 animate-pulse my-0.5",
                        isCollapsed ? "w-9 mx-auto" : "w-full",
                      )}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            {/* Home */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {renderItem({ path: "/home", icon: Home, label: "Home" })}
                  {renderItem(SCHEDULE_ITEM)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Divider — after Schedule, before Workflow */}
            <div className="my-1 mx-2 border-t border-white/20" />

            {/* Workflow section */}
            <SidebarGroup>
              {!isCollapsed && (
                <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest px-2 pb-1">
                  Workflow
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>{WORKFLOW_NAV.map(renderItem)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Operations section */}
            <SidebarGroup>
              {!isCollapsed && (
                <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest px-2 pb-1">
                  Operations
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>{OPERATIONS_NAV.map(renderItem)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Account footer */}
      <SidebarFooter
        className={cn(
          "border-t border-sidebar-border py-2",
          isCollapsed ? "px-0 items-center" : "px-2",
        )}
      >
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ACCOUNT_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.path)}
                      tooltip={item.label}
                      className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-white data-[active=true]:text-primary text-[13px]"
                    >
                      <Link to={item.path}>
                        <Icon className={cn("h-5 w-5", isCollapsed && "ml-1")} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleSignOut}
                  tooltip="Sign Out"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 text-[13px]"
                >
                  <LogOut className={cn("h-5 w-5", isCollapsed && "ml-1")} />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {!isCollapsed && profile && (
          <div className="px-2 py-2 border-t border-sidebar-border mt-2">
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {profile.company_name ?? ""}
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
