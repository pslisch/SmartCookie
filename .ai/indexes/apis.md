# API Index

This index acts as the central registry of all internal, external, and REST API endpoints used across the SmartCookie application.

---

## 🔌 API Endpoint Specification

Every documented endpoint logs:
- **Endpoint**: The target URI path.
- **Method**: HTTP request method (`GET`, `POST`, `PATCH`, etc.).
- **Request**: Accepted body payloads and url parameter types.
- **Response**: Standard success JSON response structures and return codes.
- **Used By**: Frontend components or background services invoking the call.
- **Permissions**: Authentication scopes or user roles required.

---

## 🟢 Active Rest Routes (v1.1.0)

### 1. Setup Status Check
- **Endpoint**: `/api/setup/status`
- **Method**: `GET`
- **Request**: None
- **Response**: `{ status: "superuser" | "company" | "complete" }` (200 OK)
- **Used By**: `AppGate` component
- **Permissions**: Public access (reaches 403 Forbidden if setup status is already `complete`)

### 2. Superuser Initial Creation
- **Endpoint**: `/api/setup/superuser`
- **Method**: `POST`
- **Request**: `{ username, password, recoveryEmail }`
- **Response**: `{ success: true, user: { id, username, isSuperuser, recoveryEmail } }` (201 Created)
- **Used By**: `SetupWizard` step 1
- **Permissions**: Public access (checks password complexity rules; sets session cookie on success; reaches 403 Forbidden if setup status is already `complete`)

### 3. Company Initial Setup
- **Endpoint**: `/api/setup/company`
- **Method**: `POST`
- **Request**: `{ name, contactInfo }`
- **Response**: `{ success: true, company: { id, name, contactInfo, setupCompletedAt } }` (200 OK)
- **Used By**: `SetupWizard` step 2
- **Permissions**: Requires active superuser session cookie (`sid`) (reaches 403 Forbidden if setup status is already `complete`)

### 4. Secure Session Login
- **Endpoint**: `/api/auth/login`
- **Method**: `POST`
- **Request**: `{ username, password }`
- **Response**: `{ success: true, user: { id, username, isSuperuser, recoveryEmail, companyId, status } }` (200 OK)
- **Used By**: `Login` page
- **Permissions**: Public access (governed by 5-attempt login rate limiter; sets session cookie on success)

### 5. Secure Session Logout
- **Endpoint**: `/api/auth/logout`
- **Method**: `POST`
- **Request**: None
- **Response**: `{ success: true }` (200 OK)
- **Used By**: `Navbar` components / User Controls
- **Permissions**: Public access (deletes session record and clears HTTP-only `sid` cookie)

### 6. Active Session Retrieval
- **Endpoint**: `/api/auth/session`
- **Method**: `GET`
- **Request**: None
- **Response**: `{ success: true, user: { id, username, isSuperuser, recoveryEmail, companyId, status } }` (200 OK)
- **Used By**: `AppGate` component (monitors session state)
- **Permissions**: Active session cookie required

### 7. Update Recovery Email
- **Endpoint**: `/api/auth/recovery-email`
- **Method**: `PATCH`
- **Request**: `{ newEmail }`
- **Response**: `{ success: true, newEmail }` (200 OK)
- **Used By**: Profile/Account controls
- **Permissions**: Active session cookie required (automatically triggers security notification to the old email address via `EmailService`)

### 8. User Invitation
- **Endpoint**: `/api/users/invite`
- **Method**: `POST`
- **Request**: `{ email }`
- **Response**: `{ id, status: "PENDING" }` (200 OK)
- **Used By**: Admin panel / invitation controls
- **Permissions**: Requires authenticated session with `"users:invite"` permission (bypassed if Superuser)

### 9. Resend Invitation
- **Endpoint**: `/api/users/:id/resend-invitation`
- **Method**: `POST`
- **Request**: None
- **Response**: `{ id, status: "PENDING" }` (200 OK)
- **Used By**: Admin panel / invitation controls
- **Permissions**: Requires authenticated session with `"users:invite"` permission (bypassed if Superuser)

### 10. Admin Reset Password
- **Endpoint**: `/api/users/:id/admin-reset-password`
- **Method**: `POST`
- **Request**: None
- **Response**: `{ success: true, message: "Password reset email sent successfully." }` (200 OK)
- **Used By**: Admin panel / user controls
- **Permissions**: Requires authenticated session with `"users:reset-password"` permission (bypassed if Superuser)

