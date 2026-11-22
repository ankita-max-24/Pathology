# GNS Pathology Lab — Project Architecture & Rules

This project is an independent, self-contained web application with zero external cloud dependencies.

## Project Rules

- **Frontend-only prototype**: All data lives in `src/lib/lab/store.tsx` (React context, persisted to `localStorage`, seeded from `src/lib/lab/seed.ts`); never add a backend or fetch for app data.
- **Data Integrity**: Read data via `useLab()`; derived numbers (paid, pending, status, patient totals, stock balances) always come from `src/lib/lab/selectors.ts` / `calculations.ts`, never stored or hardcoded. Reports and accounts stay consistent with bills, payments, and stock transactions.
- **Historical Snapshots**: Bills snapshot test name and unit price at creation; catalog edits never touch history, and tests are deactivated rather than deleted. Historical bills must not change.
- **Client Hydration**: The store renders a loading fallback until `localStorage` is read on the client, so pages can use browser data freely without hydration guards.
- **Print Optimization**: App shell (sidebar + header) lives in `__root.tsx`; it and page action bars carry `print:hidden` so receipts and statements print clean.
- **Design System & Shared UI**: `components/common/*` (PageHeader with breadcrumbs, DataTable with sort/pagination, DateRangeFilter, StatCard, StatusBadge, Field/Panel, ConfirmDialog, EmptyState). Use semantic tokens from `src/styles.css` (primary, teal, success, warning, danger + `-soft`), `panel`/`num`/`id-chip`/`eyebrow` utilities; no raw color classes.
