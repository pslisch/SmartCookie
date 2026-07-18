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

### 9. Hierarchical Organization Model MVP & Visual Management Suite
- **Description**: Implements a highly scalable and resilient company hierarchical organization structure. This includes hierarchical Organization Units (OU) for formal company division with soft-delete/restore lifecycles, child reassignments, and manager roles, and nested Learning Groups for temporary/permanent student cohort grouping. Features a fully-interactive visual tree manager, child node nesting controls, dynamic user assignment dialogs, expiring temporary cohort alerts, and a dedicated Step in the Setup Wizard for top-level division configuration.
- **Components**: `src/features/organization/components/OrganizationStructureTab.tsx`, `src/features/organization/components/LearningGroupsTab.tsx`, `src/features/organization/components/ExpiringGroupsTab.tsx`
- **Pages**: `src/features/organization/pages/UserGroupManagement.tsx`, `src/features/auth/pages/SetupWizard.tsx` (Step 3: Configure Divisions & Units)
- **Services**: `OrganizationUnitService` (`server/src/features/organization/services/organizationUnit.service.ts`), `LearningGroupService` (`server/src/features/organization/services/learningGroup.service.ts`), `ScheduledTasksService` (`server/src/shared/scheduler/scheduledTasks.service.ts`), `SetupWizardService` (`server/src/features/auth/services/setupWizard.service.ts`)
- **APIs**: `GET /api/organization-units`, `POST /api/organization-units`, `PUT /api/organization-units/:id`, `POST /api/organization-units/:id/move`, `GET /api/organization-units/:id/deletion-preview`, `DELETE /api/organization-units/:id`, `POST /api/organization-units/:id/restore`, `POST /api/organization-units/:id/members`, `POST /api/organization-units/:id/managers`, `DELETE /api/organization-units/:id/managers/:userId`, `GET /api/learning-groups`, `POST /api/learning-groups`, `PUT /api/learning-groups/:id`, `POST /api/learning-groups/:id/move`, `DELETE /api/learning-groups/:id`, `POST /api/learning-groups/:id/restore`, `POST /api/learning-groups/:id/members`, `DELETE /api/learning-groups/:id/members/:userId`, `GET /api/learning-groups/expiring`, `PATCH /api/learning-groups/:id/extend`, `POST /api/setup/org-structure`
- **Database**: `organization_units`, `learning_groups`, `memberships`, `companies.settings` (Prisma & MariaDB schemas)
- **Permissions**: Gated by `organization:view`, `organization:create`, `organization:edit`, `organization:delete`, `organization:manage-members`, and `organization:manage-groups` permissions, registered under the "organization" module.
- **Routes**: `/settings` (User & Group Management card link), Setup Wizard `/status` step `'org-structure'`.
- **Events**: Background scheduler tasks run periodically (every hour) to purge expired units, auto-expire temporary groups, and dispatch email reminders via `EmailService`.
- **Dependencies**: Express, Prisma ORM, Node.js, React, i18next, motion/react, lucide-react

