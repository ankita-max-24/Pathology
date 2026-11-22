import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Lock,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  ShieldAlert,
  Sliders,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Field } from "@/components/common/Field";
import { PageHeader } from "@/components/common/PageHeader";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useLab, type UserInput } from "@/lib/lab/store";
import { PAYMENT_MODES, USER_ROLES, type AppUser, type LabSettings, type PaymentMode, type UserRole } from "@/lib/lab/types";

export const Route = createFileRoute("/settings")({
  validateSearch: (s: Record<string, unknown>): { tab?: string } =>
    typeof s["tab"] === "string" ? { tab: s["tab"] } : {},
  head: () => ({
    meta: [
      { title: "Settings — GNS Pathology Lab" },
      { name: "description", content: "Laboratory profile, receipts, billing preferences and users." },
      { property: "og:title", content: "Settings — GNS Pathology Lab" },
      { property: "og:description", content: "Laboratory profile, receipts, billing preferences and users." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { tab } = Route.useSearch();
  const { db, updateSettings, addUser, updateUser, resetDemoData } = useLab();

  const [activeTab, setActiveTab] = useState<string>(tab || "profile");
  const [settingsForm, setSettingsForm] = useState<LabSettings>({ ...db.settings });

  // User management dialog
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userForm, setUserForm] = useState<UserInput>({
    name: "",
    userId: "",
    role: "Receptionist",
    active: true,
  });

  // Reset dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(settingsForm);
    toast.success("Laboratory profile and billing settings saved!");
  };

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserForm({ name: "", userId: "", role: "Receptionist", active: true });
    setUserDialogOpen(true);
  };

  const handleOpenEditUser = (user: AppUser) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      userId: user.userId,
      role: user.role,
      active: user.active,
    });
    setUserDialogOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.userId.trim()) {
      toast.error("Please fill in the user name and user ID.");
      return;
    }

    if (editingUser) {
      updateUser(editingUser.id, userForm);
      toast.success(`Updated user ${userForm.name}`);
    } else {
      addUser(userForm);
      toast.success(`Created staff account for ${userForm.name}`);
    }
    setUserDialogOpen(false);
  };

  const handleToggleUserActive = (user: AppUser) => {
    updateUser(user.id, {
      name: user.name,
      userId: user.userId,
      role: user.role,
      active: !user.active,
    });
    toast.success(`${user.name} is now ${!user.active ? "Active" : "Disabled"}`);
  };

  const handleResetData = () => {
    resetDemoData();
    setSettingsForm({ ...db.settings });
    toast.success("Demonstration database reset to default seed data.");
    setResetDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & System Configuration"
        subtitle="Manage official lab letterhead, receipt formatting, billing controls, and user access."
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Settings" }]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="profile">Lab Profile & Letterhead</TabsTrigger>
          <TabsTrigger value="billing">Billing Preferences</TabsTrigger>
          <TabsTrigger value="users">Staff & Role Access ({db.users.length})</TabsTrigger>
          <TabsTrigger value="system">System & Data</TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile & Letterhead */}
        <TabsContent value="profile" className="panel p-6">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">Laboratory Identification</h3>
              <p className="text-xs text-muted-foreground">
                These details appear on official test receipts, reports, and daily e-statements.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <Field label="Laboratory Legal Name" required className="sm:col-span-2">
                <Input
                  value={settingsForm.labName}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, labName: e.target.value }))}
                />
              </Field>

              <Field label="Tagline / Header Subtitle" className="sm:col-span-2">
                <Input
                  value={settingsForm.tagline}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, tagline: e.target.value }))}
                />
              </Field>

              <Field label="Clinic / Lab Street Address" className="sm:col-span-2">
                <Input
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, address: e.target.value }))}
                />
              </Field>

              <Field label="City">
                <Input
                  value={settingsForm.city}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, city: e.target.value }))}
                />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="State">
                  <Input
                    value={settingsForm.state}
                    onChange={(e) => setSettingsForm((p) => ({ ...p, state: e.target.value }))}
                  />
                </Field>
                <Field label="PIN Code">
                  <Input
                    value={settingsForm.pin}
                    onChange={(e) => setSettingsForm((p) => ({ ...p, pin: e.target.value }))}
                  />
                </Field>
              </div>

              <Field label="Phone / Helpline">
                <Input
                  value={settingsForm.phone}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </Field>

              <Field label="Official Email Address">
                <Input
                  value={settingsForm.email}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, email: e.target.value }))}
                />
              </Field>

              <Field label="Clinical Registration Number">
                <Input
                  value={settingsForm.registrationNo}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, registrationNo: e.target.value }))}
                />
              </Field>

              <Field label="GSTIN Identification">
                <Input
                  value={settingsForm.gstin}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, gstin: e.target.value }))}
                />
              </Field>

              <Field label="Receipt Disclaimer / Footer Note" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  value={settingsForm.receiptFooter}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, receiptFooter: e.target.value }))}
                />
              </Field>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button type="submit">
                <Save className="h-4 w-4 mr-1.5" /> Save Profile Details
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Tab 2: Billing Preferences */}
        <TabsContent value="billing" className="panel p-6">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">Billing & Cashier Controls</h3>
              <p className="text-xs text-muted-foreground">
                Set billing rules, discount workflows, and receipt printing switches.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <span className="font-semibold text-foreground block">Default Payment Mode</span>
                  <span className="text-muted-foreground text-[11px] block">
                    Pre-selected payment method when collecting money during billing
                  </span>
                </div>
                <Select
                  value={settingsForm.defaultPaymentMode}
                  onValueChange={(v) => setSettingsForm((p) => ({ ...p, defaultPaymentMode: v as PaymentMode }))}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <span className="font-semibold text-foreground block">Show Referring Doctor on Invoices</span>
                  <span className="text-muted-foreground text-[11px] block">
                    Include referring physician name and consultation reference on printed receipts
                  </span>
                </div>
                <Switch
                  checked={settingsForm.showReferringDoctor}
                  onCheckedChange={(c) => setSettingsForm((p) => ({ ...p, showReferringDoctor: c }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <span className="font-semibold text-foreground block">Allow Duplicate Tests on Single Bill</span>
                  <span className="text-muted-foreground text-[11px] block">
                    Permit adding the same diagnostic test multiple times (e.g. repeated Fasting Glucose)
                  </span>
                </div>
                <Switch
                  checked={settingsForm.allowDuplicateTests}
                  onCheckedChange={(c) => setSettingsForm((p) => ({ ...p, allowDuplicateTests: c }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <span className="font-semibold text-foreground block">Default Minimum Stock Warning Threshold</span>
                  <span className="text-muted-foreground text-[11px] block">
                    Standard safety threshold for newly registered medical consumables
                  </span>
                </div>
                <Input
                  type="number"
                  min={1}
                  className="w-24 num"
                  value={settingsForm.defaultMinStock}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, defaultMinStock: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button type="submit">
                <Save className="h-4 w-4 mr-1.5" /> Save Preferences
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Tab 3: User Management */}
        <TabsContent value="users" className="panel p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Laboratory Staff Accounts</h3>
              <p className="text-xs text-muted-foreground">
                Manage operator logins, roles and permissions for receptionists and technicians.
              </p>
            </div>
            <Button size="sm" onClick={handleOpenAddUser}>
              <UserPlus className="h-4 w-4 mr-1.5" /> Add Staff Member
            </Button>
          </div>

          <div className="divide-y divide-border text-xs">
            {db.users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft font-bold text-primary">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{u.name}</span>
                      <span className="id-chip">{u.userId}</span>
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                        {u.role}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">ID: {u.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                      u.active ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {u.active ? "Active" : "Disabled"}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => handleOpenEditUser(u)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={u.active ? "text-danger" : "text-success"}
                    onClick={() => handleToggleUserActive(u)}
                  >
                    {u.active ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tab 4: System & Danger Zone */}
        <TabsContent value="system" className="panel p-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-foreground">System Storage & Reset</h3>
            <p className="text-xs text-muted-foreground">
              Local database management and prototype demonstration reset options.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs space-y-2">
            <h4 className="font-semibold text-foreground">Storage Engine Status</h4>
            <p className="text-muted-foreground">
              All clinical records, patients, bills, payments, and stock movements are stored client-side in browser{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary">localStorage</code>.
            </p>
            <p className="text-muted-foreground">Database Schema Version: {db.version}</p>
          </div>

          <div className="rounded-lg border border-danger/40 bg-danger-soft/20 p-5 space-y-3">
            <div className="flex items-center gap-2 text-danger">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h4 className="font-semibold text-sm">Danger Zone: Reset Demo Database</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Resetting will clear all newly added patients, test orders, and stock updates, and restore the default
              sample data (12 patients, 20 test catalog entries, 7 medical supplies, and sample transactions).
            </p>
            <Button variant="destructive" size="sm" onClick={() => setResetDialogOpen(true)}>
              <RotateCcw className="h-4 w-4 mr-1.5" /> Reset Demo Data to Defaults
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add / Edit User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveUser}>
            <DialogHeader>
              <DialogTitle>{editingUser ? `Edit Staff — ${editingUser.name}` : "Create Staff Account"}</DialogTitle>
              <DialogDescription>
                Configure user profile and assign role privileges.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <Field label="Full Name" required>
                <Input
                  value={userForm.name}
                  onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Dr. Rajesh Agrawal"
                  autoFocus
                />
              </Field>

              <Field label="Username / Staff ID" required>
                <Input
                  value={userForm.userId}
                  onChange={(e) => setUserForm((p) => ({ ...p, userId: e.target.value }))}
                  placeholder="e.g. rajesh.lab"
                  className="font-mono"
                />
              </Field>

              <Field label="Role Designation" required>
                <Select
                  value={userForm.role}
                  onValueChange={(v) => setUserForm((p) => ({ ...p, role: v as UserRole }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="flex items-center justify-between rounded border border-border p-3">
                <span className="font-medium text-foreground">Active Account</span>
                <Switch
                  checked={userForm.active}
                  onCheckedChange={(c) => setUserForm((p) => ({ ...p, active: c }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingUser ? "Save User" : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Reset Dialog */}
      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={(o) => {
          if (!o) setResetDialogOpen(false);
        }}
        title="Reset Demo Database to Seed Defaults?"
        description="This action will replace all current database records with the initial demonstration state. This cannot be undone."
        confirmLabel="Reset Everything"
        destructive={true}
        onConfirm={handleResetData}
      />
    </div>
  );
}
