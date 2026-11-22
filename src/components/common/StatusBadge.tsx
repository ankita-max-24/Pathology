import { Badge } from "@/components/ui/badge";
import type { PaymentStatus, StockStatus } from "@/lib/lab/types";

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variant = status === "Paid" ? "success" : status === "Partially Paid" ? "warning" : "danger";
  return (
    <Badge variant={variant}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </Badge>
  );
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const variant = status === "In Stock" ? "success" : status === "Low Stock" ? "warning" : "danger";
  return (
    <Badge variant={variant}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </Badge>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "teal" : "neutral"}>{active ? "Active" : "Inactive"}</Badge>;
}
