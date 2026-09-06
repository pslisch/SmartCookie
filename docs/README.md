# SmartCookie LMS

A modern, enterprise-grade full-stack Learning Management System (LMS) designed to deliver personalized, compliant, and seamless learning experiences. SmartCookie features a hardened Node.js/Express backend with Prisma ORM, an interactive React client with Tailwind CSS v4, hierarchical RBAC, dynamic organization units and learning groups, multi-target assignment engines, SCORM 1.2 package execution, TOTP Multi-Factor Authentication, Microsoft Entra ID directory synchronization, and a real-time tenant theme and branding studio.

---

## 🛠️ Technology Stack

### Frontend Client
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Motion](https://motion.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Internationalization**: [i18next](https://www.i18next.com/)

### Backend Server & Data Layer
- **Runtime & Server**: [Node.js](https://nodejs.org/) & [Express 4](https://expressjs.com/) (`tsx` execution)
- **Database & ORM**: [Prisma ORM 7.8](https://www.prisma.io/) with [MariaDB 3.5](https://mariadb.org/) (36-model relational schema)
- **Security & Crypto**: [Argon2](https://github.com/ranisalt/node-argon2), [Jose](https://github.com/panva/jose), [Otplib](https://github.com/yeojinj/otplib), AES-256-GCM encryption
- **Content & Packaging**: [Adm-Zip](https://github.com/cthack-0/adm-zip), [Fast-XML-Parser](https://github.com/NaturalIntelligence/fast-xml-parser), [Fontkit](https://github.com/foliojs/fontkit)
- **Email & Communications**: [Nodemailer](https://nodemailer.com/) with database-stored encrypted SMTP relay

### Deployment & Infrastructure
- **Installer**: Automated production installer suite (`deploy/`) for Ubuntu 22.04/24.04 LTS
- **Web Server**: Apache 2.4 reverse proxy with automated Let's Encrypt Certbot SSL
- **Process Supervision**: `systemd` service unit (`smartcookie.service`)

---

## 🚀 Getting Started

### Prerequisites

Before running, copy `.env.example` to `.env` and configure `DATABASE_URL` (pointing to a running MariaDB instance), `SESSION_SECRET`, `MFA_ENCRYPTION_KEY`, and `SMTP_*` values — the application requires a database connection to boot.

Ensure you have [Node.js](https://nodejs.org/) (v18+) and [npm](https://www.npmjs.com/) installed.

### Development Server

Start the local development server:

```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### Production Build

Compile the production-ready frontend bundle and backend CommonJS bundle:

```bash
npm run build
```

---

## 📂 Project Structure Overview

The project is structured modularly across client, server, and deployment layers to promote separation of concerns, scalability, and maintainability:

```
├── deploy/                   # Production deployment automation (Apache, MariaDB, systemd, SSL)
├── docs/                     # Developer documentation (Constitution, Architecture, Guidelines)
├── .ai/                      # AI-maintained indexes, decision records (ADRs), and blueprints
├── server/                   # Backend Express application & data layer
│   ├── prisma/               # Prisma ORM schema (36-model relational schema), migrations & seeds
│   └── src/
│       ├── features/         # Feature-oriented backend domains
│       │   ├── assignments/  # Learning assignment creation, targeting, materialization & reports
│       │   ├── auth/         # Authentication, setup wizard, session cookies & MFA services
│       │   ├── content/      # SCORM 1.2 zip import, manifest parsing & runtime attempt tracking
│       │   ├── identity/     # Microsoft Entra ID Graph API client, token validator & sync engine
│       │   ├── organization/ # Organization units (OUs), learning groups & manager assignments
│       │   ├── preview/      # Visual role preview eligibility resolution
│       │   ├── profiles/     # EAV custom field definitions, values & bulk CSV import
│       │   ├── rbac/         # Roles, permission matrices & hierarchical inheritance resolver
│       │   └── theme/        # Theme cascading resolution, lock heartbeats & font management
│       └── shared/           # Cross-cutting backend infrastructure (email, scheduler, audit, tokens)
├── src/                      # Frontend React client application
│   ├── features/             # Feature-oriented frontend modules
│   │   ├── assignments/      # Assignment management views, creation modals & report inspectors
│   │   ├── auth/             # Login, multi-step Setup Wizard, MFA setup & password reset views
│   │   ├── catalog/          # Curriculum course catalog and self-assignment flows
│   │   ├── content/          # SCORM Content Library, upload wizard & SCORM 1.2 runtime players
│   │   ├── identity/         # Microsoft Entra ID setup wizard steps and sync status
│   │   ├── lessons/          # Student hub (My Lessons) displaying active and enrolled studies
│   │   ├── management/       # Centralized administrative oversight and management hub
│   │   ├── organization/     # OU visual tree manager, learning groups, users & bulk import
│   │   ├── profiles/         # User profile views, dynamic field builder & MFA status
│   │   ├── rbac/             # Role management matrix, inheritance toggle & system settings
│   │   └── theme/            # Theme & branding editor, 28 color tokens, font library & test banner
│   ├── shared/               # Shared components, layout wrappers, runtime contexts & i18n
│   │   ├── components/       # AppGate, PreviewBanner, RequiredFieldReminder, ProfileFieldInput
│   │   ├── contexts/         # ThemeRuntimeContext, PreviewContext
│   │   └── layout/           # Viewports, sticky header, navigation, and footer (Shell, Navbar, Footer)
│   ├── App.tsx               # Main visual orchestrator, route coordinator & permission gate
│   ├── main.tsx              # Application mount point
│   └── index.css             # Tailwind CSS entries, @theme configuration, and global tokens
└── package.json              # Workspace manifest, unified dev and build scripts
```

---

## 📚 Documentation & Metadata Systems

The repository maintains a dual-layered information system:
- **`/docs/`**: Developer-focused guidelines, core constitution, coding standards, and system architecture.
- **`/.ai/`**: Internal AI-maintained knowledge base, structural indexes, service maps, and automated decision files.

Explore the detailed manual guidelines:
- [Constitution](./CONSTITUTION.md) — The core values and guidelines for the codebase.
- [Architecture](./architecture.md) — System design decisions, database model relationships, and directory layout rules.
- [Coding Standards](./coding-standards.md) — TypeScript and React guidelines.
- [UI Guidelines](./ui-guidelines.md) — Designing with the SmartCookie aesthetic.
- [Development Workflow](./development-workflow.md) — How features are designed, tested, and tracked.

Explore the AI-maintained indices & blueprints:
- [AI Project Map](../.ai/project-map.md) — Semantic directory map and component registry.
- [Architecture Decisions](../.ai/decisions/README.md) — Historical and ratified Architecture Decision Records (ADRs).
- [Repository State Audit](../.ai/decisions/repo-state-audit-2026-09-06.md) — Source of truth reconciliation report.
