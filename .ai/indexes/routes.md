# Route Index

This index acts as the central registry of all active visual routers and client-side view tabs.

---

## 🧭 Navigation Route Schema

Every listed visual route should eventually document:
- **Path**: Target URL route segment or local tab key.
- **Component**: The core page view component managing the render.
- **Guards**: Redirect hooks or session validators.
- **Permissions**: Roles allowed to navigate to the view.

---

## 🟢 Client View Routes (v1.1.0)

### 1. `my-lessons`
- **Path**: Local State Tab & Hash URL (`#my-lessons`)
- **Component**: `src/features/lessons/pages/MyLessons.tsx`
- **Guards**: `AppGate` session verification (bounces to login if no active session)
- **Permissions**: Authenticated user (Status: `ACTIVE`)

### 2. `catalog`
- **Path**: Local State Tab & Hash URL (`#catalog`)
- **Component**: `src/features/catalog/pages/Catalog.tsx`
- **Guards**: `AppGate` session verification (bounces to login if no active session)
- **Permissions**: Authenticated user (Status: `ACTIVE`)

### 3. Setup Wizard
- **Path**: Captured by setup state logic (`status === 'superuser'` or `status === 'company'`)
- **Component**: `src/features/auth/pages/SetupWizard.tsx`
- **Guards**: Auto-redirected by `AppGate` if database status indicates incomplete setup
- **Permissions**: Anyone (reaches 403 Forbidden once complete)

### 4. Secure Login
- **Path**: Standard fallback route when unauthenticated
- **Component**: `src/features/auth/pages/Login.tsx`
- **Guards**: `AppGate` interceptor (remembers original tab URL for redirect-back on success)
- **Permissions**: Public access
