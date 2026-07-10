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

### 5. Account Activation / Accept Invitation
- **Path**: Custom action segment (`/activate?token=...` or `/accept-invitation?token=...`)
- **Component**: `src/features/auth/pages/AcceptInvitation.tsx`
- **Guards**: Public token verification hook in `AppGate`
- **Permissions**: Public access with valid single-use token

### 6. Forgot Password Recovery Request
- **Path**: Triggered via "Forgot Password" toggle from the Sign In view
- **Component**: `src/features/auth/pages/ForgotPassword.tsx`
- **Guards**: Local view transition state inside `AppGate`
- **Permissions**: Public access

### 7. Password Reset
- **Path**: Custom action segment (`/reset-password?token=...`)
- **Component**: `src/features/auth/pages/ResetPassword.tsx`
- **Guards**: Public token verification hook in `AppGate`
- **Permissions**: Public access with valid password-reset token

### 8. System Settings
- **Path**: Local State Tab & Hash URL (`#settings`)
- **Component**: `src/features/rbac/pages/Settings.tsx`
- **Guards**: `AppGate` session verification (bounces to login if no active session), plus frontend `usePermission('roles', 'manage')` hook (bounces to `my-lessons` tab if access is unauthorized)
- **Permissions**: Requires active session with `roles:manage` permission (Superuser bypasses)

### 9. Management Hub
- **Path**: Local State Tab & Hash URL (`#management`)
- **Component**: `src/features/management/pages/Management.tsx`
- **Guards**: `AppGate` session verification (bounces to login if no active session), plus frontend permission check (bounces to `my-lessons` if no administrative permission)
- **Permissions**: Requires active session with administrative permissions (e.g., `assignments:view`, `roles:manage`, etc., Superuser bypasses)


