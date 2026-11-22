import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle,
  CreditCard,
  FileText,
  HelpCircle,
  Keyboard,
  Layers,
  LifeBuoy,
  Mail,
  Package,
  Phone,
  PlusCircle,
  ReceiptText,
  Search,
  Sparkles,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & Operations Guide — GNS Pathology Lab" },
      { name: "description", content: "Complete user manual, workflows, FAQs and keyboard shortcuts for laboratory staff." },
      { property: "og:title", content: "Help & Operations Guide — GNS Pathology Lab" },
      { property: "og:description", content: "Complete user manual, workflows, FAQs and keyboard shortcuts for laboratory staff." },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Help & Operations Guide"
        subtitle="Standard operating procedures, staff user manual, keyboard shortcuts, and FAQs."
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Help & Support" }]}
      />

      {/* Quick Start Workflow Cards */}
      <div>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
          Core Operational Workflows
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="panel p-5 space-y-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary font-bold text-sm">
              1
            </span>
            <h4 className="text-sm font-bold text-foreground">Patient Registration</h4>
            <p className="text-xs text-muted-foreground">
              Register patients with automatic 10-digit mobile duplication checks. If the number exists, staff is
              prompted to reuse the existing account.
            </p>
            <Button size="sm" variant="soft" className="mt-2 w-full" asChild>
              <Link to="/patients/new">Register Patient →</Link>
            </Button>
          </div>

          <div className="panel p-5 space-y-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-soft text-teal font-bold text-sm">
              2
            </span>
            <h4 className="text-sm font-bold text-foreground">Billing & Diagnostic Invoicing</h4>
            <p className="text-xs text-muted-foreground">
              Pick patient, select tests from catalog, apply fixed or percentage discounts, and record advance or full
              payments (Cash/UPI/Card).
            </p>
            <Button size="sm" variant="soft" className="mt-2 w-full" asChild>
              <Link to="/billing/new">Open Billing Desk →</Link>
            </Button>
          </div>

          <div className="panel p-5 space-y-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-soft text-success font-bold text-sm">
              3
            </span>
            <h4 className="text-sm font-bold text-foreground">End-of-Day E-Statement</h4>
            <p className="text-xs text-muted-foreground">
              Generate the daily audit statement summarizing total billing, cash/digital collections, discounts, and
              test counts for owner reconciliation.
            </p>
            <Button size="sm" variant="soft" className="mt-2 w-full" asChild>
              <Link to="/reports/$reportId" params={{ reportId: "daily-statement" }}>
                Generate E-Statement →
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: FAQs Accordion */}
        <div className="lg:col-span-2 space-y-4">
          <div className="panel p-6">
            <h3 className="text-base font-semibold text-foreground mb-1">Frequently Asked Questions</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Answers to common operational inquiries regarding billing, stock, and receipts.
            </p>

            <Accordion type="single" collapsible className="w-full text-xs">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-xs font-semibold text-foreground">
                  How does the system ensure past bills don't change when test prices change?
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                  Every bill generated creates an immutable snapshot of test names and unit prices at that exact
                  moment. When you edit the test catalog or update prices in the Test Catalog, historical bills retain
                  their original snapshot values forever. Furthermore, tests can only be deactivated, never deleted.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-xs font-semibold text-foreground">
                  How do I collect pending dues from a patient who previously paid partially?
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                  Navigate to the patient's account page (<code>/patients/$patientId</code>) or search the invoice in
                  Billing Records (<code>/billing</code>). Open the bill receipt and click the "Collect Due" button. You
                  can enter the collected amount, select the payment mode (Cash, UPI, Card), and enter the reference ID.
                  The outstanding balance will update automatically across all ledgers.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-xs font-semibold text-foreground">
                  How does the Daily Stock Register calculate balances?
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                  The stock balance for any given date is calculated strictly derived from chronological transaction
                  logs: Opening Stock + Day's Purchases - Day's Clinical Usage/Sales = Closing Stock. When closing stock
                  drops to or below the minimum threshold, low-stock warnings are surfaced across the dashboard.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-xs font-semibold text-foreground">
                  Can I print receipts on paper or export data to Microsoft Excel?
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                  Yes! All invoices, daily statements, and reports feature a dedicated "Print Document" action. The
                  system applies print CSS that automatically hides the sidebar, action buttons, and header, producing
                  a clean, monochrome, professional paper receipt. Additionally, all patient registers, bills, stock
                  logs, and reports have a 1-click "Export CSV" feature.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Right 1 Col: Keyboard Shortcuts & Support Info */}
        <div className="space-y-6">
          <div className="panel p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Keyboard className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Global Search</span>
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                  ⌘K / Ctrl+K
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Print Active Receipt</span>
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                  ⌘P / Ctrl+P
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Close Modal Dialog</span>
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                  Esc
                </kbd>
              </div>
            </div>
          </div>

          <div className="panel p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <LifeBuoy className="h-4 w-4 text-teal" />
              <h3 className="text-sm font-semibold text-foreground">Lab Technical Assistance</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              For system configuration, printer setup, or questions regarding the laboratory software:
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Phone className="h-3.5 w-3.5 text-primary" />
                <span>+91 771 400 2210 (Support Desk)</span>
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span>support@gnspathlab.in</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
