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

### 7. Invitation-Based User Creation & Password Reset
- **Description**: Allows administrators (superusers) to securely invite users via email, resend pending invitations, or trigger administrator-led password resets. Also enables public users to securely request password resets via an email-bound one-time token mechanism, adhering to a strict timing-attack-free and enumeration-free design on both backend and frontend.
- **Components**: `src/shared/components/AppGate.tsx`
- **Pages**: `src/features/auth/pages/AcceptInvitation.tsx`, `src/features/auth/pages/ForgotPassword.tsx`, `src/features/auth/pages/ResetPassword.tsx`
- **Services**: `UserInvitationService` (`server/src/features/auth/services/userInvitation.service.ts`), `TokenService` (`server/src/shared/token/token.service.ts`), `EmailService` (`server/src/shared/email/email.service.ts`)
- **APIs**: `POST /api/users/invite`, `POST /api/users/:id/resend-invitation`, `POST /api/users/:id/admin-reset-password`, `POST /api/auth/activate`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- **Database**: `users`, `tokens`, `sessions` (Prisma schema)
- **Permissions**: Requires active superuser session cookie (`sid`) with `requireSuperuser` middleware (noted as temporary/RBAC-pending) for admin endpoints; public access for activation, forgot-password, and reset-password forms.
- **Routes**: `/accept-invitation?token=...`, `/activate?token=...`, `/reset-password?token=...`, and login-integrated forgot password view.
- **Events**: Invitation and reset emails are dispatched using transactional transporters via `EmailService`.
- **Dependencies**: React, i18next, motion/react, lucide-react, Express, Prisma, bcrypt, express-rate-limit, cookie-parser

### 8. Hierarchical Role-Based Access Control (RBAC) & Settings Area
- **Description**: Introduces a first-class, secure access management framework. Administrators can list, create, duplicate, rename, and delete custom organizational roles (excluding protected system profiles). Features a robust module/action permission mapping matrix, single-parent hierarchical access inheritance, and a company-wide toggle setting to enable/disable hierarchical inheritance globally. Active checks occur securely on the backend via the `requirePermission` middleware, and visually on the frontend using the dynamic `usePermission` hook.
- **Components**: `src/features/rbac/pages/Settings.tsx`, `src/features/rbac/pages/RoleManagement.tsx`, `src/shared/hooks/usePermission.ts`, `src/shared/components/layout/Navbar.tsx` (Settings Tab insertion)
- **Pages**: Settings, Role Management Dashboard
- **Services**: `RoleService` (`server/src/features/rbac/services/role.service.ts`), `PermissionResolverService` (`server/src/features/rbac/services/permissionResolver.service.ts`), `RoleTemplatesService` (`server/src/features/rbac/services/roleTemplates.service.ts`)
- **APIs**: `GET /api/roles`, `POST /api/roles`, `GET /api/roles/:id/permissions`, `PATCH /api/roles/:id`, `DELETE /api/roles/:id`, `POST /api/roles/:id/duplicate`, `GET /api/permissions`, `GET /api/company/settings`, `PATCH /api/company/settings`
- **Database**: `roles`, `permissions`, `role_permissions`, `companies` (Prisma & MariaDB schemas)
- **Permissions**: Gated by `roles:manage` permission, which is automatically bypassed for Superusers.
- **Routes**: Local navigation tab `#settings`.
- **Events**: Updates to role hierarchies and configurations immediately invalidate existing permission states across active user session endpoints.
- **Dependencies**: React, i18next, motion/react, lucide-react, Express, Prisma, bcrypt, cookie-parser

### 9. Multi-Tenant Organization Model MVP
- **Description**: Implements a highly scalable and resilient multi-tenant organization structure. This includes hierarchical Organization Units (OU) for formal company division with soft-delete/restore lifecycles, child reassignments, and manager roles, and nested Learning Groups for temporary/permanent student cohort grouping. Standard cycle-prevention algorithms protect hierarchies at the service layer, and unique checkout constraint checks protect polymorphic membership assignments securely in database tables.
- **Components**: Backend Services and API routes (frontend UI pending)
- **Pages**: None
- **Services**: `OrganizationUnitService` (`server/src/features/organization/services/organizationUnit.service.ts`), `LearningGroupService` (`server/src/features/organization/services/learningGroup.service.ts`), `ScheduledTasksService` (`server/src/shared/scheduler/scheduledTasks.service.ts`)
- **APIs**: `GET /api/organization-units`, `POST /api/organization-units`, `PUT /api/organization-units/:id`, `POST /api/organization-units/:id/move`, `GET /api/organization-units/:id/deletion-preview`, `DELETE /api/organization-units/:id`, `POST /api/organization-units/:id/restore`, `POST /api/organization-units/:id/managers`, `DELETE /api/organization-units/:id/managers/:userId`, `GET /api/learning-groups`, `POST /api/learning-groups`, `PUT /api/learning-groups/:id`, `POST /api/learning-groups/:id/move`, `DELETE /api/learning-groups/:id`, `POST /api/learning-groups/:id/restore`, `POST /api/learning-groups/:id/members`, `DELETE /api/learning-groups/:id/members/:userId`
- **Database**: `organization_units`, `learning_groups`, `memberships` (Prisma & MariaDB schemas)
- **Permissions**: Gated by `organization:view`, `organization:create`, `organization:edit`, `organization:delete`, `organization:manage-members`, and `organization:manage-groups` permissions, registered under the "organization" module.
- **Routes**: `/api/organization-units/*`, `/api/learning-groups/*`
- **Events**: Background scheduler tasks run periodically (every hour) to purge expired units, auto-expire temporary groups, and dispatch email reminders via `EmailService`.
- **Dependencies**: Express, Prisma ORM, crypto, Node.js


