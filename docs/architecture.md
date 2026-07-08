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
- **`src/shared/components/AppGate.tsx`**: System access orchestrator. Intercepts visual mounting, polls setup status, manages active user states, blocks access to child layouts, intercepts invitation activation or password reset tokens from URLs, and routes users to appropriate portals (`SetupWizard`, `Login`, `AcceptInvitation`, `ResetPassword`, or `ForgotPassword`).
- **`src/features/auth/pages/SetupWizard.tsx`**: Dynamic multi-step form that guides initial system setup. Step 1 collects superuser credentials (enforces database-level uniqueness and complexity rules); Step 2 registers company profiles.
- **`src/features/auth/pages/Login.tsx`**: High-density secure administrator form with redirect-back tracking. Includes a portal toggle for the secure Forgot Password recovery path.
- **`src/features/auth/pages/AcceptInvitation.tsx`**: Account activation workflow. Collects new password input, enforces the system-wide password policy, activates the user, and initiates an immediate log in.
- **`src/features/auth/pages/ForgotPassword.tsx`**: Privacy-safe recovery trigger. Implements an enumeration-free frontend, showing the exact same confirmation regardless of whether the email is registered or not.
- **`src/features/auth/pages/ResetPassword.tsx`**: Action page for the recovery flow. Consumes the cryptographic token, validates the new password, destroys all other device sessions to protect compromised credentials, and creates a fresh session.
- **`src/features/rbac/pages/Settings.tsx` & `RoleManagement.tsx`**: Administrative control center for role registries, parent mappings, and permission grids.
- **`src/shared/hooks/usePermission.ts`**: High-performance permission hooks that leverage session states and company-wide inheritance context, offering dynamic short-circuiting for Superusers.
- **`src/shared/components/layout/Shell.tsx`**: Layout envelope anchoring nav-bars, footers, and active content canvas.
- **`src/shared/components/layout/Navbar.tsx`**: Responsive header syncing client tabs with active URL fragments.

### Backend Architecture (ADR-0004)
- **`server/src/features/auth/routes/setup.routes.ts`**: Handles system status checks and initialization forms. Protected by a complete-check middleware that returns 403 Forbidden once the wizard is finalized.
- **`server/src/features/auth/routes/auth.routes.ts`**: Houses session controllers including secure login, active identity fetching, sign-out invalidation, activation/acceptance, forgot password, and reset password handlers.
- **`server/src/features/auth/routes/users.routes.ts`**: Implements user creation and administration routes (`POST /api/users/invite`, `POST /api/users/:id/resend-invitation`, and `POST /api/users/:id/admin-reset-password`). Gated dynamically via the generic `requirePermission` access checker.
- **`server/src/features/rbac/routes/`**: Implements routes for system permissions (`permissions.routes.ts`), company-level setting parameters (`company.routes.ts`), and role management (`roles.routes.ts`). Gated under `roles:manage` control.
- **`server/src/features/rbac/services/`**: Coordinates transaction boundaries for editing roles, matching permission grids, and resolving hierarchical parent relationships (`role.service.ts`, `permissionResolver.service.ts`, and `roleTemplates.service.ts`).
- **`server/src/features/auth/services/setupWizard.service.ts`**: Coordinates transaction boundaries for establishing the system's root superuser and company profile.
- **`server/src/features/auth/services/userInvitation.service.ts`**: Encapsulates invitation and resend workflows, ensuring proper transactional token generation and delivery.
- **`server/src/features/auth/services/auth.service.ts`**: Encapsulates credential extraction, validation, and secure cryptographic password matching.
- **`server/src/shared/token/token.service.ts`**: Offers secure generation, SHA-256 storage, TTL enforcement, and single-use validation of invitation and reset tokens.
- **`server/src/shared/email/email.service.ts`**: Handles transactional notification delivery as specified in **ADR-0005**.
- **`server/src/shared/middleware/requirePermission.ts`**: Reusable route-level Express middleware that checks active user sessions, resolves module/action permission trees, evaluates single-parent inheritance chains, and short-circuits to allow unrestricted access for Superusers.

---

## 🔄 Data Flow Patterns

