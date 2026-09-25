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
- **Path**: Captured by setup state logic (`status === 'superuser' | 'superuser-mfa' | 'company' | 'mail-config' | 'identity-provider' | 'org-structure' | 'role-templates'`)
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

### 8. Management Hub (Consolidated Administrative Hub)
- **Path**: Local State Tab & Hash URL (`#management`, legacy `#settings` redirects to `#management`)
- **Component**: `src/features/management/pages/Management.tsx`
- **Guards**: `AppGate` session verification (bounces to login if no active session), plus frontend permission check (bounces to `my-lessons` if no administrative permission)
- **Permissions**: Requires active session with any administrative permission (`roles:manage`, `users:view`, `organization:*`, `assignments:*`, `profile-fields:manage-fields`, `theme:view`, `notifications:*`, or Superuser)
- **Hub Cards**:
  - **Users, Groups & Roles** (`#card-org-mgmt`): 5-tab workspace (`Users`, `Organization Structure`, `Learning Groups`, `Expiring Groups`, `Roles`) with per-tab permission gating.
  - **Content Management** (`#card-assignment-mgmt`): Course/lesson catalog and distribution dispatcher.
  - **Field Builder** (`#card-field-builder`): Profile field categories and dynamic attribute builder (`FieldBuilder.tsx`).
  - **Theme Management** (`#card-theme-management`): Theme and branding customization dashboard (`ThemeManagement.tsx`).
  - **Notifications** (`#card-notifications`): Consolidated notifications hub with permission-gated sub-tabs for Rules, Delivery Failures, Scheduled Notifications, and Email Templates (`NotificationsHub.tsx`).

### 9. Full User Profile
- **Path**: Local State Tab & Hash URL (`#profile`)
- **Component**: `src/features/profiles/pages/FullProfile.tsx`
- **Guards**: `AppGate` session verification (bounces to login if no active session)
- **Permissions**: Authenticated user (Status: `ACTIVE`)

### 10. Confirm Email Change
- **Path**: Custom action segment (`/confirm-email?token=...`)
- **Component**: `src/features/auth/pages/ConfirmEmail.tsx`
- **Guards**: Intercepted in `AppGate` as a public action
- **Permissions**: Public access with valid email-change token

### 11. SCORM Content Preview Player
- **Path**: Full-screen standalone URL (`/preview/content/:contentId`)
- **Component**: `src/features/content/components/ScormPreviewPlayer.tsx`
- **Guards**: Intercepted in `App.tsx` before main shell rendering; provides untracked in-memory preview
- **Permissions**: Authenticated session with `content:view` permission

### 12. Theme Test Mode Parameter Override
- **Path**: Any application route with `?test=:themeId` URL query parameter
- **Component**: Global application shell (`Shell.tsx`) with `ThemeTestBanner.tsx` and `ThemeRuntimeContext.tsx`
- **Guards**: Intercepted by `ThemeRuntimeContext` and server `ThemeResolutionService`. Validates caller session and permissions; if the theme does not exist or user lacks permission, quietly falls back to active company theme.
- **Permissions**: Requires active session with `theme:view` permission

