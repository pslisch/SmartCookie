# AI Project Map

This document serves as the top-level directory map and semantic index of the **SmartCookie** repository for AI coding assistants. It provides structured insights into directory purposes, system dependencies, and documentation hierarchy.

---

## 📂 Repository Directory Map

### 1. Application Core
- **`src/`**: Parent directory containing all client-side UI files, features, and runtime resources.
- **`src/main.tsx`**: Entry point where React renders inside the HTML context.
- **`src/App.tsx`**: Main visual orchestrator coordinating layout view states and importing features.

### 2. Feature Modules
- **`src/features/`**: Parent directory for independent and self-contained business logic modules.
  - **`src/features/lessons/`**: Contains page files, components, and types related to the student hub and enrolled lessons list.
  - **`src/features/catalog/`**: Holds pages, tracking logic, and curriculum card components for searching/filtering course streams.

### 3. Shared Layer
- **`src/shared/`**: Directory for resources, components, types, and hooks shared across multiple features.
  - **`src/shared/components/layout/`**: Core shell viewports, persistent headers, sticky navigation bars, and footers.
  - **`src/shared/types/`**: Common TS definitions, tab selectors, and system enums.

### 4. Developer Documentation
- **`docs/`**: Home for standard markdown guidelines created for human developers (Constitution, Coding Standards, etc.).

### 5. AI Project Metadata
- **`.ai/`**: Hidden registry and indexing home containing machine-parsable metadata index lists, architecture decision logs, and standard coding templates.

---

## 🔗 The Docs and AI Metadata Paradigm

The workspace splits general documentation and technical indices to optimize developer reading speed and AI agent scanning accuracy:

```
                  +--------------------------------+
                  |       SmartCookie Root         |
                  +--------------------------------+
                                  |
         +------------------------+------------------------+
         |                                                 |
+------------------+                              +------------------+
|      docs/       |                              |       .ai/       |
| (Developer Docs) |                              |   (AI Metadata)  |
+------------------+                              +------------------+
| - Guidelines     |                              | - Indexes        |
| - Coding Rules   |                              | - Component Maps |
| - Visual Design  |                              | - API Specs      |
| - Team Workflows |                              | - Code Templates |
+------------------+                              +------------------+
```

- **`docs/`**: Curated, high-level developer specifications. These document the **"Why"** and **"How"** behind our engineering decisions, serving as the system's human constitution.
- **`.ai/`**: High-density, comprehensive indices and specs detailing **"What"** exists in the repo. These index files provide exact mappings of components, props, endpoints, and events for precise, high-speed automated reading.
