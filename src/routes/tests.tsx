import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Download,
  Edit2,
  FileSpreadsheet,
  Filter,
  FlaskConical,
  IndianRupee,
  Layers,
  Plus,
  Power,
  Search,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Field } from "@/components/common/Field";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard } from "@/components/common/StatCard";
import { ActiveBadge } from "@/components/common/StatusBadge";
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
import { Switch } from "@/components/ui/switch";
import { exportCSV } from "@/lib/lab/export";
import { formatINR, todayKey } from "@/lib/lab/format";
import { useLab } from "@/lib/lab/store";
import { TEST_CATEGORIES, type LabTest, type TestCategory } from "@/lib/lab/types";

export const Route = createFileRoute("/tests")({
  head: () => ({
    meta: [
      { title: "Test Catalog — GNS Pathology Lab" },
      { name: "description", content: "Manage laboratory tests, categories, pricing, and active status." },
      { property: "og:title", content: "Test Catalog — GNS Pathology Lab" },
      { property: "og:description", content: "Manage laboratory tests, categories, pricing, and active status." },
    ],
  }),
  component: TestCatalogPage,
});

interface TestFormData {
  name: string;
  category: TestCategory;
  price: number;
  active: boolean;
}

const DEFAULT_FORM: TestFormData = {
  name: "",
  category: "Hematology",
  price: 250,
  active: true,
};

