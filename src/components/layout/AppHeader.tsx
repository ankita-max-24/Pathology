import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Bell, CalendarDays, ChevronDown, HelpCircle, LogOut, PackageMinus, PackagePlus, Plus, ReceiptText, RotateCcw, Settings, UserPlus, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { formatDate, formatINR, todayKey } from "@/lib/lab/format";
import { stockRegister } from "@/lib/lab/selectors";
import { useLab } from "@/lib/lab/store";

import { GlobalSearch } from "./GlobalSearch";

export function AppHeader() {
  const { db, bills, resetDemoData } = useLab();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);
  const admin = db.users.find((u) => u.role === "Administrator") ?? db.users[0];
  const initials = (admin?.name ?? "U").replace("Dr. ", "").split(" ").map((w) => w[0]).slice(0, 2).join("");

  const alerts = useMemo(() => stockRegister(db, todayKey()).filter((r) => r.status !== "In Stock"), [db]);
  const outstanding = useMemo(() => bills.filter((b) => b.pending > 0), [bills]);
  const outstandingTotal = outstanding.reduce((s, b) => s + b.pending, 0);
  const notifCount = alerts.length + (outstanding.length > 0 ? 1 : 0);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur print:hidden md:gap-3 md:px-5">
      <SidebarTrigger className="-ml-1" />
      <div className="hidden h-5 w-px bg-border md:block" />
      <div className="min-w-0 flex-1">
        <GlobalSearch />
      </div>
      <div className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
        <CalendarDays className="h-3.5 w-3.5" />
        <span className="num">{formatDate(todayKey())}</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-1.5">
            <Plus />
            <span className="hidden sm:inline">Quick Action</span>
            <ChevronDown className="hidden opacity-70 sm:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => navigate({ to: "/billing/new", search: {} })}><ReceiptText /> New Billing</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate({ to: "/patients/new" })}><UserPlus /> Register Patient</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate({ to: "/billing", search: { status: "outstanding" } })}><Wallet /> Collect Payment</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate({ to: "/stock", search: { action: "purchase" } })}><PackagePlus /> Purchase Entry</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate({ to: "/stock", search: { action: "sale" } })}><PackageMinus /> Sale / Usage Entry</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell />
            {notifCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-primary-foreground">
                {notifCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {outstanding.length > 0 && (
              <Link to="/billing" search={{ status: "outstanding" }} className="flex gap-3 border-b border-border px-4 py-3 hover:bg-accent/50">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="text-xs">
                  <p className="font-medium text-foreground">{outstanding.length} bills have pending balance</p>
                  <p className="text-muted-foreground">Total outstanding {formatINR(outstandingTotal)}</p>
                </div>
              </Link>
            )}
            {alerts.map((a) => (
              <Link key={a.productId} to="/stock" className="flex gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-accent/50">
                <AlertTriangle className={a.status === "Out of Stock" ? "mt-0.5 h-4 w-4 shrink-0 text-danger" : "mt-0.5 h-4 w-4 shrink-0 text-warning"} />
                <div className="text-xs">
                  <p className="font-medium text-foreground">{a.productName} — {a.status}</p>
                  <p className="text-muted-foreground">{a.closing} in stock · minimum {a.minStock}</p>
                </div>
              </Link>
            ))}
            {notifCount === 0 && <p className="px-4 py-6 text-center text-xs text-muted-foreground">You're all caught up.</p>}
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex items-center gap-2 rounded-md p-1 hover:bg-accent" aria-label="Profile menu">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-soft text-xs font-semibold text-teal">{initials}</span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{admin?.name}</p>
            <p className="text-xs text-muted-foreground">{admin?.role}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate({ to: "/settings", search: { tab: "profile" } })}><Settings /> Settings</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate({ to: "/help" })}><HelpCircle /> Help & Support</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmReset(true)}><RotateCcw /> Reset demo data</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => toast.info("Sign-out is not available in this prototype.")}><LogOut /> Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset demo data?"
        description="All patients, bills, payments and stock entries you added will be replaced with the original sample data."
        confirmLabel="Reset data"
        destructive
        onConfirm={() => {
          resetDemoData();
          toast.success("Demo data restored");
          navigate({ to: "/" });
        }}
      />
    </header>
  );
}
