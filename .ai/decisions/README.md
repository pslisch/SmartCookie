# Architecture Decisions (ADR)

This directory serves as the automated registry of Architecture Decision Records (ADRs). It catalogs all major design patterns, database choices, routing logic, and system strategies implemented in SmartCookie.

---

## 📂 Index of Decisions

### [ADR-0001] Initial Foundation Shell & Theme Update
- **Status**: Approved
- **Date**: 2026-07-02
- **Context**: Establish a responsive, modular, high-density client dashboard for the initial LMS shell release.
- **Decision**: Implemented viewport flex mechanics, dynamic package data bindings, and clean color presets mapped across pages and components.
- **Consequences**: Fast loading speed, simplified folder scanning, clean foundation for authentication and course streaming hooks.

---

### [ADR-0002] Document Unused Platform Dependencies
- **Status**: Approved
- **Date**: 2026-07-02
- **Authors**: AI Coding Agent
- **Context**: package.json includes `@google/genai`, `express`, and `dotenv`. None are imported or used anywhere in `/src`. They originate from the default AI Studio platform template, alongside `metadata.json`'s `"MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"` flag.
- **Decision**: Keep these dependencies and configuration settings for now pending an explicit product decision, rather than deleting them, and do not wire them into any codebase feature in this pass.
- **Consequences**:
  - **Positives**: Retains full compatibility with any future AI features or backend server capability if requested.
  - **Negatives**: Flags as technical debt and dead weight if no AI or custom server features are scoped within the next 2 release cycles. Recommend revisiting.

---

### [ADR-0003] i18n Architecture
- **Status**: Approved
- **Date**: 2026-07-02
- **Authors**: AI Coding Agent
- **Context**: Establish a robust internationalization (i18n) setup for the LMS shell.
- **Decision**: Adopted `i18next` + `react-i18next` with `i18next-browser-languagedetector` for robust translation orchestration.
- **Implementation Strategy**:
  - **Persistence**: Language is detected from `localStorage` first, falling back to browser `navigator`. Language changes are automatically synchronized to `localStorage`.
  - **Namespaces**: Single `common` namespace for now (`src/shared/i18n/locales/en/common.json`), easily extensible to per-feature namespaces later.
  - **RTL Support**: Right-to-Left layout support is explicitly deferred but not blocked. We recommend using logical Tailwind CSS properties (such as `ms-*` instead of `ml-*` and `pe-*` instead of `pr-*`) in new visual code to simplify future RTL adoption without immediate retrofit.
- **Consequences**:
  - **Positives**: Standardized, high-performance translation pipeline; automatic persistence across visits; easily scales to new languages.
  - **Negatives**: Minor build-size overhead from i18n libraries, minimal boilerplate for adding new user-facing copy.

---

### [ADR-0004] Backend Runtime & Data Layer
- **Status**: Approved
- **Date**: 2026-07-03
- **Authors**: AI Coding Agent
- **Context**: SmartCookie has been a client-only static SPA (v1.0.0) with
  no backend, database, or persistence layer — every `.ai/indexes/*` file
  confirms this. The Authentication feature is the first to require
  server-side infrastructure: identity, sessions, password hashing,
  invitation tokens. ADR-0002 already reserved `express`/`dotenv` pending
  exactly this decision.
- **Decision**:
  - **Backend runtime**: Node.js + TypeScript + Express. Matches the
    existing AI Studio platform scaffolding, and keeps one language across
    the whole stack — types and validation schemas can be shared between
    frontend and backend instead of hand-duplicated.
  - **Database**: MariaDB (relational). User/role/permission/company data
    is inherently relational (foreign keys, joins), which resolves the
    previously "Planned" ADR comparing relational vs. document stores in
    favor of relational — see Supersedes below.
  - **ORM**: Prisma. Type-safe generated queries and migrations, fits the
    TypeScript-everywhere approach.
  - **Sessions**: DB-backed session store, not stateless JWT — required to
    support "logout from all devices" and server-side session invalidation
    as specified in the Authentication feature doc.
  - **Schema note**: The Setup Wizard's "Organization" step creates a
    single `company` record — one per install, not multi-tenant. Every
    `user` belongs to that company. The future Organization/groups/
    subgroups roadmap feature will add a separate, self-referencing
    `org_units` hierarchy plus a `users`⇄`org_units` join table for
    group-based lesson assignment. This is purely additive — no redesign
    of the tables introduced here.