### 11. Accept Invitation (Activate)
- **Endpoint**: `/api/auth/activate`
- **Method**: `POST`
- **Request**: `{ token, password }`
- **Response**: `{ success: true, user: { id, username, ... } }` (200 OK)
- **Used By**: `AcceptInvitation` page
- **Permissions**: Public access (consumes invitation token, validates password policy, sets session cookie)

### 12. Forgot Password Request
- **Endpoint**: `/api/auth/forgot-password`
- **Method**: `POST`
- **Request**: `{ email }`
- **Response**: `{ success: true, message: "If the email exists..." }` (200 OK)
- **Used By**: `ForgotPassword` page
- **Permissions**: Public access (governed by forgot password rate limiter; always returns generic message to prevent account enumeration)

### 13. Reset Password
- **Endpoint**: `/api/auth/reset-password`
- **Method**: `POST`
- **Request**: `{ token, newPassword }`
- **Response**: `{ success: true, user: { id, username, ... } }` (200 OK)
- **Used By**: `ResetPassword` page
- **Permissions**: Public access (consumes reset token, validates password policy, invalidates all prior sessions, sets session cookie)

### 14. List Roles
- **Endpoint**: `/api/roles`
- **Method**: `GET`
- **Request**: None
- **Response**: `[{ id, name, isProtected, parentRoleId, permissionCount }]` (200 OK)
- **Used By**: `RoleManagement` page
- **Permissions**: Requires active session with `roles:manage` permission (Superuser bypasses)

### 15. Create Role
- **Endpoint**: `/api/roles`
- **Method**: `POST`
- **Request**: `{ name }`
- **Response**: `{ id, name, isProtected, parentRoleId, permissionCount: 0 }` (201 Created)
- **Used By**: `RoleManagement` page (Create modal)
- **Permissions**: Requires active session with `roles:manage` permission (Superuser bypasses)

### 16. Delete Role
- **Endpoint**: `/api/roles/:id`
- **Method**: `DELETE`
- **Request**: None
- **Response**: `{ success: true, message: "Role deleted successfully." }` (200 OK)
- **Used By**: `RoleManagement` page (Delete button)
- **Permissions**: Requires active session with `roles:manage` permission. Fails for protected roles. (Superuser bypasses)

### 17. Duplicate Role
- **Endpoint**: `/api/roles/:id/duplicate`
- **Method**: `POST`
- **Request**: None
- **Response**: `{ id, name, isProtected, parentRoleId, permissionCount }` (201 Created)
- **Used By**: `RoleManagement` page (Duplicate button)
- **Permissions**: Requires active session with `roles:manage` permission (Superuser bypasses)

### 18. Get Role Permissions
- **Endpoint**: `/api/roles/:id/permissions`
- **Method**: `GET`
- **Request**: None
- **Response**: Grouped permissions object e.g., `{ lessons: [{ id, action, checked }], ... }` (200 OK)
- **Used By**: `RoleManagement` page (Active configuration details)
- **Permissions**: Requires active session with `roles:manage` permission (Superuser bypasses)

### 19. Update Role
- **Endpoint**: `/api/roles/:id`
- **Method**: `PATCH`
- **Request**: `{ name?, parentRoleId?, permissionIds? }`
- **Response**: `{ success: true, message: "Role updated successfully." }` (200 OK)
- **Used By**: `RoleManagement` page (Rename, save parent, save permissions checklists)
- **Permissions**: Requires active session with `roles:manage` permission. Fails to rename protected roles, and detects cyclic parent loops. (Superuser bypasses)

### 20. List System Permissions
- **Endpoint**: `/api/permissions`
- **Method**: `GET`
- **Request**: None
- **Response**: `[{ id, module, action }]` (200 OK)
- **Used By**: Role/Permission editors
- **Permissions**: Requires active session with `roles:manage` permission (Superuser bypasses)

### 21. Get Company Settings
- **Endpoint**: `/api/company/settings`
- **Method**: `GET`
- **Request**: None
- **Response**: `{ roleInheritanceEnabled: boolean }` (200 OK)
- **Used By**: `RoleManagement` page
- **Permissions**: Requires active session with `roles:manage` permission (Superuser bypasses)

### 22. Update Company Settings
- **Endpoint**: `/api/company/settings`
- **Method**: `PATCH`
- **Request**: `{ roleInheritanceEnabled }`
- **Response**: `{ success: true, company: { id, roleInheritanceEnabled } }` (200 OK)
- **Used By**: `RoleManagement` page (Global inheritance toggle)
- **Permissions**: Requires active session with `roles:manage` permission (Superuser bypasses)


