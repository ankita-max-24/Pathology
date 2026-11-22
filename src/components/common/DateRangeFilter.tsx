import { CalendarDays } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDays, todayKey, toDateKey } from "@/lib/lab/format";

export type RangePreset = "today" | "yesterday" | "week" | "month" | "last30" | "all" | "custom";

export interface DateRange {
  preset: RangePreset;
  from: string;
  to: string;
}

const LABELS: Record<RangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "This Week",
  month: "This Month",
  last30: "Last 30 Days",
  all: "All Time",
  custom: "Custom Range",
};

export function rangeFromPreset(preset: RangePreset, current?: DateRange): DateRange {
  const t = todayKey();
  const now = new Date();
  switch (preset) {
    case "today":
      return { preset, from: t, to: t };
    case "yesterday": {
      const y = addDays(t, -1);
      return { preset, from: y, to: y };
    }
    case "week": {
      const dow = (now.getDay() + 6) % 7; // Monday start
      return { preset, from: addDays(t, -dow), to: t };
    }
    case "month":
      return { preset, from: toDateKey(new Date(now.getFullYear(), now.getMonth(), 1)), to: t };
    case "last30":
      return { preset, from: addDays(t, -29), to: t };
    case "all":
      return { preset, from: "2000-01-01", to: "2999-12-31" };
    case "custom":
      return { preset, from: current?.from && current.preset !== "all" ? current.from : addDays(t, -6), to: current?.to && current.preset !== "all" ? current.to : t };
  }
}

export function DateRangeFilter({
  value,
  onChange,
  presets = ["today", "yesterday", "week", "month", "custom"],
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
  presets?: RangePreset[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value.preset} onValueChange={(v) => onChange(rangeFromPreset(v as RangePreset, value))}>
        <SelectTrigger className="h-9 w-[150px] bg-surface" aria-label="Date range">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presets.map((p) => (
            <SelectItem key={p} value={p}>
              {LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value.preset === "custom" && (
        <div className="flex items-center gap-1.5">
          <Input type="date" className="h-9 w-[150px] bg-surface" value={value.from} max={value.to} onChange={(e) => onChange({ ...value, from: e.target.value || value.from })} aria-label="From date" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" className="h-9 w-[150px] bg-surface" value={value.to} min={value.from} onChange={(e) => onChange({ ...value, to: e.target.value || value.to })} aria-label="To date" />
        </div>
      )}
    </div>
  );
}
