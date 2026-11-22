import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const tones = {
  primary: "bg-primary-soft text-primary",
  teal: "bg-teal-soft text-teal",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-muted text-muted-foreground",
} as const;

export type Tone = keyof typeof tones;

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "primary",
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("panel flex flex-col gap-3 p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", tones[tone])}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div className="num text-xl font-semibold tracking-tight text-foreground md:text-2xl">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Compact inline stat strip used in report headers and summaries. */
export function StatStrip({ items }: { items: { label: string; value: ReactNode; tone?: Tone }[] }) {
  return (
    <div className="panel grid grid-cols-2 divide-border overflow-hidden sm:grid-cols-3 lg:flex lg:divide-x">
      {items.map((it) => (
        <div key={it.label} className="flex-1 border-b border-border px-4 py-3 last:border-b-0 lg:border-b-0">
          <div className="text-xs text-muted-foreground">{it.label}</div>
          <div
            className={cn(
              "num mt-1 text-base font-semibold",
              it.tone === "danger" && "text-danger",
              it.tone === "warning" && "text-warning",
              it.tone === "success" && "text-success",
              it.tone === "teal" && "text-teal",
              it.tone === "primary" && "text-primary",
            )}
          >
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
