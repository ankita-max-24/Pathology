import { Search, X } from "lucide-react";
import { forwardRef } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const SearchInput = forwardRef<
  HTMLInputElement,
  { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; size?: "default" | "lg"; autoFocus?: boolean }
>(function SearchInput({ value, onChange, placeholder = "Search…", className, size = "default", autoFocus }, ref) {
  return (
    <div className={cn("relative", className)}>
      <Search className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", size === "lg" ? "h-4.5 w-4.5" : "h-4 w-4")} />
      <Input
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("bg-surface pl-9 pr-8", size === "lg" ? "h-11 text-base" : "h-9")}
      />
      {value && (
        <button type="button" onClick={() => onChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label="Clear search">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
});
