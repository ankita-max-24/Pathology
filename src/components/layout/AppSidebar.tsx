import { Link, useRouterState } from "@tanstack/react-router";
import { Microscope } from "lucide-react";

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
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLab } from "@/lib/lab/store";

import { FOOTER_NAV, isNavActive, MAIN_NAV, type NavItem } from "./nav";

function NavList({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      {items.map((item) => {
        const active = isNavActive(item.to, pathname);
        return (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton asChild isActive={active} tooltip={item.title} className="h-9 data-[active=true]:bg-primary-soft data-[active=true]:font-medium data-[active=true]:text-primary">
              <Link to={item.to} onClick={() => isMobile && setOpenMobile(false)}>
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { db } = useLab();
  const admin = db.users.find((u) => u.role === "Administrator") ?? db.users[0];
  const initials = (admin?.name ?? "U").replace("Dr. ", "").split(" ").map((w) => w[0]).slice(0, 2).join("");

  return (
    <Sidebar collapsible="icon" className="print:hidden">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-3">
        <Link to="/" className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Microscope className="h-4 w-4" />
          </span>
          <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold text-foreground">{db.settings.labName}</span>
            <span className="truncate text-[11px] text-muted-foreground">Lab Management</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavList items={MAIN_NAV} pathname={pathname} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <NavList items={FOOTER_NAV} pathname={pathname} />
        <Link
          to="/settings"
          search={{ tab: "users" }}
          className="mt-1 flex items-center gap-2.5 rounded-md p-1.5 hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-soft text-xs font-semibold text-teal">{initials}</span>
          <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-xs font-medium text-foreground">{admin?.name}</span>
            <span className="truncate text-[11px] text-muted-foreground">{admin?.role}</span>
          </span>
        </Link>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
