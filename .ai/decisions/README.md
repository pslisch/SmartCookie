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

## 🔮 Planned ADRs

- **ADR-0004: Authentication Strategy**: Detailing Firebase Auth and route guard schemas.
- **ADR-0005: Client Routing**: React Router integration and active state triggers.
- **ADR-0006: Relational Databases vs Document Stores**: Comparison between Postgres and Firestore configurations.
