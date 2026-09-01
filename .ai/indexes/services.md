# Service Index

This index acts as the central registry of all shared, stateful, or helper services.

---

## ⚙️ Service Specification Schema

Each reusable service should include:
- **Purpose**: Clear, modular responsibility description.
- **Consumers**: Visual elements or routines importing the instance.
- **Dependencies**: APIs, packages, or databases required.

---

## 🟢 Active Services (v1.11.0)

### 1. SetupWizardService
- **Purpose**: Governs company initialization steps, superuser creation, email config, identity provider config, division seeding, and default role template assignment.
- **Consumers**: `setup.routes.ts`
- **Dependencies**: Prisma, bcrypt, crypto

### 2. EmailPasswordAuthProvider
- **Purpose**: Authenticates credentials, verifies passwords against complexity policies, and handles user login flows.
- **Consumers**: `auth.routes.ts`
- **Dependencies**: Prisma, bcrypt

### 3. UserInvitationService
- **Purpose**: Enforces secure invitations, activations, and admin-led password resets using single-use SHA-256 tokens.
- **Consumers**: `users.routes.ts`, `auth.routes.ts`
- **Dependencies**: Prisma, TokenService, EmailService

### 4. UserManagementService
- **Purpose**: Provides administrative user query filtering, detail fetching with custom profile fields, updates, archiving, and restoration.
- **Consumers**: `users.routes.ts`
- **Dependencies**: Prisma

### 5. UserReactivationService
- **Purpose**: Governs reactivation of archived users with option for RESTORE (retaining historical data) or FRESH_START.
- **Consumers**: `users.routes.ts`
- **Dependencies**: Prisma

### 6. SessionHelper
- **Purpose**: Generates and persists user session records, manages HTTP-only cookies, and retrieves current user identity with permissions.
- **Consumers**: `auth.routes.ts`, `setup.routes.ts`, `session.middleware.ts`
- **Dependencies**: Prisma

### 7. MfaService
- **Purpose**: Governs local multi-factor authentication setup (TOTP secret encryption via AES-256-GCM), verification, single-use SHA-256 hashed recovery codes, and de-enrollment.
- **Consumers**: `auth.routes.ts`, `setup.routes.ts`, `profile.routes.ts`, `users.routes.ts`
- **Dependencies**: Prisma, otplib, crypto

### 8. RoleService
- **Purpose**: Core engine for roles administration, hierarchy movement, cycle prevention, duplication, and permission association.
- **Consumers**: `roles.routes.ts`
- **Dependencies**: Prisma

### 9. RoleTemplatesService
- **Purpose**: Seeds pre-configured role profiles (e.g., Learner, Instructor, Manager) with associated permission bundles during setup and administration.
- **Consumers**: `setup.routes.ts`, `roles.routes.ts`
- **Dependencies**: Prisma

### 10. PermissionResolverService
- **Purpose**: Computes effective user permissions by traversing single-parent role inheritance hierarchies (when enabled) with superuser bypass.
- **Consumers**: `session.middleware.ts`, `permission.middleware.ts`, `auth.routes.ts`, `preview.routes.ts`
- **Dependencies**: Prisma

### 11. OrganizationUnitService
- **Purpose**: Handles formal hierarchical division with 14-day soft-delete/restore window, child OU subtree reassignments, manager roles, and cycle prevention.
- **Consumers**: `organizationUnits.routes.ts`, `setup.routes.ts`
- **Dependencies**: Prisma, crypto

### 12. LearningGroupService
- **Purpose**: Manages nestable student cohort groups, manual member assignments, temporary group expiration dates, and 14-day soft-deletes.
- **Consumers**: `learningGroups.routes.ts`
- **Dependencies**: Prisma

### 13. AssignmentService
- **Purpose**: Manages learning assignment scheduling (IMMEDIATE vs SCHEDULED), target dispatching, status transitions, and cancellation.
- **Consumers**: `assignments.routes.ts`
- **Dependencies**: Prisma, TargetResolutionService, MaterializationService

