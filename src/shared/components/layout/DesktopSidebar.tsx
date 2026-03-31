import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home, FileText, Receipt, Route, Users, Calendar,
  UserPlus, Clock, MapPin, Settings, LogOut, FileSignature,
} from "lucide-react";
import thunderProLogo from "@/assets/logo_thunder_pro_w.png";
import thunderLogo    from "@/assets/thunder-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/shared/hooks/useProfile";
import { useSubscription } from "@/features/subscriptions/context/SubscriptionContext";
import { hasFeatureAccess, type FeatureKey } from "@/shared/config/planFeatures";
import { cn } from "@/shared/utils/cn";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger,
  useSidebar,
} from "@/shared/components/ui/sidebar";

type NavItem = {
  path: string;
  icon: React.ElementType;
  label: string;
  feature?: FeatureKey;
};

const MAIN_NAV: NavItem[] = [
  { path: "/home",         icon: Home,    label: "Home" },
  { path: "/estimates",    icon: Receipt, label: "Estimates",  feature: "estimates"  },
  { path: "/walkthroughs", icon: FileText, label: "Walkthrough",  feature: "walkthrough"  },
  { path: "/create-route", icon: Route,   label: "Route",      feature: "routes"     },
  { path: "/invoices",     icon: FileText,        label: "Invoices",   feature: "invoices"   },
  // { path: "/contracts",   icon: FileSignature,   label: "Contracts"                        },
  { path: "/crm",          icon: Users,   label: "CRM",        feature: "crm"        },
  { path: "/booking",      icon: Calendar,label: "Booking",    feature: "booking"    },
  { path: "/employees",    icon: UserPlus,label: "Employees",  feature: "employee"   },
  { path: "/time-clock",   icon: Clock,   label: "Time Clock", feature: "time_clock" },
  { path: "/smart-map",    icon: MapPin,  label: "Smart Map",  feature: "smart_map"  },
];

const ACCOUNT_NAV = [
  { path: "/profile", icon: Settings, label: "Settings" },
] as const;

/** Routes after which a visual divider is added in the sidebar. */
const DIVIDER_AFTER = new Set(["/create-route", "/booking"]);

/**
 * Collapsible desktop sidebar with main and account navigation sections.
 * Active state is determined by prefix matching (exact match for /home).
 */
export function DesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { planTier, isLoading } = useSubscription();

  const visibleNav = MAIN_NAV.filter(item => !item.feature || hasFeatureAccess(planTier, item.feature));

  const isActive = (path: string) =>
    path === "/home" ? location.pathname === "/home" : location.pathname.startsWith(path);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Logo + collapse trigger */}
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/home" className="flex items-center">
            {isCollapsed
              ? <img src={thunderLogo}    alt="Thunder" className="h-7 w-auto" />
              : <img src={thunderProLogo} alt="Thunder Pro" className="h-12 w-auto" />
            }
          </Link>
          <SidebarTrigger className={isCollapsed ? "mx-auto" : "-mr-2"} />
        </div>
      </SidebarHeader>

      {/* Main navigation */}
      <SidebarContent className={cn("px-2", isCollapsed && "px-0 items-center")}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                // Skeleton rows — items never flash and then disappear
                Array.from({ length: 6 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <div className={cn(
                      "h-9 rounded-md bg-sidebar-accent/30 animate-pulse my-0.5",
                      isCollapsed ? "w-9 mx-auto" : "w-full",
                    )} />
                  </SidebarMenuItem>
                ))
              ) : (
                visibleNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <div key={item.path}>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.label}
                          className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-white data-[active=true]:text-primary text-[13px]"
                        >
                          <Link to={item.path}>
                            <Icon className={cn("h-5 w-5", isCollapsed && "ml-1")} />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {DIVIDER_AFTER.has(item.path) && (
                        <div className="my-2 mx-2 border-t border-white/20" />
                      )}
                    </div>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Account footer */}
      <SidebarFooter className={cn("border-t border-sidebar-border py-2", isCollapsed ? "px-0 items-center" : "px-2")}>
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
        {/* Profile info when expanded */}
        {!isCollapsed && profile && (
          <div className="px-2 py-2 border-t border-sidebar-border mt-2">
            <p className="text-xs text-sidebar-foreground/60 truncate">{profile.company_name ?? ""}</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