- **Consequences**:
  - **Positives**: single-language stack, mature relational tooling,
    session model matches requirements without workarounds, low
    operational risk (standard managed MariaDB + Prisma migrations).
  - **Negatives**: introduces the project's first real backend deployment
    surface (migrations, environment secrets, DB hosting) — must be
    planned as its own task before any Authentication task lands.
- **Supersedes**: Resolves the previously Planned "Relational Databases
  vs Document Stores" ADR in favor of relational (MariaDB). Removed from
  the Planned list below.

---

### [ADR-0005] Notification / Email Architecture
- **Status**: Approved
- **Date**: 2026-07-03
- **Authors**: AI Coding Agent
- **Context**: Authentication requires transactional email (invitations,
  password resets). Self-hosting a mail transfer agent carries significant
  deliverability risk (IP reputation, SPF/DKIM/DMARC, blacklists)
  unrelated to the LMS's core purpose.
- **Decision**: Build an in-app `EmailService` abstraction — the rest of
  the app never talks to a mail transport directly, mirroring the
  auth-provider abstraction already required by the Authentication feature
  spec (§3). Use Nodemailer (open source, MIT license) as the transport
  implementation, initially configured against a standard SMTP relay. A
  self-hosted open-source mail server (e.g. Postal) can be substituted
  later as a pure transport swap, with zero application-code changes.
- **Consequences**:
  - **Positives**: no deliverability risk in MVP, provider-agnostic from
    day one, satisfies both "build our own" and "open source" without the
    operational burden of running a mail server immediately.
  - **Negatives**: initial reliance on a third-party SMTP relay until/
    unless a self-hosted mail server is stood up later.

---

### [ADR-0009] Hierarchical Role-Based Access Control (RBAC)
- **Status**: Approved
- **Date**: 2026-07-04
- **Authors**: AI Coding Agent
- **Context**: SmartCookie requires a highly granular, enterprise-grade permissions mechanism. Users are assigned a single primary Role, which grants access to specific features. However, complex organizations demand role hierarchy capabilities (e.g., "Supervisor" inheriting all permissions from "Staff") to minimize manual permission synchronization, alongside a global switch to disable inheritance if absolute isolation is needed.
- **Decision**:
  - **Permission-Registry Pattern**: System permissions are strictly defined as composite tuples of `(module, action)` where both fields are case-sensitive strings (e.g., `roles:manage`, `users:invite`, `lessons:view`). The `permissions` and `role_permissions` join-tables track these linkages explicitly.
  - **Single-Parent Inheritance Chain**: A role can optionally reference exactly one parent role (`parentRoleId`). When active, the system's permission resolution dynamically crawls up this chain, combining the local role's permissions with those of its ancestor nodes. Cyclic parent assignment is prevented by validation checks in the role update/creation pipelines.
  - **Company-Singleton Global Toggle**: The company settings model is expanded to house a global `roleInheritanceEnabled` boolean flag. This is stored directly on the single root `Company` record, which functions as a singleton for the installation. If disabled, all hierarchical inheritance evaluation is short-circuited.
  - **Superuser-Bypass Rule**: Any User with `isSuperuser === true` completely bypasses role-based lookup tables and is granted instant, unconditional authorization for all actions.
- **Consequences**:
  - **Positives**: Fully database-driven and customizable roles; elegant, cycle-proof inheritance; single-point-of-control global switch; robust security gates across the entire application stack.
  - **Negatives**: Recursive database crawls during session retrieval have a slight overhead (mitigated by recursive CTE queries or fast lookup paths in the ORM); requires careful maintenance of role-relation assignments to prevent configuration bloat.

---

