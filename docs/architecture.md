# System Architecture

This document describes the architectural patterns and layout mechanics of the **SmartCookie** LMS.

## 🏗️ Overview

SmartCookie is structured as a high-performance **Single Page Application (SPA)** built on **React 19**, bundled using **Vite 6**, and styled with **Tailwind CSS v4**.

The current release sets up the foundational **Client-Side Shell** with responsive navigation, static view containers, and local UI state transitions.

```
+-----------------------------------------------------------+
|                        App.tsx                            |
|               (Application Orchestrator)                  |
+-----------------------------------------------------------+
                              |
       +----------------------+----------------------+
       |                                             |
+--------------+                               +--------------+
| Layout Shell |                               | Router/State |
|  - Nav Bar   |                               |  - Current   |
|  - Content   | <--- [Render Active Page] ---|    View      |
|  - Footer    |                               |    (State)   |
+--------------+                               +--------------+
                                                      |
                                       +--------------+--------------+
                                       |                             |
                               +---------------+             +---------------+
                               | MyLessons.tsx |             |  Catalog.tsx  |
                               | (Start Page)  |             | (Course List) |
                               +---------------+             +---------------+
```

---

## 📂 Key Folders & Responsibilities

- **`src/navigation/`**: Manages top-level navigation, responsive drawer elements, and desktop layout links.
- **`src/components/layout/`**: Manages the viewport-filling Shell component that anchors the footer at the bottom and coordinates layout-level flex constraints.
- **`src/pages/`**: Holds independent view templates (e.g., dashboard, catalog) that render depending on the current route/view.
- **`src/types/`**: Contains TS models and standard contracts for the application.

---

## 🔄 Data Flow Patterns

- **UI Navigation**: Currently driven by React local state (`currentTab`) in `App.tsx` which maps tabs to active page renders.
- **Layout & Structure**: Desktop uses full-width padded containers with flex-column bounds; mobile employs a clean swipe/tap layout with full screen overlay transitions.
- **Configuration**: Uses `package.json` dynamically for core package variables (e.g. app name, version) so changes to package configs propagate immediately.
