import { useNavigate } from "@tanstack/react-router";
import { FlaskConical, ReceiptText, Search, User } from "lucide-react";
import { useEffect, useState } from "react";

import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { formatINR } from "@/lib/lab/format";
import { useLab } from "@/lib/lab/store";

import { MAIN_NAV } from "./nav";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const { patients, bills, db } = useLab();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-border-strong"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 truncate text-left">Search patients, bills, tests…</span>
        <kbd className="hidden rounded border border-border bg-surface px-1.5 font-mono text-[10px] sm:inline">Ctrl K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search by patient name, ID, mobile, bill ID or test…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Patients">
            {patients.map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.name} ${p.id} ${p.mobile}`}
                onSelect={() => go(() => navigate({ to: "/patients/$patientId", params: { patientId: p.id } }))}
              >
                <User className="text-muted-foreground" />
                <span className="flex-1">{p.name}</span>
                <span className="id-chip">{p.id} · {p.mobile}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Bills">
            {bills.slice(0, 60).map((b) => (
              <CommandItem key={b.id} value={`${b.id} ${b.patientName}`} onSelect={() => go(() => navigate({ to: "/billing/$billId", params: { billId: b.id } }))}>
                <ReceiptText className="text-muted-foreground" />
                <span className="flex-1">{b.id} — {b.patientName}</span>
                <span className="num text-xs text-muted-foreground">{formatINR(b.total)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Tests">
            {db.tests.map((t) => (
              <CommandItem key={t.id} value={`test ${t.name} ${t.category}`} onSelect={() => go(() => navigate({ to: "/tests" }))}>
                <FlaskConical className="text-muted-foreground" />
                <span className="flex-1">{t.name}</span>
                <span className="num text-xs text-muted-foreground">{formatINR(t.price)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Pages">
            {MAIN_NAV.map((n) => (
              <CommandItem key={n.to} value={`page ${n.title}`} onSelect={() => go(() => navigate({ to: n.to }))}>
                <n.icon className="text-muted-foreground" />
                {n.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