### [ADR-0010] Separation of Assignment Administrative Intent and Materialized Learner Instances
- **Status**: Approved
- **Date**: 2026-07-08
- **Authors**: AI Coding Agent
- **Context**: When assigning learning content (lessons or courses) to broad targets such as Organization Units (OUs), Learning Groups, or individual users, a simple relational schema would face heavy data duplication or state-tracking bottlenecks if a single table was used. It must be easy to cancel/soft-delete an administrative assignment while managing individual user progress records cleanly.
- **Decision**:
  - Split the domain into two physical models: `Assignment` (tracks the admin's intention, targeting configuration, and schedules) and `UserAssignmentInstance` (tracks the direct user state: started/completed timestamps, progress percentage, due date, and reminder histories).
  - Use `AssignmentTarget` to represent individual targeting records (polymorphic relation to `userId`, `organizationUnitId`, or `learningGroupId`).
  - Introduce `courseAssignmentBatchId` to group lesson-level `Assignment` entries when an entire Course is assigned, allowing lessons within a course to fan out and materialize in parallel while retaining an administrative batch linkage.
- **Consequences**:
  - **Positives**: Extreme clarity in data models; simple index constraints; very fast progress and completions queries on `UserAssignmentInstance`; easy bulk-soft-deletion of assignments and their associated instances using cascade triggers.
  - **Negatives**: Requires maintaining target-to-instance mappings during creation and active syncing.

---

### [ADR-0011] Multi-Source Qualifying Links & Dynamic Membership Hooks
- **Status**: Approved
- **Date**: 2026-07-08
- **Authors**: AI Coding Agent
- **Context**: In an enterprise LMS, a user can easily qualify for the same lesson assignment from multiple overlapping sources (e.g., they are assigned a lesson directly as a user, they belong to an OU that was assigned the lesson, and they belong to a Learning Group that was assigned the same lesson). If they leave the group, their active assignment instance should not be cancelled if they still qualify via the OU or user assignment.
- **Decision**:
  - Create the `UserAssignmentInstanceSource` model. For every qualifying assignment targeting path that resolves to a user, create a source link with a type (e.g., `MANUAL`, `ORGANIZATION_UNIT`, `LEARNING_GROUP`).
  - Keep a single `UserAssignmentInstance` record per user and lesson (enforced by a database-level `@@unique([assignmentId, userId])` index constraint) with multiple `UserAssignmentInstanceSource` child links.
  - **Dynamic Hooks (`MembershipAssignmentHooksService`)**: Wire transactional hooks on membership creation and removal. When a user is added to a group/OU, create any matching assignment sources (and materialize instances if they don't exist). When a user leaves a group/OU, delete the associated source link. If the `UserAssignmentInstance` has no remaining sources, automatically mark its status as `CANCELLED`.
- **Consequences**:
  - **Positives**: Complete protection against duplicate learning assignments; robust resilience when users move between overlapping cohorts; automated lifecycle cleanup.
  - **Negatives**: Increased complexity in membership management code; requires database cascade or manual transaction isolation during membership updates.

---

### [ADR-0012] Explicit Non-Retroactivity Simplification for OU Moves
- **Status**: Approved
- **Date**: 2026-07-08
- **Authors**: AI Coding Agent
- **Context**: When an employee is promoted, transferred, or moves from one formal department (Organization Unit) to another, their historical learning record and active training tracks must remain predictable and stable. Retroactively removing all active trainings from their old department and assigning all trainings from their new department could trigger massive accidental data loss (e.g., deleting a completed training because the old department is no longer assigned, or overwhelming them with 20 newly assigned lessons).
- **Decision**:
  - Implement a strict, explicit simplification: **Moving a user to a different OU does NOT retroactively reconcile assignments**. Previously materialized assignment instances and completed training logs remain fully intact.
  - Only direct membership modifications in active OUs/Groups (explicit joins/leaves) trigger dynamic synchronization.
  - This design choice is spelled out clearly for future engineers to preserve training compliance stability and prevent accidental compliance deletion.
- **Consequences**:
  - **Positives**: Complete predictability of historical user states; compliance record preservation; prevents unexpected cascading database deletions or accidental mass notifications.
  - **Negatives**: Admins must manually assign new trainings or rely on future-scheduled assignments for incoming transfers.

---

### [ADR-0013] Generic Reusable Audit Log and Dynamic Overdue Reminder Engine
- **Status**: Approved
- **Date**: 2026-07-08
- **Authors**: AI Coding Agent
- **Context**: Regulatory training compliance requires robust auditing of all system changes. Furthermore, reminding users of overdue training is a primary requirement, but must be throttled to avoid spamming.
- **Decision**:
  - **AuditLog**: Create a central `audit_logs` model that maps a polymorphic `entityType` and `entityId` to an `action` and `metadata` JSON blob. This is integrated directly via a generic `AuditLogService` used by all business domains (assignments, user management, group changes).
  - **Throttling Overdue Alerts**: Add a `lastReminderSentAt` column directly on `UserAssignmentInstance`. The daily scheduler task (`purgeExpiredAssignments` & `sendBasicReminders`) runs a check of active past-due assignments. It only dispatches a notification if the current date is at least 14 days after `lastReminderSentAt` (or if no reminder was ever sent), setting the timestamp upon successful dispatch.
- **Consequences**:
  - **Positives**: High-fidelity compliance trail; very low operational risk; completely prevents email spamming for overdue courses.
  - **Negatives**: The 14-day throttle is globally hardcoded in this MVP pass and cannot be customized per-assignment.

---

### [ADR-0014] SCORM Content Engine & Provider Architecture
- **Status**: Approved
- **Date**: 2026-07-10
- **Authors**: AI Coding Agent
- **Context**: SmartCookie requires support for importing, cataloging, and running SCORM 1.2 compliant package payloads, as well as tracking student runtime attempts and rolling up progress securely to parent assignment instances.
- **Decision**:
  - **Provider Architecture**: Implemented a core `Content` model with a `providerType` enum (set to `'SCORM_1_2'`, with other providers reserved) and established a unified Content-extends-Lesson schema.
  - **Path Traversal / Zip-Slip Mitigation**: Enforced strict filename sanitization, parent-directory boundaries (`path.relative` check) on extract, and dynamic regex blockades against any double-dot patterns (`../`, `%2e%2e`) in player asset routing.
  - **Version Control via Separated Rows**: Grouped multiple versions of a package using a common `contentGroupId` UUID to keep historical attempt relationships completely stable.
  - **SCORM 1.2 Runtime Adapter**: Injected a fully-compliant sandbox client API bridge (`window.API`) to buffer runtime student status, scores, and times, saving them via periodically-throttled JSON commit calls.
- **Consequences**:
  - **Positives**: Bullet-proof container path-traversal security; highly granular performance audits; clear version isolation; seamless integration with the existing Lesson assignment and reports engine.
  - **Negatives**: Imports are processed synchronously (fine for standard packages under 50MB); visual differential file-tree comparators are deferred.

---

### [ADR-0015] Custom Profile Fields and Transactional Bulk User Provisioning
- **Status**: Approved
- **Date**: 2026-07-13
- **Authors**: AI Coding Agent
- **Context**: SmartCookie requires a highly flexible system for capturing custom user profile attributes (e.g. "Department", "Hire Date") while preserving speed for core platform listings. Furthermore, administrators need to bulk-provision hundreds of users from a CSV spreadsheet reliably, with zero partial failures.
- **Decision**:
  - **Hybrid Profile Storage Split:** Core system fields (first name, last name, profile picture path, last login) are stored as physical columns on the `User` table for rapid sorting and filtering. Dynamic custom attributes are configured via the Entity-Attribute-Value (EAV) pattern using `ProfileFieldCategory`, `ProfileFieldDefinition`, and `ProfileFieldValue` tables.
  - **Decoupled Field-Level Permissions:** Edit privileges for custom fields are kept independent of RBAC's coarse `module:action` model. Each custom field specifies `editableByUser` (self-service) and is linked to specific authorized role IDs (`FieldEditableByRole`) who can edit it on behalf of other users.
  - **All-or-Nothing Transactional Bulk Import:** Rather than allowing partial failures (where 80% of rows succeed and 20% fail, leaving the administrator with a messy manual correction process), the CSV bulk-import engine confirms all creations inside a single SQL database transaction (`prisma.$transaction`). If a single row fails validation or constraint checks, the entire batch is rolled back instantly.
- **Consequences**:
  - **Positives**: Extreme schema flexibility; fast listing for standard operations; robust granular access to individual profile fields; high-integrity bulk provisioning that guarantees a clean, unpolluted database state.
  - **Negatives**: Custom field queries require database joins (mitigated by bulk-loading values during details fetching); a single typo in a massive 500-user CSV rolls back the entire bulk operation, necessitating strict validation feedback.

---

### [ADR-0016] Multi-Factor Authentication (MFA) with TOTP & Secrets Encryption
- **Status**: Approved
- **Date**: 2026-07-15
- **Authors**: AI Coding Agent
- **Context**: SmartCookie requires a highly secure and flexible Multi-Factor Authentication (MFA) system to protect user accounts, especially for high-privileged roles. This system must be customizable per company, handle lost devices securely, and encrypt sensitive TOTP secrets at rest to mitigate database-leak exposure.
- **Decision**:
  - **Encryption-at-Rest Requirement**: Realized the project's first cryptographic encryption for values at rest. When MFA is enabled, the TOTP secret is encrypted using AES-256-GCM via the `MFA_ENCRYPTION_KEY` environment secret. The IV, auth tag, and encrypted ciphertext are serialized in the format `ivHex:authTagHex:encryptedHex`. This shields the TOTP secret from compromise even if the database is fully leaked.
  - **MFA_CHALLENGE and MFA_SETUP Token Patterns**: Designed a secure multi-stage login flow. If a user has MFA enabled, initial credential verification returns a short-lived (5 minutes), single-use `MFA_CHALLENGE` token instead of a session cookie. The user must submit this token with a valid TOTP code to complete authentication. If MFA is mandated by company policy but the user has not enrolled, they receive an `MFA_SETUP` token, forcing them through a secure, single-purpose setup wizard.
  - **Mandatory-vs-Optional MFA Policy Design**: Supported highly granular tenant-wide MFA policies. Companies can set `mfaPolicy` to `DISABLED`, `OPTIONAL`, `ENFORCED` (all users), or `ROLE_BASED` (users belonging to selected roles mapped via the `mfa_policy_roles` join table). These policies are checked on login, forcing unenrolled matching users to complete TOTP setup before they can establish an active session.
  - **Single-Use Recovery Codes**: Upon enabling MFA, the user receives 10 random 10-character recovery codes. These are stored as SHA-256 hashes (`mfa_recovery_codes`). During login, a hashed code can be transactionally matched, consumed, and deleted to bypass TOTP exactly once.
  - **Administrative Fallback**: Implemented an admin reset action (`POST /api/users/:id/admin-reset-mfa` gated on `users:edit` permission) which transactionally disables MFA and purges recovery codes, allowing users to recover from lost devices and re-enroll.
- **Consequences**:
  - **Positives**: Complete enterprise-grade protection against compromised credentials; cryptographically secure secrets at rest; robust policy controls; secure lost-device recovery; no storage of plain-text secrets or recovery codes.
  - **Negatives**: Minor friction during login for gated users; require secure storage and rotation strategy for the master `MFA_ENCRYPTION_KEY`.

---

## 🔮 Planned ADRs (updated)

- **ADR-0006: Authentication Strategy**: Detailing the Superuser,
  Setup Wizard, and Email/Password provider implementation (MVP scope).
- **ADR-0007: Client Routing**: React Router integration and active
  state triggers.
- **ADR-0008: Deployment & Installation Strategy**: Apache reverse-proxy
  topology for self-hosted deployment, single-command installer design,
  and formalizing the "wizard-only configuration" constraint referenced
  in docs/architecture.md.

(Previously "ADR-0006: Relational Databases vs Document Stores" removed —
resolved by ADR-0004.)
