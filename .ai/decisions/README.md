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
