# GNS Pathology Lab — Management System

A modern, standalone clinical pathology laboratory management system built with TanStack Start, React 19, Tailwind CSS, and TypeScript.

## Features

- **Diagnostic Dashboard (`/`)**: Executive overview with real-time KPI metrics, 7-day revenue/patient volume trends, low-stock warnings, and recent activity tables.
- **Patients Directory (`/patients`)**: Searchable patient database with age/gender tags, visit counts, outstanding balance tracking, and CSV export.
- **Patient Registration (`/patients/new`)**: Registration form with real-time duplicate mobile number detection and automatic age calculation.
- **Patient Account Profile (`/patients/$patientId`)**: 4 operational tabs (Overview, Billing History, Payment Ledger, Patient Details) and full profile editing.
- **Test Catalog Management (`/tests`)**: Category filtering, active/inactive soft toggling to preserve invoice integrity, and instant price updates.
- **New Billing Workspace (`/billing/new`)**: 5-step billing workflow with patient lookup, inline quick-registration, test selection, flexible discounts, additional charges, and payment collection.
- **Billing Records & Printable Receipt (`/billing` & `/billing/$billId`)**: Full invoice ledger, balance due collection modal, and official print-ready receipts with lab letterhead.
- **Stock Management (`/stock`)**: Inventory control, real-time daily stock register for supplies and injections, purchase recording, and consumption logs.
- **Reports & Daily E-Statement (`/reports` & `/reports/$reportId`)**: 7 comprehensive reports including the end-of-day executive E-Statement for auditing.
- **Settings (`/settings`) & Help Guide (`/help`)**: Lab profile customization, billing preferences, staff account management, demo data reset, FAQs, and keyboard shortcuts.

## Tech Stack

- **Framework**: TanStack Start (Full-stack React)
- **UI Library**: React 19, Tailwind CSS v4, Lucide React, Radix UI primitives
- **Charts**: Recharts
- **State Management**: Central reactive store with browser `localStorage` persistence and realistic seed data
- **Bundler / Dev Server**: Vite 8

## Getting Started

### Prerequisites

Node.js (v20+) and npm.

### Installation

```sh
npm install
```

### Development Server

Start the local development server at `http://localhost:8080`:

```sh
npm run dev
```

### Type Checking & Testing

```sh
# Type check with TypeScript
npx tsc --noEmit

# Run unit and integration tests
npm test
```

### Production Build

```sh
npm run build
npm run preview
```
