# Preview as Role — Frontend-Only Visual Preview Engine

The **Preview as Role** module introduces a first-class, secure visual simulation tool for SmartCookie. It enables corporate administrators and content managers to instantly test and view the application interface through the lens of other, lower-privileged roles (e.g. `Learner`, `Manager`, or custom organizational roles) without modifying or compromising backend API authorization.

---

## 🛠️ System Design & Philosophy

This preview engine is strictly **frontend-only (cosmetic)**. All database transactions, authentication state sessions, and actual administrative API requests continue to be validated and enforced against the user's *real* session profile. 

```
+---------------------------------------------------------------------------------------+
|                                  BROWSER (FRONTEND)                                   |
|                                                                                       |
|   +--------------------+          +---------------------+          +---------------+  |
|   |  Navbar Picker /   |  ----->  |   PreviewContext    |  ----->  | PreviewBanner |  |
|   |  Shortcut Buttons  |          | (Active role state) |          | (Slim alert)  |  |
|   +--------------------+          +---------------------+          +---------------+  |
|                                              |                                        |
|                                              v                                        |
|                                   +---------------------+                             |
|                                   |  usePermission()    |                             |
|                                   | (Override enabled)  |                             |
|                                   +---------------------+                             |
|                                              |                                        |
|                                              | (Ignores isSuperuser bypass)           |
|                                              v                                        |
|                                    +-------------------+                              |
|                                    | UI Elements Hidden|                              |
|                                    +-------------------+                              |
+----------------------------------------------|----------------------------------------+
                                               | (Authenticates with REAL session cookie)
                                               v
+---------------------------------------------------------------------------------------+
|                                  SERVER (EXPRESS API)                                 |
|                                                                                       |
|                               +-----------------------+                               |
|                               |  requirePermission()  |                               |
|                               |  (Standard RBAC Gate) |                               |
|                               +-----------------------+                               |
|                                              |                                        |
|                                              v                                        |
|                               +-----------------------+                               |
|                               |   Prisma / Database   |                               |
|                               +-----------------------+                               |
+---------------------------------------------------------------------------------------+
```

### Key Pillars:
1. **Zero-Trust Backend:** The backend has no concept of "preview mode." It continues to authorize incoming HTTP requests using the standard relational RBAC and superuser session check middlewares.
2. **Suspended Superuser Bypass:** During an active preview, the typical `isSuperuser` automatic override is suspended in the client-side `usePermission()` checks. This forces the UI to respect the exact permissions mapped to the targeted preview role.
3. **In-Memory Volatility:** The preview state resets instantly on a browser reload. This guarantees that administrators never get permanently locked into a limited visual layout or suffer navigation confusion.

---

## 🔐 Permission Gating: The Subset Rule

To prevent unauthorized users from exploring high-privileged configurations, the preview feature is gated by a strict permission gate:
* Users must possess the `preview:use` permission to activate the mode.
* The available roles listed inside the picker are constrained by the **strict subset rule**: A target role is only previewable if its effective permissions are a *strict subset* of the current user's effective permissions. 
* If a target role possesses even a single permission that the active administrator does not have, it is excluded from the list returned by the eligible-roles endpoint.

---

## 🧭 JSON API Endpoints

### 1. Retrieve Eligible Target Roles
* **Endpoint:** `GET /api/preview/eligible-roles`
* **Controller File:** `server/src/features/preview/routes/preview.routes.ts`
* **Response Payload:** `Array<{ id: string, name: string }>`
* **Description:** Resolves the current user's effective permission registry (including hierarchical single-parent inheritances), loops through all non-protected custom and system roles, and returns only those roles whose permissions are a strict subset of the user's.

### 2. Retrieve Flat Permission Registry for a Role
* **Endpoint:** `GET /api/roles/:id/effective-permissions`
* **Response Payload:** `Array<string>` (e.g. `["content:view", "assignments:view"]`)
* **Description:** Resolves and flattens all `module:action` permission lines mapped directly or inherited by the target role ID.

---

## 🎨 Visual Elements

### 🎗️ `PreviewBanner.tsx`
* Mounted globally in `src/shared/components/layout/Shell.tsx` above the navigation bar.
* Features a slim, elegant amber banner displaying the current previewed role name.
* Includes an "Exit Preview" button that triggers in-memory reset.
* Styled with responsive fluid padding and transition motion animations.

### 🧭 `Navbar.tsx` Popover Picker
* Gated on `usePermission('preview', 'use')`.
* Toggles a dropdown menu next to the standard account icon showing the eligible roles.
* Adapts dynamically for mobile screens with a touch-friendly wrapped selection matrix inside the mobile navigation drawer.

### 🚀 "Preview as Learner" Shortcuts
* Integrated into `ContentLibrary.tsx` and `ContentImportWizard.tsx`.
* Detects the presence of a default `Learner` role and places a prominent test shortcut button.
* Accelerates course deployment workflows by allowing content designers to instantly simulate a student's screen with a single click.