### 10. Learning Assignments & Target Resolution Engine
- **Description**: Implements robust, enterprise-grade learning assignment mechanics. Facilitates target-based lesson and course assignment (assigning to individual users, OUs, or Learning Groups) which materializes into individual `UserAssignmentInstance` entries. Features dynamic target resolution (crawling the OU hierarchy subtree to resolve child nodes and membership listings, resolving multi-source qualifying links to prevent duplicate active instances), self-assignment workflows, audit logging, soft-deletion lifecycles, and user-reactivation behavior (RESTORE vs. FRESH_START). A daily cron scheduler automatically runs background tasks to purge soft-deleted items past their retention window and dispatches transactional overdue reminders.
- **Components**: `src/features/assignments/components/AssignmentInstanceReport.tsx`, `src/features/assignments/components/CreateAssignmentModal.tsx`, `src/features/assignments/components/LessonSelectionList.tsx`
- **Pages**: `src/features/management/pages/Management.tsx` (Management Hub), `src/features/assignments/pages/AssignmentManagement.tsx`, `src/features/assignments/pages/ContentManagement.tsx`, `src/features/catalog/pages/Catalog.tsx` (Curriculum Catalog), `src/features/lessons/pages/MyLessons.tsx` (Student Hub)
- **Services**: `AssignmentService` (`server/src/features/assignments/services/assignment.service.ts`), `TargetResolutionService` (`server/src/features/assignments/services/targetResolution.service.ts`), `MaterializationService` (`server/src/features/assignments/services/materialization.service.ts`), `SelfAssignmentService` (`server/src/features/assignments/services/selfAssignment.service.ts`), `CompletionService` (`server/src/features/assignments/services/completion.service.ts`), `MembershipAssignmentHooksService` (`server/src/features/assignments/services/membershipAssignmentHooks.service.ts`), `UserReactivationService` (`server/src/features/auth/services/userReactivation.service.ts`), `AuditLogService` (`server/src/shared/audit/auditLog.service.ts`), `ScheduledTasksService` (`server/src/shared/scheduler/scheduledTasks.service.ts`)
- **APIs**: `POST /api/assignments`, `POST /api/assignments/course`, `DELETE /api/assignments/:id`, `GET /api/assignments`, `GET /api/assignments/:id/instances`, `POST /api/assignments/self-assign`, `DELETE /api/assignments/self-assign/:instanceId`, `POST /api/assignment-instances/:id/complete`, `POST /api/users/:id/reactivate`
- **Database**: `assignments`, `assignment_targets`, `user_assignment_instances`, `user_assignment_instance_sources`, `audit_logs` (Prisma & MariaDB schemas)
- **Permissions**: Gated by `assignments:view`, `assignments:create`, `assignments:edit`, `assignments:delete`, `assignments:view-reports`, and `assignments:create-mandatory` permissions.
- **Routes**: `server/src/features/assignments/routes/assignments.routes.ts`, `server/src/features/auth/routes/users.routes.ts`
- **Events**: Background scheduler tasks run periodically to purge soft-deleted items and send overdue email alerts via `EmailService`.
- **Dependencies**: Express, Prisma ORM, Node.js, Nodemailer

### 11. SCORM Content Engine & Runtime Player (SCORM 1.2 MVP)
- **Description**: Introduces robust SCORM 1.2 learning package execution. Supports importing, validating, and extracting zip packages securely with zip-slip protections. Includes a dedicated Content Library page with search, filters (by tags, categories, and status), publish/archive/restore actions, version history views, and download original ZIP functionality. Features an interactive frontend SCORM 1.2 client API bridge (`window.API`) supporting periodic commits, attempt tracking limits, and automated progress/completion/score rollup calculation onto the parent assignment instance records.
- **Components**: `src/features/content/components/ContentImportWizard.tsx`, `src/features/content/components/ScormPlayer.tsx`, `src/features/content/pages/ContentLibrary.tsx`
- **Pages**: `src/features/management/pages/Management.tsx` (SCORM Content Library tab), `src/features/lessons/pages/MyLessons.tsx` (Launch/Resume course play)
- **Services**: `ContentService` (`server/src/features/content/services/content.service.ts`), `ContentAttemptService` (`server/src/features/content/services/contentAttempt.service.ts`)
- **APIs**: `GET /api/content`, `POST /api/content/import`, `POST /api/content/:id/publish`, `POST /api/content/:id/archive`, `POST /api/content/:id/restore`, `GET /api/content/:id/download`, `GET /api/content/:contentGroupId/versions`, `POST /api/content-attempts/start`, `POST /api/content-attempts/:id/commit`, `GET /api/content-attempts/:instanceId`
- **Database**: `contents`, `content_tags`, `content_categories`, `content_attempts`, `user_assignment_instances` (Prisma & MariaDB schemas)
- **Permissions**: Requires `content:import`, `content:view`, `content:publish`, `content:archive`, `content:restore`, `content:download-zip` permissions.
- **Routes**: `server/src/features/content/routes/content.routes.ts`, `server/src/features/content/routes/contentAttempts.routes.ts`
- **Events**: Completion and performance scoring commits trigger instant rollup calculation and updates to user study progress on completion records.
- **Dependencies**: Express, Prisma ORM, Node.js, Adm-Zip, xml2js, React, motion/react, lucide-react

