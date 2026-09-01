# AI Project Map

This document serves as the top-level directory map and semantic index of the **SmartCookie** repository for AI coding assistants. It provides structured insights into directory purposes, system dependencies, and documentation hierarchy.

---

## 📂 Repository Directory Map

### 1. Application Core
- **`src/`**: Parent directory containing all client-side UI files, features, and runtime resources.
- **`src/main.tsx`**: Entry point where React renders inside the HTML context.
- **`src/App.tsx`**: Main visual orchestrator coordinating layout view states, navigation tabs, and permissions.

### 2. Feature Modules (Client)
- **`src/features/`**: Directory for modular business logic and visual features.
  - **`src/features/auth/`**: Authentication pages (Login, SetupWizard, AcceptInvitation, ForgotPassword, ResetPassword, ConfirmEmail).
  - **`src/features/lessons/`**: Student hub (My Lessons) displaying assigned and self-assigned courses/lessons.
  - **`src/features/catalog/`**: Curriculum course catalog with searching, filtering, and self-assignment capabilities.
  - **`src/features/management/`**: Central administrative oversight dashboard coordinating access to system modules.
  - **`src/features/organization/`**: Organization Unit tree explorer, Learning Groups, Users tab, and Bulk Import Wizard.
  - **`src/features/rbac/`**: Role Management matrix, inheritance controls, and System Settings.
  - **`src/features/assignments/`**: Lesson/Course assignment creation, targeting, reports, and instance status tracking.
  - **`src/features/content/`**: SCORM Content Library, package upload wizard, and SCORM 1.2 runtime player bridge.
  - **`src/features/profiles/`**: Full User Profile, custom Field Builder, notification preferences, and MFA security tabs.
  - **`src/features/identity/`**: Microsoft Entra ID connection wizard, sync status, and group mapping controls.

### 3. Shared Layer (Client)
- **`src/shared/`**: Resources, components, types, and hooks shared across multiple features.
  - **`src/shared/components/layout/`**: Shell viewport wrapper, responsive Navbar, sticky Footer, and LanguageSwitcher.
  - **`src/shared/components/`**: AppGate auth state machine, PreviewBanner, RequiredFieldReminder, ProfileFieldInput, QuickProfile.
  - **`src/shared/contexts/`**: PreviewContext for cosmetic role previewing.
  - **`src/shared/hooks/`**: `usePermission` for RBAC permission checks.
  - **`src/shared/i18n/`**: Internationalization configs and multi-language translation dictionaries.
  - **`src/shared/types/`**: Common TypeScript definitions, navigation tab enums, and system types.

### 4. Backend Server Core
- **`server/`**: Full-stack backend layer containing Express + TypeScript server, middleware, services, and database integration.
  - **`server/src/index.ts`**: Express application entrypoint, middleware configuration, and API route mounting.
  - **`server/src/features/`**: Modular backend feature routes, controllers, services, and permission declarations (`auth`, `rbac`, `organization`, `assignments`, `content`, `profiles`, `identity`, `preview`).
  - **`server/src/shared/`**: Cross-cutting backend infrastructure:
    - **`server/src/shared/audit/`**: Audit logging service.
    - **`server/src/shared/crypto/`**: AES-256-GCM encryption utilities for credentials and secrets.
    - **`server/src/shared/email/`**: Transactional email service supporting tenant SMTP and fallback configs.
    - **`server/src/shared/middleware/`**: Auth session verification, CSRF validation, permission checks, rate limiters, and error handling.
    - **`server/src/shared/permissions/`**: Permission registry and database synchronization.
    - **`server/src/shared/scheduler/`**: Background scheduled task runner for soft-delete purges, group expirations, and email reminders.
    - **`server/src/shared/token/`**: Secure SHA-256 token generation and validation.
  - **`server/prisma/`**: Prisma schema (`schema.prisma`), migrations, and seed scripts (`seed.ts`, `profileFieldsSeed.ts`).

### 5. Developer Documentation
- **`docs/`**: Curated markdown guidelines created for human developers (Constitution, Coding Standards, Architecture, UI Guidelines).

### 6. AI Project Metadata
- **`.ai/`**: Hidden registry and indexing home containing machine-parsable metadata index lists, architecture decision records (`decisions/`), and standard coding templates (`templates/`).

---

## 🔗 The Docs and AI Metadata Paradigm

The workspace splits general documentation and technical indices to optimize developer reading speed and AI agent scanning accuracy:

```
                  +--------------------------------+
                  |       SmartCookie Root         |
                  +--------------------------------+
                                  |
         +------------------------+------------------------+
         |                                                 |
+------------------+                              +------------------+
|      docs/       |                              |       .ai/       |
| (Developer Docs) |                              |   (AI Metadata)  |
+------------------+                              +------------------+
| - Guidelines     |                              | - Indexes        |
| - Coding Rules   |                              | - Component Maps |
| - Visual Design  |                              | - API Specs      |
| - Team Workflows |                              | - Code Templates |
+------------------+                              +------------------+
```

- **`docs/`**: Curated, high-level developer specifications. These document the **"Why"** and **"How"** behind our engineering decisions, serving as the system's human constitution.
- **`.ai/`**: High-density, comprehensive indices and specs detailing **"What"** exists in the repo. These index files provide exact mappings of components, props, endpoints, and events for precise, high-speed automated reading.
