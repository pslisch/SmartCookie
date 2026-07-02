# SmartCookie Constitution

This document defines the core principles, engineering rules, and operational guidelines that govern the development of the **SmartCookie** Learning Management System. Every contributor and AI agent must adhere strictly to these rules.

---

## 📜 Core Directives

### 1. Documentation is the Single Source of Truth
- No code shall be written or altered without aligning with the documentation.
- The `docs/` directory is not decorative; it is the absolute authority on the system's design and intent.

### 2. Architectural Decisions Must Be Documented
- Any change to the system's data-flow, file structure, or layout mechanics must be preceded or accompanied by an update in `docs/architecture.md` or a new ADR (Architecture Decision Record) under `.ai/decisions/`.

### 3. Features Are Implemented One Task at a Time
- Avoid compounding changes or implementing secondary scopes in parallel.
- Work should be broken down into small, distinct, verifiable steps. Each step must compile and pass linting.

### 4. Reuse Existing Components Whenever Possible
- Do not reinvent the wheel. Before creating a new custom button, card, or modal, search the `src/shared/components/` directory for existing components that can be generalized or configured via props. Feature-local components live in `src/features/<feature>/components/` once a feature introduces one.

### 5. Keep the Project Modular
- Files must remain small, focused, and single-purpose.
- Avoid consolidating distinct modules or views into single files (e.g., do not build a massive, complex component in `App.tsx`; extract views to `src/features/<feature>/pages/` and structural blocks to `src/shared/components/layout/`).

### 6. Remove Dead Code Safely
- When a feature, page, or component is deleted, remove all associated unused imports, CSS, styles, utility functions, and types. Do not leave "commented out" code or orphan blocks.

### 7. Update Documentation Continuously
- Upon completion of a task, immediately update the relevant metadata indexes in `/.ai/indexes/*` and the AI project map in `/.ai/project-map.md` to keep the AI-maintained knowledge base accurate.
