# System Architecture

This document describes the architectural patterns, layout mechanics, and server-side layers of the **SmartCookie** LMS.

## 🏗️ Overview

SmartCookie is structured as a high-performance, full-stack application. It features a modern frontend built on **React 18/19** (Vite-bundled) and styled with **Tailwind CSS v4**, backed by a resilient, type-safe **Express + TypeScript + Node.js** server layer. Persistent storage is managed via **Prisma ORM** connecting to a relational **MariaDB/SQL** database, in accordance with **ADR-0004**.

The diagram below outlines the full-stack system architecture, detailing the entry flow, visual templates, state machines, API routes, service abstraction layers, and relational storage.

```
+---------------------------------------------------------------------------------------------------------+
|                                              CLIENT SIDE (SPA)                                          |
|                                                                                                         |
|                                             +--------------------+                                      |
|                                             |      App.tsx       |                                      |
|                                             +--------------------+                                      |
|                                                       |                                                 |
|                                             +--------------------+                                      |
|                                             |     AppGate.tsx    | <--- Checks status/session           |
|                                             +--------------------+                                      |
|                                                       |                                                 |
|                 +-------------------------------------+-------------------------------------+           |
|                 | (Setup / Incomplete)                | (No Session)                        | (Success) |
|         +---------------+                     +---------------+                     +---------------+   |
|         |  SetupWizard  |                     |   Login.tsx   |                     |  Shell Layout |   |
|         +---------------+                     +---------------+                     +---------------+   |
|                 | (calls via API)                     | (calls via API)                     |           |
|                 v                                     v                                     v           |
|                 |                                     |                     +---------------+-----------+
|                 |                                     |                     |   Navbar.tsx  |Footer.tsx |
|                 |                                     |                     +---------------+-----------+
|                 |                                     |                     |  Active Tab   |           |
|                 |                                     |                     |  (Hash Synced)|           |
|                 |                                     |                     +---------------+-----------+
|                 |                                     |                     | - MyLessons   | - Catalog |
|                 |                                     |                     +---------------+-----------+
+-----------------+-------------------------------------+-------------------------------------+-----------+
|                 |                                     |                                     |           |
|  JSON API (Http)|                                     |                                     |           |
|                 v                                     v                                     v           |
+-----------------+-------------------------------------+-------------------------------------------------+
|                                              SERVER SIDE (EXPRESS)                                      |
|                                                                                                         |
|                 +-------------------------------------------------------------------------+             |
|                 |                          Vite Middleware Proxy                          |             |
|                 +-------------------------------------------------------------------------+             |
|                                                      |                                                  |
|                 +------------------------------------+------------------------------------+             |
|                 |                                                                         |             |
|                 v                                                                         v             |
|    +--------------------------+                                              +--------------------------+
|    |    Setup API Routes      |                                              |     Auth API Routes      |
|    |  (/api/setup/*)          |                                              |      (/api/auth/*)       |
|    +--------------------------+                                              +--------------------------+
|                 |                                                                         |             |
|                 v                                                                         v             |
|    +--------------------------+                                              +--------------------------+
|    |   SetupWizardService     |                                              | EmailPasswordAuthService |
|    +--------------------------+                                              +--------------------------+
|                 |                                                                         |             |
|                 |                                                                         v             |
|                 |                                                            +--------------------------+
|                 |                                                            |  EmailService (ADR-0005) |
|                 |                                                            +--------------------------+
|                 |                                                                         |             |
|                 +------------------------------------+------------------------------------+             |
|                                                      |                                                  |
|                                                      v                                                  |
|                                         +--------------------------+                                    |
|                                         |        Prisma Client     |                                    |
|                                         +--------------------------+                                    |
+------------------------------------------------------+--------------------------------------------------+
|                                                      |                                                  |
|                                                      v                                                  |
|                                         +--------------------------+                                    |
|                                         |    Relational Database   |                                    |
|                                         |  (users, companies, etc) |                                    |
|                                         +--------------------------+                                    |
+---------------------------------------------------------------------------------------------------------+
```

---

## 📂 Key Folders & Responsibilities

### Frontend Architecture
- **`src/shared/components/AppGate.tsx`**: System access orchestrator. Intercepts visual mounting, polls setup status, manages active user states, blocks access to child layouts, and forces redirects to Setup Wizard or Login screens.
- **`src/features/auth/pages/SetupWizard.tsx`**: Dynamic multi-step form that guides initial system setup. Step 1 collects superuser credentials (enforces database-level uniqueness and complexity rules); Step 2 registers company profiles.
- **`src/features/auth/pages/Login.tsx`**: High-density secure administrator form with redirect-back tracking.
- **`src/shared/components/layout/Shell.tsx`**: Layout envelope anchoring nav-bars, footers, and active content canvas.
- **`src/shared/components/layout/Navbar.tsx`**: Responsive header syncing client tabs with active URL fragments.

### Backend Architecture (ADR-0004)
- **`server/src/features/auth/routes/setup.routes.ts`**: Handles system status checks and initialization forms. Protected by a complete-check middleware that returns 403 Forbidden once the wizard is finalized.
- **`server/src/features/auth/routes/auth.routes.ts`**: Houses session controllers including secure login, active identity fetching, sign-out invalidation, and recovery email management.
- **`server/src/features/auth/services/setupWizard.service.ts`**: Coordinates transaction boundaries for establishing the system's root superuser and company profile.
- **`server/src/features/auth/services/auth.service.ts`**: Encapsulates credential extraction, validation, and secure cryptographic password matching.
- **`server/src/shared/email/email.service.ts`**: Handles transactional notification delivery as specified in **ADR-0005**.

---

## 🔄 Data Flow Patterns

- **Initialization Pipeline**: On load, `AppGate` triggers a non-blocking request to `GET /api/setup/status`. If status is `superuser` or `company`, the Setup Wizard takes over the layout. Once complete, users are guided through the secure credential form.
- **Session & Identity**: After successful credentials validation, the server creates a unique `sessions` database entry and returns an HTTP-Only signed cookie (`sid`). Subsequent requests pass this cookie to authorize sensitive state changes.
- **Profile Integrity Notification (ADR-0005)**: When changing an administrator's `recoveryEmail` via `PATCH /api/auth/recovery-email`, the system locks the change in the database and fires a security alert immediately to the *old* recovery address, mitigating account hijacking vectors.

---

## 🌐 Internationalization (i18n)

SmartCookie includes a fully configured internationalization engine implemented under `src/shared/i18n/`.

- **Framework**: `i18next` and `react-i18next` manage runtime state, hook-based translation lookup, and resource caching.
- **Detection & Persistence**: Language selection defaults to browser `navigator` and is cached/retrieved via browser `localStorage` dynamically through `i18next-browser-languagedetector`.
- **Namespaces**: Localized keys are isolated within functional domains. We use a single global namespace `common` (located in `src/shared/i18n/locales/en/common.json`) to store global UI components (navigation, brand elements, footer labels), which can be scaled per-feature later.
- **Logical Tailwind Properties**: To facilitate future Right-to-Left (RTL) language extensions without costly layout rewrites, we strongly encourage logical styling classes (e.g., `start-0`, `end-0`, `ms-2`, `pe-4`) instead of absolute physical properties (`left-0`, `right-0`, `ml-2`, `pr-4`) for all new UI elements.
