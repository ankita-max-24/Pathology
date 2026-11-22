import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  FileSpreadsheet,
  IndianRupee,
  Package,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  Plus,
  Search,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/common/DataTable";
import { Field } from "@/components/common/Field";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard } from "@/components/common/StatCard";
import { StockStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportCSV } from "@/lib/lab/export";
import { formatDate, formatINR, todayKey } from "@/lib/lab/format";
import { currentStock, stockRegister, type StockDayRow } from "@/lib/lab/selectors";
import { useLab } from "@/lib/lab/store";
import type { StockProduct, StockTxn, StockTxnType } from "@/lib/lab/types";

export const Route = createFileRoute("/stock")({
  validateSearch: (s: Record<string, unknown>): { action?: "purchase" | "sale"; tab?: string } => ({
    ...(s["action"] === "purchase" || s["action"] === "sale" ? { action: s["action"] } : {}),
    ...(typeof s["tab"] === "string" ? { tab: s["tab"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Stock Management — GNS Pathology Lab" },
      { name: "description", content: "Inventory control, daily stock register, vendor purchases and supply consumption." },
      { property: "og:title", content: "Stock Management — GNS Pathology Lab" },
      { property: "og:description", content: "Inventory control, daily stock register, vendor purchases and supply consumption." },
    ],
  }),
  component: StockManagementPage,
});

function StockManagementPage() {
  const { action, tab } = Route.useSearch();
  const { db, addStockTxn, updateProduct } = useLab();

  const [activeTab, setActiveTab] = useState<string>(tab || "register");
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());
  const [txnSearch, setTxnSearch] = useState<string>("");
  const [txnTypeFilter, setTxnTypeFilter] = useState<string>("all");

  // Purchase Dialog
  const [purchaseOpen, setPurchaseOpen] = useState<boolean>(action === "purchase");
  const [purchaseProduct, setPurchaseProduct] = useState<string>(db.products[0]?.id || "");
  const [purchaseQty, setPurchaseQty] = useState<number>(10);
  const [purchaseAmount, setPurchaseAmount] = useState<number>(1000);
  const [purchaseSupplier, setPurchaseSupplier] = useState<string>("");
  const [purchaseRef, setPurchaseRef] = useState<string>("");
  const [purchaseNotes, setPurchaseNotes] = useState<string>("");

  // Usage/Sale Dialog
  const [saleOpen, setSaleOpen] = useState<boolean>(action === "sale");
  const [saleProduct, setSaleProduct] = useState<string>(db.products[0]?.id || "");
  const [saleType, setSaleType] = useState<"Sale" | "Usage">("Usage");
  const [saleQty, setSaleQty] = useState<number>(1);
  const [saleAmount, setSaleAmount] = useState<number>(0);
  const [salePatientId, setSalePatientId] = useState<string>("");
  const [saleRef, setSaleRef] = useState<string>("");
  const [saleNotes, setSaleNotes] = useState<string>("");

  // Edit Min Stock Dialog
  const [editProduct, setEditProduct] = useState<StockProduct | null>(null);
  const [newMinStock, setNewMinStock] = useState<number>(5);

  const today = todayKey();

  // Stock Register for selected date
  const registerRows = useMemo(() => {
    return stockRegister(db, selectedDate);
  }, [db, selectedDate]);

  // Inventory stats
  const stats = useMemo(() => {
    const totalSKUs = db.products.length;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalItemsOnHand = 0;

    for (const p of db.products) {
      const onHand = currentStock(db, p.id);
      totalItemsOnHand += onHand;
      if (onHand <= 0) outOfStockCount++;
      else if (onHand <= p.minStock) lowStockCount++;
    }

    return { totalSKUs, lowStockCount, outOfStockCount, totalItemsOnHand };
  }, [db]);

  // Txn rows sorted
  const sortedTxns = useMemo(() => {
    const term = txnSearch.trim().toLowerCase();
    return db.stockTxns
      .map((t) => {
        const prod = db.products.find((p) => p.id === t.productId);
        return { ...t, productName: prod?.name || t.productId, unit: prod?.unit || "units" };
      })
      .filter((t) => {
        if (term && !t.productName.toLowerCase().includes(term) && !t.reference.toLowerCase().includes(term) && !t.supplier.toLowerCase().includes(term)) {
          return false;
        }
        if (txnTypeFilter !== "all" && t.type !== txnTypeFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [db.stockTxns, db.products, txnSearch, txnTypeFilter]);

  // Handle Record Purchase
  const handleRecordPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseProduct || purchaseQty <= 0) {
      toast.error("Please enter a valid product and quantity.");
      return;
    }

    addStockTxn({
      productId: purchaseProduct,
      date: selectedDate || today,
      type: "Purchase",
      qty: purchaseQty,
      amount: purchaseAmount,
      supplier: purchaseSupplier.trim(),
      reference: purchaseRef.trim(),
      notes: purchaseNotes.trim(),
      patientId: "",
    });

    const prod = db.products.find((p) => p.id === purchaseProduct);
    toast.success(`Recorded purchase: +${purchaseQty} ${prod?.unit || "units"} of ${prod?.name}`);
    setPurchaseOpen(false);
  };

  // Handle Record Sale / Usage
  const handleRecordSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleProduct || saleQty <= 0) {
      toast.error("Please enter a valid product and quantity.");
      return;
    }

    const onHand = currentStock(db, saleProduct);
    if (saleQty > onHand) {
      toast.warning(`Quantity (${saleQty}) exceeds current on-hand stock (${onHand}). Recording anyway.`);
    }

    addStockTxn({
      productId: saleProduct,
      date: selectedDate || today,
      type: saleType,
      qty: saleQty,
      amount: saleType === "Sale" ? saleAmount : 0,
      patientId: salePatientId.trim(),
      reference: saleRef.trim(),
      notes: saleNotes.trim(),
      supplier: "",
    });

    const prod = db.products.find((p) => p.id === saleProduct);
    toast.success(`Recorded ${saleType.toLowerCase()}: -${saleQty} ${prod?.unit || "units"} of ${prod?.name}`);
    setSaleOpen(false);
  };

  // Handle Save Min Stock
  const handleSaveMinStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;
    updateProduct(editProduct.id, { minStock: Number(newMinStock) });
    toast.success(`Updated threshold for ${editProduct.name} to ${newMinStock}`);
    setEditProduct(null);
  };

  // Export Daily Register CSV
  const handleExportRegister = () => {
    exportCSV(
      `stock-register-${selectedDate}.csv`,
      ["Product ID", "Product Name", "Min Stock", "Opening Stock", "Purchases", "Sales & Usage", "Closing Stock", "Status"],
      registerRows.map((r) => [r.productId, r.productName, r.minStock, r.opening, r.purchase, r.sale, r.closing, r.status]),
    );
  };

  // Export Txns CSV
  const handleExportTxns = () => {
    exportCSV(
      `stock-ledger-${today}.csv`,
      ["Txn ID", "Date", "Product", "Type", "Quantity", "Amount (INR)", "Supplier", "Patient ID", "Reference", "Notes"],
      sortedTxns.map((t) => [t.id, t.date, t.productName, t.type, t.qty, t.amount, t.supplier, t.patientId, t.reference, t.notes]),
    );
  };

  // Columns for Register
  const registerColumns: Column<StockDayRow>[] = [
    {
      key: "id",
      header: "Product Code",
      cell: (r) => <span className="id-chip font-bold">{r.productId}</span>,
      sortValue: (r) => r.productId,
    },
    {
      key: "name",
      header: "Medical Supply / Product",
      cell: (r) => <span className="font-semibold text-xs text-foreground">{r.productName}</span>,
      sortValue: (r) => r.productName,
    },
    {
      key: "min",
      header: "Min Threshold",
      align: "right",
      cell: (r) => <span className="num text-muted-foreground">{r.minStock}</span>,
      sortValue: (r) => r.minStock,
    },
    {
      key: "opening",
      header: "Opening Stock",
      align: "right",
      cell: (r) => <span className="num font-medium text-foreground">{r.opening}</span>,
      sortValue: (r) => r.opening,
    },
    {
      key: "purchase",
      header: "+ Purchases",
      align: "right",
      cell: (r) => (
        <span className={r.purchase > 0 ? "num font-semibold text-success" : "num text-muted-foreground"}>
          {r.purchase > 0 ? `+${r.purchase}` : "—"}
        </span>
      ),
      sortValue: (r) => r.purchase,
    },
    {
      key: "sale",
      header: "- Sales / Usage",
      align: "right",
      cell: (r) => (
        <span className={r.sale > 0 ? "num font-semibold text-danger" : "num text-muted-foreground"}>
          {r.sale > 0 ? `-${r.sale}` : "—"}
        </span>
      ),
      sortValue: (r) => r.sale,
    },
    {
      key: "closing",
      header: "Closing Balance",
      align: "right",
      cell: (r) => (
        <span
          className={`num text-sm font-bold ${
            r.closing <= 0 ? "text-danger" : r.closing <= r.minStock ? "text-warning" : "text-foreground"
          }`}
        >
          {r.closing}
        </span>
      ),
      sortValue: (r) => r.closing,
    },
    {
      key: "status",
      header: "Inventory Status",
      cell: (r) => <StockStatusBadge status={r.status} />,
      sortValue: (r) => r.status,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock & Medical Supplies Management"
        subtitle="Daily inventory registers, batch purchases, injections, and consumption audit."
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Stock Management" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setSaleOpen(true)}>
              <PackageMinus className="h-4 w-4" /> Record Usage / Sale
            </Button>
            <Button onClick={() => setPurchaseOpen(true)}>
              <PackagePlus className="h-4 w-4" /> Record Purchase
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Designated Supplies" value={stats.totalSKUs} icon={Boxes} />
        <StatCard label="Units On Hand" value={stats.totalItemsOnHand} icon={PackageCheck} tone="teal" />
        <StatCard
          label="Low Stock Alert"
          value={stats.lowStockCount}
          icon={AlertTriangle}
          tone={stats.lowStockCount > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Out of Stock"
          value={stats.outOfStockCount}
          icon={XCircle}
          tone={stats.outOfStockCount > 0 ? "danger" : "neutral"}
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="register">Daily Stock Register</TabsTrigger>
          <TabsTrigger value="ledger">Transactions Ledger ({db.stockTxns.length})</TabsTrigger>
          <TabsTrigger value="catalog">Supply Master & Min Levels</TabsTrigger>
        </TabsList>

        {/* Tab 1: Daily Stock Register */}
        <TabsContent value="register" className="panel overflow-hidden space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border p-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-foreground">Register Date:</span>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8 w-44 text-xs font-medium"
              />
              {selectedDate === today && (
                <span className="rounded bg-teal-soft px-2 py-0.5 text-[11px] font-semibold text-teal">
                  Today
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleExportRegister}>
                <Download className="h-3.5 w-3.5 mr-1" /> Export Register
              </Button>
            </div>
          </div>

          <DataTable
            rows={registerRows}
            columns={registerColumns}
            rowKey={(r) => r.productId}
            initialSort={{ key: "name", dir: "asc" }}
            emptyTitle="No inventory items found"
          />
        </TabsContent>

        {/* Tab 2: Stock Transactions Ledger */}
        <TabsContent value="ledger" className="panel overflow-hidden space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border p-3">
            <SearchInput
              value={txnSearch}
              onChange={setTxnSearch}
              placeholder="Search reference, supplier or product…"
              className="sm:w-80"
            />
            <div className="flex items-center gap-2">
              <Select value={txnTypeFilter} onValueChange={setTxnTypeFilter}>
                <SelectTrigger className="h-8 w-36 bg-surface text-xs">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Movements</SelectItem>
                  <SelectItem value="Purchase">Purchases (+)</SelectItem>
                  <SelectItem value="Sale">Sales (-)</SelectItem>
                  <SelectItem value="Usage">Clinical Usage (-)</SelectItem>
                  <SelectItem value="Opening">Opening</SelectItem>
                  <SelectItem value="Adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={handleExportTxns}>
                <Download className="h-3.5 w-3.5 mr-1" /> Export Ledger
              </Button>
            </div>
          </div>

          <div className="divide-y divide-border">
            {sortedTxns.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No stock transactions match the filter criteria.
              </div>
            ) : (
              sortedTxns.map((t) => {
                const isIncoming = t.type === "Purchase" || t.type === "Opening";
                return (
                  <div key={t.id} className="flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors text-xs">
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          isIncoming ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                        }`}
                      >
                        {isIncoming ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{t.productName}</span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                            {t.type}
                          </span>
                          <span className="id-chip">{t.id}</span>
                        </div>
                        <p className="mt-0.5 text-muted-foreground text-[11px]">
                          Date: {formatDate(t.date)}
                          {t.supplier && ` • Vendor: ${t.supplier}`}
                          {t.patientId && ` • Patient: ${t.patientId}`}
                          {t.reference && ` • Ref: ${t.reference}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`num font-bold text-sm block ${
                          isIncoming ? "text-success" : "text-danger"
                        }`}
                      >
                        {isIncoming ? `+${t.qty}` : `-${t.qty}`} {t.unit}
                      </span>
                      {t.amount > 0 && (
                        <span className="num text-[11px] text-muted-foreground block">
                          Total: {formatINR(t.amount)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Supply Master & Thresholds */}
        <TabsContent value="catalog" className="panel p-6 space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-semibold text-foreground">Designated Medical Supplies Master</h3>
            <p className="text-xs text-muted-foreground">
              Configure minimum threshold alerts for clinical vials, doses, and consumables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {db.products.map((p) => {
              const onHand = currentStock(db, p.id);
              const isLow = onHand <= p.minStock;
              return (
                <div key={p.id} className="rounded-lg border border-border p-4 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="id-chip font-bold">{p.id}</span>
                      <h4 className="text-sm font-bold text-foreground">{p.name}</h4>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        setEditProduct(p);
                        setNewMinStock(p.minStock);
                      }}
                      title="Edit Minimum Threshold"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Current On-Hand</span>
                      <span className={`num text-base font-bold ${isLow ? "text-danger" : "text-foreground"}`}>
                        {onHand} {p.unit}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[11px]">Min Alert Level</span>
                      <span className="num font-semibold text-foreground">
                        {p.minStock} {p.unit}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Record Purchase Dialog */}
      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleRecordPurchase}>
            <DialogHeader>
              <DialogTitle>Record Vendor Stock Purchase</DialogTitle>
              <DialogDescription>
                Add incoming stock delivery to increase on-hand inventory balances.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4 text-xs">
              <Field label="Medical Supply Product" required>
                <Select value={purchaseProduct} onValueChange={setPurchaseProduct}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {db.products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity Received" required>
                  <Input
                    type="number"
                    min={1}
                    value={purchaseQty || ""}
                    onChange={(e) => setPurchaseQty(Number(e.target.value))}
                    className="num"
                  />
                </Field>
                <Field label="Total Invoice Cost (₹)" required>
                  <Input
                    type="number"
                    min={0}
                    value={purchaseAmount || ""}
                    onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                    className="num"
                  />
                </Field>
              </div>

              <Field label="Distributor / Vendor Name">
                <Input
                  value={purchaseSupplier}
                  onChange={(e) => setPurchaseSupplier(e.target.value)}
                  placeholder="e.g. Medplus Distributors, Raipur"
                />
              </Field>

              <Field label="Vendor Invoice / Delivery Challan #">
                <Input
                  value={purchaseRef}
                  onChange={(e) => setPurchaseRef(e.target.value)}
                  placeholder="e.g. INV-2026-981"
                  className="font-mono"
                />
              </Field>

              <Field label="Notes / Batch No.">
                <Input
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  placeholder="Optional batch or expiry reference"
                />
              </Field>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPurchaseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <PackagePlus className="h-4 w-4 mr-1.5" /> Save Stock Purchase
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Usage / Sale Dialog */}
      <Dialog open={saleOpen} onOpenChange={setSaleOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleRecordSale}>
            <DialogHeader>
              <DialogTitle>Record Stock Usage or Direct Sale</DialogTitle>
              <DialogDescription>
                Deduct consumed medical supplies or customer injection sales from inventory.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4 text-xs">
              <Field label="Movement Type" required>
                <Select value={saleType} onValueChange={(v) => setSaleType(v as "Sale" | "Usage")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Usage">Clinical Usage (Deduction for Tests)</SelectItem>
                    <SelectItem value="Sale">Direct Sale to Patient</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Medical Supply Product" required>
                <Select value={saleProduct} onValueChange={setSaleProduct}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {db.products.map((p) => {
                      const onHand = currentStock(db, p.id);
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} (On-hand: {onHand} {p.unit})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity Deducted" required>
                  <Input
                    type="number"
                    min={1}
                    value={saleQty || ""}
                    onChange={(e) => setSaleQty(Number(e.target.value))}
                    className="num"
                  />
                </Field>
                {saleType === "Sale" ? (
                  <Field label="Sale Amount Collected (₹)">
                    <Input
                      type="number"
                      min={0}
                      value={saleAmount || ""}
                      onChange={(e) => setSaleAmount(Number(e.target.value))}
                      className="num font-semibold text-success"
                    />
                  </Field>
                ) : (
                  <div className="flex items-end pb-2 text-[11px] text-muted-foreground">
                    Internal lab consumption (₹0)
                  </div>
                )}
              </div>

              <Field label="Patient ID (Optional)">
                <Input
                  value={salePatientId}
                  onChange={(e) => setSalePatientId(e.target.value)}
                  placeholder="e.g. PAT-0001"
                  className="font-mono"
                />
              </Field>

              <Field label="Remarks / Prescribing Note">
                <Input
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  placeholder="e.g. Injection administered for patient"
                />
              </Field>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSaleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <PackageMinus className="h-4 w-4 mr-1.5" /> Record Deduction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Min Stock Dialog */}
      <Dialog open={!!editProduct} onOpenChange={(o) => !o && setEditProduct(null)}>
        <DialogContent className="sm:max-w-xs">
          <form onSubmit={handleSaveMinStock}>
            <DialogHeader>
              <DialogTitle>Edit Threshold Alert</DialogTitle>
              <DialogDescription>
                Set minimum stock on-hand before alert triggers for {editProduct?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 text-xs">
              <Field label={`Minimum Stock (${editProduct?.unit || "units"})`} required>
                <Input
                  type="number"
                  min={1}
                  value={newMinStock || ""}
                  onChange={(e) => setNewMinStock(Number(e.target.value))}
                  className="num font-bold"
                  autoFocus
                />
              </Field>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditProduct(null)}>
                Cancel
              </Button>
              <Button type="submit">Save Threshold</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