- **Initialization Pipeline**: On load, `AppGate` triggers a non-blocking request to `GET /api/setup/status`. If status is `superuser` or `company`, the Setup Wizard takes over the layout. Once complete, users are guided through the secure credential form.
- **Session & Identity**: After successful credentials validation, the server creates a unique `sessions` database entry and returns an HTTP-Only signed cookie (`sid`). Subsequent requests pass this cookie to authorize sensitive state changes.
- **Profile Integrity Notification (ADR-0005)**: When changing an administrator's `recoveryEmail` via `PATCH /api/auth/recovery-email`, the system locks the change in the database and fires a security alert immediately to the *old* recovery address, mitigating account hijacking vectors.
- **Permission Verification & Path Resolution**: When accessing a protected page/route, the application checks permissions against the user's assigned role. If the company-wide global toggle `roleInheritanceEnabled` is active, the system's path resolver crawls recursively up the defined parent-role tree, accumulating permissions dynamically while actively shielding against cyclic loops. Superusers bypass all traversal logic entirely.


## 🌐 Internationalization (i18n)

SmartCookie includes a fully configured internationalization engine implemented under `src/shared/i18n/`.

- **Framework**: `i18next` and `react-i18next` manage runtime state, hook-based translation lookup, and resource caching.
- **Detection & Persistence**: Language selection defaults to browser `navigator` and is cached/retrieved via browser `localStorage` dynamically through `i18next-browser-languagedetector`.
- **Namespaces**: Localized keys are isolated within functional domains. We use a single global namespace `common` (located in `src/shared/i18n/locales/en/common.json`) to store global UI components (navigation, brand elements, footer labels), which can be scaled per-feature later.
- **Logical Tailwind Properties**: To facilitate future Right-to-Left (RTL) language extensions without costly layout rewrites, we strongly encourage logical styling classes (e.g., `start-0`, `end-0`, `ms-2`, `pe-4`) instead of absolute physical properties (`left-0`, `right-0`, `ml-2`, `pr-4`) for all new UI elements.

---

## 📅 Learning Assignments, Target Resolution, & Auditing

SmartCookie v1.7.0 introduces a robust, enterprise-grade learning assignment subsystem. This architecture enables administrators to assign educational courses and lessons to individual learners, dynamic Organization Units (OUs), or specific Learning Groups, materializing individual learner progress tracks.

### 1. Architectural Model Splitting
To prevent database bottlenecks and redundant data storage, the subsystem separates administrative intention from individual tracking state:
* **`Assignment`**: An administrative record representing the action of assigning a course or lesson to a group of targets with a given due date.
* **`AssignmentTarget`**: A join record mapping an active `Assignment` to physical entities, supporting polymorphic targets (`userId`, `organizationUnitId`, or `learningGroupId`).
* **`UserAssignmentInstance`**: An individual record representing the actual learning track, containing completion status (`ACTIVE`, `COMPLETED`, `CANCELLED`, `ARCHIVED`), due dates, progress percentage, started/completed timestamps, and overdue notification logs.

### 2. Dynamic Target Resolution Engine (`TargetResolutionService`)
Upon creating an assignment, the target resolution engine dynamically compiles the flattened list of target user IDs:
* Direct user targets are resolved immediately.
* Organization Unit targets are parsed recursively; the engine walks down the organizational unit hierarchy tree, capturing all child and grandchild OUs, and aggregates active memberships.
* Learning Group targets resolve directly to active group member IDs.

### 3. Multi-Source Qualifying Links & De-duplication
A learner can qualify for the same lesson assignment via multiple paths simultaneously (e.g., being targeted directly, belonging to an assigned OU, and belonging to an assigned Learning Group).
* To prevent duplicate active assignments, a learner gets exactly one `UserAssignmentInstance` per unique `(assignmentId, userId)` pair.
* To support overlapping paths, the system creates `UserAssignmentInstanceSource` records linking the single instance to each qualifying target path.
* **Dynamic Membership Hooks (`MembershipAssignmentHooksService`)**: When a user leaves an OU or Group, the associated `UserAssignmentInstanceSource` record is deleted. If other qualifying sources remain, the instance survives and remains `ACTIVE`. If the last qualifying source is deleted, the instance status automatically updates to `CANCELLED` to reflect the change in eligibility.

### 4. Non-Retroactivity Policy for OU Moves
SmartCookie implements a strict **non-retroactivity rule for organizational transfers**:
* When a user is moved to a different OU, their previously materialized assignment instances and completed training histories remain completely intact and untouched.
* This is an explicit, simplifying design choice made to guarantee data predictability, protect training logs, and prevent accidental data loss for compliance auditing.

