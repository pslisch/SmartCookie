# Feature Index

This index acts as the central registry of all functional capabilities within the application. AI agents must keep this list in sync with every introduced feature block.

---

## 🏗️ Feature Matrix

Every logged feature should eventually document:
- **Description**: High-level explanation of the business value and goal.
- **Components**: Reusable blocks used in this feature.
- **Pages**: Target visual views coordinating the component render.
- **Services**: Classes or functions powering the feature background.
- **APIs**: Rest endpoints or GraphQL queries executed.
- **Database**: Database tables or collection paths referenced.
- **Permissions**: Roles and authentication contexts needed.
- **Routes**: Associated URL routes or layout tab keys.
- **Events**: Events emitted or listened to by this module.
- **Dependencies**: Third-party libraries or internal helper modules required.

---

## 🟢 Baseline Release Features (v1.0.0)

### 1. Viewport-Filling Shell Layout
- **Description**: Sets up the full-screen container holding standard application structures without double-scrollbars, centering footer content neatly.
- **Components**: `src/shared/components/layout/Shell.tsx`
- **Pages**: Main view context
- **Services**: None (Static UI)
- **APIs**: None
- **Database**: None
- **Permissions**: Public access
- **Routes**: Local state navigation
- **Events**: None
- **Dependencies**: React, Tailwind CSS

### 2. Dual-Mode Sticky Navigation Bar
- **Description**: Sticky header with brand identification logo and navigation tabs, shrinking into a hamburger panel on mobile layouts.
- **Components**: `src/shared/components/layout/Navbar.tsx`
- **Pages**: My Lessons, Catalog
- **Services**: None
- **APIs**: None
- **Database**: None
- **Permissions**: Public access
- **Routes**: Tab triggers (`my-lessons`, `catalog`)
- **Events**: None
- **Dependencies**: Lucide React, Motion, React

### 3. SmartCookie Student Hub (My Lessons)
- **Description**: Initial home dashboard displaying enrolled studies, user status indicators, and course cards with micro-animations.
- **Components**: None (Pages wrapper)
- **Pages**: `src/features/lessons/pages/MyLessons.tsx`
- **Services**: None
- **APIs**: None
- **Database**: None
- **Permissions**: Public access
- **Routes**: `my-lessons` Tab
- **Events**: None
- **Dependencies**: Lucide React, Motion, React

### 4. Curriculum Catalog
- **Description**: Catalog view showing course categories, search and filters placeholders, and warning messages for placeholder sections.
- **Components**: None
- **Pages**: `src/features/catalog/pages/Catalog.tsx`
- **Services**: None
- **APIs**: None
- **Database**: None
- **Permissions**: Public access
- **Routes**: `catalog` Tab
- **Events**: None
- **Dependencies**: Lucide React, Motion, React

### 5. Internationalization (i18n) Infrastructure
- **Description**: Multi-language translation framework supporting locale auto-detection, persistent localStorage caching, and logical layout properties. Details defined in [ADR-0003](../decisions/README.md#adr-0003-i18n-architecture).
- **Components**: `src/shared/components/layout/LanguageSwitcher.tsx`
- **Pages**: Global / layout-wide integration
- **Services**: i18n initialization (`src/shared/i18n/config.ts`)
- **APIs**: None
- **Database**: None
- **Permissions**: Public access
- **Routes**: App-wide
- **Events**: `i18n.changeLanguage` language switches
- **Dependencies**: `i18next`, `react-i18next`, `i18next-browser-languagedetector`

### 6. Authentication & System Setup Wizard
- **Description**: Ensures secure enterprise initialization via a multi-step wizard, creates root superuser credentials, establishes a primary company partition, governs user access via cookie-bound session profiles, and provides a rate-limited secure login gate.
- **Components**: `src/shared/components/AppGate.tsx`, `src/features/auth/pages/SetupWizard.tsx`, `src/features/auth/pages/Login.tsx`
- **Pages**: Root / Workspace Access controls
- **Services**: `SetupWizardService` (`server/src/features/auth/services/setupWizard.service.ts`), `EmailPasswordAuthProvider` (`server/src/features/auth/services/auth.service.ts`), `EmailService` (`server/src/shared/email/email.service.ts`)
- **APIs**: `/api/setup/status`, `/api/setup/superuser`, `/api/setup/company`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/session`, `/api/auth/recovery-email`
- **Database**: `users`, `companies`, `sessions` (Prisma schema + MariaDB)
- **Permissions**: Public for initialization and login, superuser for company step, session-bound for core pages and recovery profile changes.
- **Routes**: Wizard triggers, Login gate, Client state routing with redirect-back persistence
- **Events**: Account email updates fire notification events via standard SMTP/Email transporters.
- **Dependencies**: React, i18next, motion/react, lucide-react, Express, Prisma, bcrypt, express-rate-limit, cookie-parser