function TestCatalogPage() {
  const { db, addTest, updateTest } = useLab();
  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [formData, setFormData] = useState<TestFormData>(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState<{ name?: string; price?: string }>({});

  // Confirm deactivate/reactivate
  const [confirmToggleTest, setConfirmToggleTest] = useState<LabTest | null>(null);

  const tests = db.tests;

  // Stats
  const stats = useMemo(() => {
    const total = tests.length;
    const active = tests.filter((t) => t.active).length;
    const inactive = total - active;
    const avgPrice = total > 0 ? Math.round(tests.reduce((s, t) => s + t.price, 0) / total) : 0;
    const categoriesCount = new Set(tests.map((t) => t.category)).size;

    return { total, active, inactive, avgPrice, categoriesCount };
  }, [tests]);

  // Filtered rows
  const filteredTests = useMemo(() => {
    const query = q.trim().toLowerCase();
    return tests.filter((t) => {
      if (query && !t.name.toLowerCase().includes(query) && !t.id.toLowerCase().includes(query)) {
        return false;
      }
      if (selectedCategory !== "all" && t.category !== selectedCategory) {
        return false;
      }
      if (statusFilter === "active" && !t.active) return false;
      if (statusFilter === "inactive" && t.active) return false;
      return true;
    });
  }, [tests, q, selectedCategory, statusFilter]);

  const handleOpenAdd = () => {
    setEditingTest(null);
    setFormData(DEFAULT_FORM);
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleOpenEdit = (test: LabTest) => {
    setEditingTest(test);
    setFormData({
      name: test.name,
      category: test.category,
      price: test.price,
      active: test.active,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const validateForm = () => {
    const errors: { name?: string; price?: string } = {};
    if (!formData.name.trim()) {
      errors.name = "Test name is required";
    }
    if (formData.price < 0 || isNaN(formData.price)) {
      errors.price = "Price must be a positive number";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingTest) {
      updateTest(editingTest.id, {
        name: formData.name.trim(),
        category: formData.category,
        price: Number(formData.price),
        active: formData.active,
      });
      toast.success(`Updated ${formData.name}`);
    } else {
      const created = addTest({
        name: formData.name.trim(),
        category: formData.category,
        price: Number(formData.price),
        active: formData.active,
      });
      toast.success(`Added ${created.name} (${created.id})`);
    }
    setDialogOpen(false);
  };

  const handleConfirmToggle = () => {
    if (!confirmToggleTest) return;
    const nextActive = !confirmToggleTest.active;
    updateTest(confirmToggleTest.id, {
      name: confirmToggleTest.name,
      category: confirmToggleTest.category,
      price: confirmToggleTest.price,
      active: nextActive,
    });
    toast.success(`${confirmToggleTest.name} is now ${nextActive ? "Active" : "Inactive"}`);
    setConfirmToggleTest(null);
  };

  const handleExport = () => {
    exportCSV(
      `test-catalog-${todayKey()}.csv`,
      ["Test ID", "Test Name", "Category", "Price (INR)", "Status"],
      filteredTests.map((t) => [t.id, t.name, t.category, t.price, t.active ? "Active" : "Inactive"]),
    );
  };

  const columns: Column<LabTest>[] = [
    {
      key: "id",
      header: "Test Code",
      cell: (t) => <span className="id-chip font-bold">{t.id}</span>,
      sortValue: (t) => t.id,
    },
    {
      key: "name",
      header: "Test Name",
      cell: (t) => (
        <span className={`font-medium ${t.active ? "text-foreground" : "text-muted-foreground line-through"}`}>
          {t.name}
        </span>
      ),
      sortValue: (t) => t.name,
    },
    {
      key: "category",
      header: "Category",
      cell: (t) => (
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
          {t.category}
        </span>
      ),
      sortValue: (t) => t.category,
    },
    {
      key: "price",
      header: "Unit Price",
      align: "right",
      cell: (t) => <span className="num font-semibold text-foreground">{formatINR(t.price)}</span>,
      sortValue: (t) => t.price,
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => <ActiveBadge active={t.active} />,
      sortValue: (t) => (t.active ? 1 : 0),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (t) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="icon-sm" variant="ghost" title="Edit Test" onClick={() => handleOpenEdit(t)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            title={t.active ? "Deactivate Test" : "Reactivate Test"}
            className={t.active ? "text-muted-foreground hover:text-danger" : "text-muted-foreground hover:text-success"}
            onClick={() => setConfirmToggleTest(t)}
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Catalog"
        subtitle="Master directory of laboratory tests, pricing tiers, and active status."
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Test Catalog" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={handleOpenAdd}>
              <Plus className="h-4 w-4" /> Add Test
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Total Tests" value={stats.total} icon={FlaskConical} />
        <StatCard label="Active Tests" value={stats.active} icon={CheckCircle2} tone="success" />
        <StatCard label="Inactive Tests" value={stats.inactive} icon={XCircle} tone="neutral" />
        <StatCard label="Categories" value={stats.categoriesCount} icon={Layers} tone="teal" />
        <StatCard
          label="Average Price"
          value={formatINR(stats.avgPrice)}
          icon={IndianRupee}
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* Filter and Table Panel */}
      <div className="panel overflow-hidden">
        {/* Search & Category Pills */}
        <div className="border-b border-border p-3 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search by test name or code (e.g. CBC, TSH, TST-001)…"
              className="sm:w-80"
            />
            <div className="flex items-center gap-2 sm:ml-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[130px] bg-surface">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="inactive">Inactive only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              All Categories ({tests.length})
            </button>
            {TEST_CATEGORIES.map((cat) => {
              const count = tests.filter((t) => t.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Test List Table */}
        <DataTable
          rows={filteredTests}
          columns={columns}
          rowKey={(t) => t.id}
          initialSort={{ key: "id", dir: "asc" }}
          emptyTitle="No laboratory tests found"
          emptyDescription="Try selecting a different category or clearing the search query."
          emptyAction={
            <Button size="sm" onClick={handleOpenAdd}>
              <Plus className="h-4 w-4" /> Add Test
            </Button>
          }
        />
      </div>

      {/* Add / Edit Test Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingTest ? `Edit Test — ${editingTest.id}` : "Add New Laboratory Test"}</DialogTitle>
              <DialogDescription>
                {editingTest
                  ? "Update test name, category and price. Historical bills will preserve original prices."
                  : "Enter details for the new diagnostic test."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Field label="Test Name" htmlFor="test-name" required error={formErrors.name}>
                <Input
                  id="test-name"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Complete Blood Count (CBC)"
                  autoFocus
                />
              </Field>

              <Field label="Category" required>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData((p) => ({ ...p, category: val as TestCategory }))}
                >
                  <SelectTrigger id="test-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEST_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Standard Price (₹)" htmlFor="test-price" required error={formErrors.price}>
                <div className="flex">
                  <span className="flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="test-price"
                    type="number"
                    min={0}
                    step={10}
                    className="num rounded-l-none"
                    value={formData.price}
                    onChange={(e) => setFormData((p) => ({ ...p, price: Number(e.target.value) }))}
                  />
                </div>
              </Field>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <span className="text-xs font-medium text-foreground block">Active for Billing</span>
                  <span className="text-[11px] text-muted-foreground block">
                    Inactive tests are hidden from new billing order selection
                  </span>
                </div>
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData((p) => ({ ...p, active: checked }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingTest ? "Save Changes" : "Create Test"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Deactivate / Reactivate */}
      <ConfirmDialog
        open={!!confirmToggleTest}
        onOpenChange={(o) => {
          if (!o) setConfirmToggleTest(null);
        }}
        title={confirmToggleTest?.active ? `Deactivate ${confirmToggleTest.name}?` : `Reactivate ${confirmToggleTest?.name}?`}
        description={
          confirmToggleTest?.active
            ? "Deactivating will hide this test from future billings. Historical bills and records will remain completely unchanged."
            : "Reactivating will restore this test in the billing workspace."
        }
        confirmLabel={confirmToggleTest?.active ? "Deactivate" : "Reactivate"}
        destructive={Boolean(confirmToggleTest?.active)}
        onConfirm={handleConfirmToggle}
      />
    </div>
  );
}
