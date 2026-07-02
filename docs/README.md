# SmartCookie LMS

A modern, scalable Learning Management System (LMS) designed to deliver highly personalized, seamless learning experiences. This project establishes the robust foundation shell, layout navigation, and comprehensive documentation indexing system.

---

## 🛠️ Technology Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Motion](https://motion.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18+) and [npm](https://www.npmjs.com/) installed.

### Development Server

Start the local development server:

```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### Build

Compile the production-ready build:

```bash
npm run build
```

---

## 📂 Project Structure Overview

The project is structured modularly to promote separation of concerns, scalability, and clean code principles:

```
docs/                     # Comprehensive documentation system
src/
├── assets/               # Static assets (images, logos, SVGs)
├── components/           # Reusable UI and shared components
│   ├── common/           # Domain-independent visual components (buttons, badges)
│   ├── layout/           # Page structural layout components (Shell, Content, Footer)
│   └── ui/               # Interactive UI pieces
├── navigation/           # Navigation bars, tabs, drawer layouts
├── pages/                # Independent views/screens (MyLessons, Catalog)
├── hooks/                # Custom React Hooks
├── services/             # API and external integrations (Placeholder)
├── contexts/             # Global React state providers (Placeholder)
├── types/                # TypeScript interfaces, types, and enums
├── utils/                # Helper functions and utilities
├── constants/            # Global application constants
├── routes/               # Navigation routing configuration (Placeholder)
├── styles/               # Global CSS files and theme overrides
├── App.tsx               # Main application component coordinating navigation/views
└── main.tsx              # Application mount point
```

---

## 📚 Documentation & Metadata Systems

The repository maintains a dual-layered information system:
- **`/docs/`**: Developer-focused guidelines, core constitution, coding standards, and manual workflow docs.
- **`/.ai/`**: Internal AI-maintained knowledge base, structural indexes, service maps, and automated decision files.

Explore the detailed manual guidelines:
- [Constitution](./CONSTITUTION.md) — The core values and guidelines for the codebase.
- [Architecture](./architecture.md) — System design decisions and directory layout rules.
- [Coding Standards](./coding-standards.md) — TypeScript and React guidelines.
- [UI Guidelines](./ui-guidelines.md) — Designing with the SmartCookie aesthetic.
- [Development Workflow](./development-workflow.md) — How features are designed, tested, and tracked.

Explore the AI-maintained indices & blueprints:
- [AI Project Map](../.ai/project-map.md) — Map of currently available and planned features (AI knowledge base).