### 14. TargetResolutionService
- **Purpose**: Crawls organizational hierarchy trees and learning group rosters to resolve target IDs into discrete user IDs for assignment dispatching.
- **Consumers**: `assignment.service.ts`, `mandatoryAssignment.service.ts`, `membershipAssignmentHooks.service.ts`
- **Dependencies**: Prisma

### 15. MaterializationService
- **Purpose**: Materializes individual `UserAssignmentInstance` and `UserAssignmentInstanceSource` records from resolved target users, avoiding duplicates.
- **Consumers**: `assignment.service.ts`, `mandatoryAssignment.service.ts`, `membershipAssignmentHooks.service.ts`
- **Dependencies**: Prisma

### 16. SelfAssignmentService
- **Purpose**: Handles self-enrollment into courses and lessons by learners from the curriculum catalog, creating self-assigned instances.
- **Consumers**: `assignments.routes.ts`
- **Dependencies**: Prisma

### 17. CompletionService
- **Purpose**: Records assignment instance completions, tracks progress rollups, and fires completion audit events.
- **Consumers**: `assignments.routes.ts`, `contentAttempt.service.ts`
- **Dependencies**: Prisma, AuditLogService

### 18. MandatoryAssignmentService
- **Purpose**: Handles mandatory compliance assignments, ensuring automatic assignment upon new user creation or group joining.
- **Consumers**: `assignments.routes.ts`, `membershipAssignmentHooks.service.ts`
- **Dependencies**: Prisma, MaterializationService

### 19. MembershipAssignmentHooksService
- **Purpose**: Reacts to user addition or removal in Organization Units or Learning Groups by materializing newly qualified assignments or adjusting active sources.
- **Consumers**: `organizationUnits.routes.ts`, `learningGroups.routes.ts`
- **Dependencies**: Prisma, TargetResolutionService, MaterializationService

### 20. ContentService
- **Purpose**: Manages SCORM content packages, zip package validation, manifest parsing (imsmanifest.xml), safe extraction with zip-slip protections, publishing, and archiving.
- **Consumers**: `content.routes.ts`
- **Dependencies**: Prisma, adm-zip, xml2js, ContentStorageService

### 21. ContentAttemptService
- **Purpose**: Manages SCORM runtime attempt lifecycles, starts attempts, persists periodic CMI state commits, and updates parent assignment instance progress and status.
- **Consumers**: `contentAttempts.routes.ts`
- **Dependencies**: Prisma, CompletionService

### 22. ContentStorageService
- **Purpose**: Manages secure filesystem storage and path resolution for uploaded SCORM ZIPs and extracted package static files.
- **Consumers**: `content.service.ts`, `content.routes.ts`
- **Dependencies**: Node.js fs, path

### 23. ImageUploadService
- **Purpose**: Validates and saves profile pictures and content package thumbnails securely with format and size checks.
- **Consumers**: `profile.routes.ts`, `content.routes.ts`
- **Dependencies**: multer, Node.js fs, path

### 24. Scorm12Provider
- **Purpose**: Encapsulates SCORM 1.2 data model parsing, validation, default completion rules, and CMI element mapping.
- **Consumers**: `content.service.ts`, `contentAttempt.service.ts`
- **Dependencies**: xml2js

### 25. BulkImportService
- **Purpose**: Validates and executes all-or-nothing transactional CSV bulk user imports, supporting standard and dynamic custom profile fields.
- **Consumers**: `bulkImport.routes.ts`
- **Dependencies**: Prisma, csv-parse, bcrypt

### 26. ProfileFieldService
- **Purpose**: Manages profile field categories and custom field definitions, validation rules, display orders, and role-based editing authorizations.
- **Consumers**: `profileField.routes.ts`
- **Dependencies**: Prisma