### 5. Unified Audit Logging (`AuditLogService`)
A centralized, generic `audit_logs` database table captures and records all administrative adjustments (such as assignment creation, cancellations, user reactivations, or membership changes) with a polymorphic mapping (`entityType`, `entityId`), an actor reference, and rich JSON metadata. This supports enterprise-grade logging and external compliance reporting.

### 6. Scheduled Background Dispatchers (`ScheduledTasksService`)
A daily cron job handles system cleanups and alerts:
* **Purge Soft-Deletes**: Permanently deletes soft-deleted records (`deletedAt` is set) whose `permanentDeleteAt` retention window (14 days) has elapsed, covering assignments, assignment instances, and memberships.
* **Overdue Notifications**: Scans active past-due user assignment instances and sends automated email alerts via `EmailService`. Alerts are strictly throttled to a maximum frequency of once every 14 days per instance using `lastReminderSentAt` to prevent spamming.

---

## 🚀 Deployment Targets & Production Topology

The production architecture for SmartCookie has been finalized and implemented as a robust, fully automated, self-healing topology on a dedicated Ubuntu VPS.

```
+---------------------------------------------------------------------------------------------------------+
|                                           PRODUCTION SERVER (UBUNTU VPS)                                |
|                                                                                                         |
|       Incoming Traffic (Port 80/443)                                                                    |
|                      |                                                                                  |
|                      v                                                                                  |
|         +-------------------------+                                                                     |
|         |    Apache Web Server    | <--- Handles SSL Termination (Let's Encrypt) & security headers     |
|         +-------------------------+                                                                     |
|            |                      |                                                                     |
|            | (Proxy /api/* & static)                  | (SMTP Relay / port 25)                          |
|            v                                          v                                                 |
|   +-------------------+                     +-------------------+                                       |
|   |  Node.js Process  |                     | Postal Containers | <--- Mail delivery daemon               |
|   | (Local port 3000) |                     |  (Local Port 5000)|                                       |
|   +-------------------+                     +-------------------+                                       |
|            |                                          |                                                 |
|            v                                          v                                                 |
|   +-------------------+                     +-------------------+                                       |
|   | Host MariaDB Server|                     | Dedicated MariaDB |                                       |
|   |    (Port 3306)    |                     |  Docker Container |                                       |
|   |                   |                     |    (Port 3307)    |                                       |
|   +-------------------+                     +-------------------+                                       |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+
```

### 1. Ingress Layer (Apache Reverse Proxy)
Apache acts as the public-facing gatekeeper, binding to port 80 and 443 on the public interface.
* **SSL Termination:** Managed via Let's Encrypt SSL certificates (configured and renewed automatically by Certbot).
* **Proxy Routing:** Requests are forwarded securely to the downstream application server over the loopback interface on local port `3000`.
* **Security Headers:** Enforces strict headers (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`).

### 2. Application Layer (Systemd Node Service)
The full-stack Express server runs as a systemd service (`smartcookie.service`) utilizing a compiled ESM/CommonJS bundle:
* **Entry Point:** Executed via `node dist/server.cjs` on `127.0.0.1:3000`.
* **Process Management:** Automatic start on system boot and automatic restart with a 10-second delay in case of application failures.
* **Trust Proxy:** Express is configured with `app.set('trust proxy', 1)` to accurately detect secure TLS connections forwarded from Apache, ensuring session cookies are handled securely.

### 3. Database Layer (Host MariaDB)
Persistent relational storage is managed via Prisma ORM connecting to the host's native MariaDB server on port `3306`. Connection credentials and secure variables are locked inside `.env` with restricted read permissions (`600`).

### 4. Mail Subsystem (Postal Server Stack)
To ensure reliable, high-volume transactional email delivery (invitations, password resets, profile security warnings), SmartCookie integrates a private **Postal Mail Server**:
* **Infrastructure:** Runs as an isolated Docker container stack.
* **Isolated Database:** Postal runs its own dedicated MariaDB database container. It is mapped to host port **3307** to completely isolate it and prevent port conflicts with SmartCookie's host MariaDB on port 3306.
* **Authentication:** Integrates SPF, DKIM key signatures derived directly from the database, and strict DMARC rules for exceptional deliverability.
* **Server PTR (Reverse DNS):** The VPS IP has a custom PTR record pointing back to the mail server hostname (`postal.yourdomain.com`), proving sender validity to major mail providers.


