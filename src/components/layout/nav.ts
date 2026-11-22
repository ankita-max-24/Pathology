import {
  FlaskConical,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  Package,
  ReceiptText,
  Settings,
  SquarePlus,
  BarChart3,
  Users,
} from "lucide-react";

export interface NavItem {
  title: string;
  to: "/" | "/patients" | "/tests" | "/billing/new" | "/billing" | "/stock" | "/reports" | "/settings" | "/help";
  icon: LucideIcon;
}

export const MAIN_NAV: NavItem[] = [
  { title: "Dashboard", to: "/", icon: LayoutDashboard },
  { title: "Patients", to: "/patients", icon: Users },
  { title: "Test Catalog", to: "/tests", icon: FlaskConical },
  { title: "New Billing", to: "/billing/new", icon: SquarePlus },
  { title: "Billing Records", to: "/billing", icon: ReceiptText },
  { title: "Stock Management", to: "/stock", icon: Package },
  { title: "Reports", to: "/reports", icon: BarChart3 },
];

export const FOOTER_NAV: NavItem[] = [
  { title: "Settings", to: "/settings", icon: Settings },
  { title: "Help & Support", to: "/help", icon: LifeBuoy },
];

export function isNavActive(to: string, pathname: string) {
  if (to === "/") return pathname === "/";
  if (to === "/billing") return pathname === "/billing" || (pathname.startsWith("/billing/") && !pathname.startsWith("/billing/new")) || pathname.startsWith("/receipt");
  return pathname === to || pathname.startsWith(to + "/");
}