### 27. ProfileFieldValueService
- **Purpose**: Fetches, validates, and persists user custom profile field values respecting validation rules and role-based edit permissions.
- **Consumers**: `profile.routes.ts`, `users.routes.ts`, `bulkImport.service.ts`
- **Dependencies**: Prisma

### 28. EntraSyncService
- **Purpose**: Manages scheduled and manual Microsoft Entra ID user and group synchronization, reconciles missing records, logs execution details, and sends failure alerts.
- **Consumers**: `identityProvider.routes.ts`, `scheduledTasks.service.ts`
- **Dependencies**: Prisma, EntraGraphClient, EmailService

### 29. EntraGraphClient
- **Purpose**: Communicates with Microsoft Graph API, handles token exchanges (delegated & application), implements paginated response traversal, and rate limit retries with exponential backoff.
- **Consumers**: `entraSync.service.ts`, `identityProvider.routes.ts`
- **Dependencies**: global fetch, Node.js buffer utilities

### 30. EntraIdAuthProvider
- **Purpose**: Authenticates users against Microsoft Entra ID OIDC tokens, provisions JIT accounts according to import strategy, and syncs profile claims.
- **Consumers**: `auth.routes.ts`, `identityProvider.routes.ts`
- **Dependencies**: Prisma, EntraGraphClient, EntraTokenValidator

### 31. EntraTokenValidator & VerifyTokenValidator
- **Purpose**: Validates Microsoft Entra ID JWT ID tokens, signatures, issuer claims, and audience keys.
- **Consumers**: `entraId.provider.ts`, `identityProvider.routes.ts`
- **Dependencies**: jsonwebtoken, jwks-rsa / public key parsing

### 32. AuditLogService
- **Purpose**: Creates immutable audit records for sensitive administrative actions, role modifications, and assignment completions.
- **Consumers**: `assignments.routes.ts`, `completion.service.ts`, `roles.routes.ts`
- **Dependencies**: Prisma

### 33. EncryptionService
- **Purpose**: Provides symmetric AES-256-GCM encryption and decryption for sensitive credentials at rest (MFA secrets, SMTP passwords, Entra client secrets).
- **Consumers**: `mfa.service.ts`, `email.service.ts`, `identityProvider.routes.ts`
- **Dependencies**: Node.js crypto

### 34. EmailService
- **Purpose**: Handles rendering and transmission of transactional emails (invitations, password resets, overdue alerts, sync failures) using company-specific decrypted SMTP settings with fallback to environment variables.
- **Consumers**: `auth.routes.ts`, `users.routes.ts`, `scheduledTasks.service.ts`, `entraSync.service.ts`
- **Dependencies**: Prisma, nodemailer, EncryptionService

### 35. PermissionRegistry & Sync
- **Purpose**: Provides central registration of permissions across modules and synchronizes permissions into the database upon server boot.
- **Consumers**: `server/src/index.ts`, all `*.permissions.ts` files
- **Dependencies**: Prisma

### 36. ScheduledTasksService
- **Purpose**: Runs background periodic cron tasks for permanent purging of 14-day soft-deleted entities, expiring temporary learning groups, sending expiration reminders, and dispatching overdue assignment emails.
- **Consumers**: Express entrypoint (`index.ts`)
- **Dependencies**: Prisma, EmailService, EntraSyncService

### 37. TokenService
- **Purpose**: Generates cryptographically secure random tokens, hashes them with SHA-256 for database storage, and validates expiration/single-use status.
- **Consumers**: `userInvitation.service.ts`, `auth.routes.ts`, `mfa.service.ts`
- **Dependencies**: Prisma, crypto

### 38. ScormApiBridge (Client-Side)
- **Purpose**: Frontend SCORM 1.2 client API bridge exposing `window.API` inside the ScormPlayer iframe, intercepting CMI calls and syncing commits to the server.
- **Consumers**: `src/features/content/components/ScormPlayer.tsx`
- **Dependencies**: None (Native TypeScript DOM Bridge)




