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