### 12. Frontend-Only Visual Preview (Preview as Role)
- **Description**: Allows privileged administrators to preview the application interface under any lower-privileged role context. The preview is cosmetic-only and manages an in-memory session override on the frontend while keeping the backend authentication intact for secure API communication. It automatically suspends superuser UI bypass checks during the active preview.
- **Components**: `src/shared/components/PreviewBanner.tsx`, `src/shared/contexts/PreviewContext.tsx`, custom insertions in `src/shared/components/layout/Shell.tsx` and `src/shared/components/layout/Navbar.tsx`
- **Pages**: Global / Layout-wide preview triggers, shortcut buttons on `src/features/content/pages/ContentLibrary.tsx` and `src/features/content/pages/ContentImportWizard.tsx`
- **Services**: None (Cosmetic Frontend State)
- **APIs**: `GET /api/preview/eligible-roles` (returns target roles that are a strict subset of current user's effective permissions), `GET /api/roles/:id/effective-permissions`
- **Database**: `roles`, `role_permissions`
- **Permissions**: Gated by `preview:use` permission.
- **Routes**: `/api/preview/*`
- **Events**: In-memory state changes reset on tab reload.
- **Dependencies**: React, Tailwind CSS, Lucide React, Motion

### 13. Profiles & User Management Extensions (Fully Materialized Client-Server Feature)
- **Description**: Extends the user entity with first/last name, profile picture, and last login data. Establishes a flexible ProfileFieldDefinition and ProfileFieldValue custom field architecture with seeded system field definitions, role-specific field edit privileges, user notification preferences, and mandatory tenant-wide notification requirements. Includes User Management services for advanced listings, profiling, updating, archiving, and restoring, plus a transactional bulk user import engine. Fully integrated with a production-ready React client interface supporting searching/filtering, detail sheets, custom profile inputs, admin actions (archive/restore choices, password reset), and an all-or-nothing Bulk Import Wizard. Also features an interactive Profile Category and Field Builder for custom form customization, as well as a session-dismissible Required Field completion reminder banner.
- **Components**: `src/features/organization/components/UsersTab.tsx`, `src/features/organization/components/BulkImportWizard.tsx`, `src/shared/components/ProfileFieldInput.tsx`, `src/shared/components/RequiredFieldReminder.tsx`
- **Pages**: `src/features/organization/pages/UserGroupManagement.tsx` (Houses "Users" tab), `src/features/profiles/pages/FieldBuilder.tsx` (Profiles Category & Custom Field Builder), `src/features/rbac/pages/Settings.tsx` (Settings Area Hub)
- **Services**: `UserManagementService` (`server/src/features/auth/services/userManagement.service.ts`), `BulkImportService` (`server/src/features/profiles/services/bulkImport.service.ts`), `ProfileFieldService` (`server/src/features/profiles/services/profileField.service.ts`), `ProfileFieldValueService` (`server/src/features/profiles/services/profileFieldValue.service.ts`), `seedProfileFields` (`server/prisma/seed/profileFieldsSeed.ts`), `scheduledTasksService` (`server/src/shared/scheduler/scheduledTasks.service.ts` updated to respect preferences)
- **APIs**:
  - `GET /api/users` (paginated list/filter)
  - `GET /api/users/:id` (full detail + profile values)
  - `PUT /api/users/:id` (update profile & custom fields)
  - `DELETE /api/users/:id` (archive user)
  - `POST /api/users/:id/restore` (restore/fresh start user)
  - `POST /api/users/:id/admin-reset-password` (reset password)
  - `GET /api/notification-preferences` (fetch self preferences)
  - `PATCH /api/notification-preferences` (update self preferences)
  - `PATCH /api/company/mandatory-notification-types` (set mandatory types)
  - `GET /api/users/bulk-import/template` (generate CSV template)
  - `POST /api/users/bulk-import/validate` (validate CSV dry-run)
  - `POST /api/users/bulk-import/confirm` (all-or-nothing transaction import)
  - `GET /api/profile-fields/categories` (list categories & fields)
  - `POST /api/profile-fields/categories` (create category)
  - `PATCH /api/profile-fields/categories/:id` (rename/reorder category)
  - `DELETE /api/profile-fields/categories/:id` (delete category)
  - `POST /api/profile-fields/definitions` (create custom field)
  - `PATCH /api/profile-fields/definitions/:id` (edit custom field)
  - `DELETE /api/profile-fields/definitions/:id` (delete custom field)
  - `POST /api/profile-fields/definitions/:id/move-up` (reorder field up)
  - `POST /api/profile-fields/definitions/:id/move-down` (reorder field down)
  - `POST /api/profile-fields/definitions/:id/roles` (assign editing roles)
  - `GET /api/profile/me/completion` (live profile completion percentage & missing fields)
- **Database**: `profile_field_categories`, `profile_field_definitions`, `field_editable_by_roles`, `profile_field_values`, `notification_preferences`, `users`, `companies`, `tokens` (Prisma & MariaDB schemas)
- **Permissions**: `users:view`, `users:create`, `users:edit`, `users:delete`, `profile-fields:manage-categories`, `profile-fields:manage-fields`, and `roles:manage` (for mandatory notifications)
- **Routes**: `server/src/features/auth/routes/users.routes.ts`, `server/src/features/profiles/routes/notificationPreferences.routes.ts`, `server/src/features/profiles/routes/bulkImport.routes.ts`, `server/src/features/profiles/routes/profileField.routes.ts`, `server/src/features/profiles/routes/profile.routes.ts`
- **Events**: Automated notification triggers check user preferences or company-mandatory lists before mailing.
- **Dependencies**: Prisma ORM, Node.js, Express, Multer, CSV-parse, bcrypt, Nodemailer

### 14. Multi-Factor Authentication (MFA) Core Security System
- **Description**: Implements a comprehensive, robust local Multi-Factor Authentication (MFA) system utilizing Time-based One-time Passwords (TOTP). Supports encrypted TOTP secrets-at-rest (using AES-256-GCM), a secure two-stage session token flow using `MFA_CHALLENGE` and `MFA_SETUP` tokens, secure SHA-256 hashed one-time recovery codes, flexible tenant-wide MFA policies (including custom role-based mapping rules), and administrative de-enrollment overrides. Includes a complete web-based wizard integration step for initial superuser MFA configuration.
- **Components**: `QRCode` (rendering QR codes on frontend via qrcode package)
- **Pages**: `src/features/auth/pages/SetupWizard.tsx` (Step 1.5: Superuser MFA enrollment)
- **Services**: `MfaService` (`server/src/features/auth/services/mfa.service.ts`)
- **APIs**:
  - `POST /api/auth/mfa/verify` (verifies code or recovery code, returns active user session)
  - `POST /api/auth/mfa/setup-pending` (generates pending secret/URL for unenrolled gated user)
  - `POST /api/auth/mfa/enable-pending` (verifies pending setup, enables MFA, returns recovery codes)
  - `GET /api/setup/mfa/setup` (generates superuser setup secret)
  - `POST /api/setup/mfa/verify` (verifies and enables MFA for the initial superuser)
  - `GET /api/profile/mfa/status` (self-service MFA status retrieval)
  - `GET /api/profile/mfa/setup` (self-service secret/URI generation)
  - `POST /api/profile/mfa/enable` (self-service MFA verification & enablement)
  - `POST /api/profile/mfa/disable` (self-service MFA disablement requiring password verification)
  - `POST /api/profile/mfa/regenerate-recovery` (self-service regeneration of recovery codes)
  - `POST /api/users/:id/admin-reset-mfa` (admin override de-enrollment requiring `users:edit` permission)
- **Database**: `users`, `companies`, `mfa_recovery_codes`, `mfa_policy_roles`, `tokens` (Prisma & MariaDB schemas)
- **Permissions**: Public access for login challenges/setup gates; `sid` active session cookie for self-service profiles; active superuser session cookie for setup wizard endpoints; `users:edit` permission for admin de-enrollment.
- **Routes**: `server/src/features/auth/routes/auth.routes.ts`, `server/src/features/auth/routes/setup.routes.ts`, `server/src/features/profiles/routes/profile.routes.ts`, `server/src/features/auth/routes/users.routes.ts`
- **Events**: MFA resets or enrollment changes instantly invalidate active login credentials or require multi-stage prompts on subsequent authorization actions.
- **Dependencies**: Prisma ORM, Node.js, Express, otplib, crypto, qrcode
### 15. Microsoft Entra ID Integration Engine (Fully Materialized Client-Server Feature Backend)
- **Description**: Connects SmartCookie LMS to Microsoft Entra ID for full identity provider credential validation, connection tests, and automated group and user synchronization. Implements a dual-permission token validator, selective profile property overwrites based on dynamic sync-locking, soft-deletion reconciliation of missing users/groups, and automated lms-manager alert notifications on complete sync failures.
- **Components**: `EntraSetupSteps` (`src/features/identity/components/EntraSetupSteps.tsx`)
- **Pages**: `src/features/auth/pages/SetupWizard.tsx` (Step 4: Identity Provider)
- **Services**:
  - `EntraSyncService` (`server/src/features/identity/services/entraSync.service.ts`)
  - `EntraGraphClient` (`server/src/features/identity/providers/entraGraphClient.ts`)
  - `EntraTokenValidator` (`server/src/features/identity/providers/entraTokenValidator.ts`)
  - `VerifyTokenValidator` (`server/src/features/identity/providers/verifyTokenValidator.ts`)
  - `EntraIdAuthProvider` (`server/src/features/identity/providers/entraId.provider.ts`)
- **APIs**:
  - `GET /api/identity-providers/entra` (Retrieve connection settings & groups metadata)
  - `POST /api/identity-providers/entra` (Save/overwrite Entra credentials)
  - `PATCH /api/identity-providers/entra` (Update login/import strategies and selected sync groups)
  - `POST /api/identity-providers/entra/test-connection` (Validates tenant/client settings and Graph application roles)
  - `POST /api/identity-providers/entra/sync-now` (Manual sync trigger)
  - `GET /api/identity-providers/entra/sync-logs` (Paginated historical sync records list)
  - `GET /api/identity-providers/entra/sync-logs/:id/download` (Download full sync errors JSON as text attachment)
- **Database**: `identity_provider_configs`, `entra_group_selections`, `sync_logs`, `users` (`entraObjectId`, `profilePictureManuallySet`), `organization_units` (`syncSource`, `entraGroupId`)
- **Permissions**:
  - `identity-providers:view-config`
  - `identity-providers:configure`
  - `identity-providers:manual-sync`
  - `identity-providers:view-logs`
- **Routes**: `server/src/features/identity/routes/identityProvider.routes.ts`
- **Events**: Critical sync failures automatically resolve managers holding `identity-providers:view-logs` and trigger automated HTML alerts via `EmailService`.
- **Dependencies**: Prisma ORM, Node.js, Express, `node-fetch`, `@prisma/client`, `jsonwebtoken`




