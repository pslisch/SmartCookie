# Authentication & System Setup Wizard

This directory contains the client-side user interface and logic for the Multi-Tenant/Enterprise System Setup Wizard and Security Authentication flows.

## Structure

- **`pages/SetupWizard.tsx`**: Multi-step workspace initialization wizard:
  - **Step 1: Superuser Creation**: Configures the root system administrator profile.
  - **Step 2: Company Setup**: Provisions the primary root enterprise identity.
  - Fully dynamic step inference driven by the database state via `/api/setup/status`.
- **`AppGate.tsx`**: Orchestrator and state machine of application entry. Blocks unauthorized API access, requires valid cookies, prevents session leaks, and verifies the wizard is complete before rendering children layouts.

## Features

- **Double-Submit CSRF Protection**: Fully wired to state-changing operations.
- **Fixed-Attempt Rate Limiting**: Mitigates brute-force attacks against system credentials.
- **i18n Translation Binding**: 100% of the text and labels are safely wrapped in translations.
- **Tailwind CSS & Motion Animations**: Seamless transitions between wizard states with elegant layouts.
