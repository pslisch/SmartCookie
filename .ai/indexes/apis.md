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

## 🟢 Active Rest Routes (v1.7.0)

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

### 23. List Organization Units
- **Endpoint**: `/api/organization-units`
- **Method**: `GET`
- **Request**: None
- **Response**: `[{ id, name, parentId, companyId, createdAt, updatedAt }]` (200 OK)
- **Used By**: Administrative panels / dashboards
- **Permissions**: Requires active session with `"organization:view"` permission (Superuser bypasses)

### 24. Get Organization Unit
- **Endpoint**: `/api/organization-units/:id`
- **Method**: `GET`
- **Request**: None
- **Response**: `{ id, name, parentId, companyId, createdAt, updatedAt }` (200 OK)
- **Used By**: Administrative panels / details page
- **Permissions**: Requires active session with `"organization:view"` permission (Superuser bypasses)

### 25. Create Organization Unit
- **Endpoint**: `/api/organization-units`
- **Method**: `POST`
- **Request**: `{ name, parentId }`
- **Response**: `{ id, name, parentId, companyId, createdAt, updatedAt }` (201 Created)
- **Used By**: Create OU dialogs
- **Permissions**: Requires active session with `"organization:create"` permission (Superuser bypasses)

### 26. Rename Organization Unit
- **Endpoint**: `/api/organization-units/:id`
- **Method**: `PUT`
- **Request**: `{ name }`
- **Response**: `{ id, name, parentId, companyId, createdAt, updatedAt }` (200 OK)
- **Used By**: Edit OU dialogs
- **Permissions**: Requires active session with `"organization:edit"` permission (Superuser bypasses)

### 27. Move Organization Unit
- **Endpoint**: `/api/organization-units/:id/move`
- **Method**: `POST`
- **Request**: `{ parentId }`
- **Response**: `{ id, name, parentId, companyId, createdAt, updatedAt }` (200 OK)
- **Used By**: OU tree drag-and-drop / move selectors
- **Permissions**: Requires active session with `"organization:edit"` permission. Prevents cyclical loop structures. (Superuser bypasses)

### 28. Get Deletion Preview
- **Endpoint**: `/api/organization-units/:id/deletion-preview`
- **Method**: `GET`
- **Request**: Query parameter `option: "REASSIGN" | "SUBTREE"`
- **Response**: `[{ id, username, email }]` (200 OK)
- **Used By**: OU deletion confirmation modal (Task 7/11)
- **Permissions**: Requires active session with `"organization:view"` permission (Superuser bypasses)

### 29. Soft Delete Organization Unit
- **Endpoint**: `/api/organization-units/:id`
- **Method**: `DELETE`
- **Request**: Query parameter `option: "REASSIGN" | "SUBTREE"`
- **Response**: `{ success: true }` (200 OK)
- **Used By**: Delete OU action
- **Permissions**: Requires active session with `"organization:delete"` permission (Superuser bypasses)

### 30. Restore Organization Unit
- **Endpoint**: `/api/organization-units/:id/restore`
- **Method**: `POST`
- **Request**: None
- **Response**: `{ success: true }` (200 OK)
- **Used By**: Trash bin / recovery actions
- **Permissions**: Requires active session with `"organization:delete"` permission (Superuser bypasses)

### 31. Assign OU Manager
- **Endpoint**: `/api/organization-units/:id/managers`
- **Method**: `POST`
- **Request**: `{ userId }`
- **Response**: `{ id, userId, organizationUnitId, membershipType: "MANAGER", status: "ACTIVE", ... }` (201 Created)
- **Used By**: Manager assign dialogs
- **Permissions**: Requires active session with `"organization:manage-members"` permission (Superuser bypasses)

### 32. Remove OU Manager
- **Endpoint**: `/api/organization-units/:id/managers/:userId`
- **Method**: `DELETE`
- **Request**: None
- **Response**: `{ success: true }` (200 OK)
- **Used By**: Manager list removal action
- **Permissions**: Requires active session with `"organization:manage-members"` permission (Superuser bypasses)

### 33. List Learning Groups
- **Endpoint**: `/api/learning-groups`
- **Method**: `GET`
- **Request**: None
- **Response**: `[{ id, name, parentGroupId, companyId, isTemporary, expiresAt, ... }]` (200 OK)
- **Used By**: Learning Group panels / selectors
- **Permissions**: Requires active session with `"organization:view"` permission (Superuser bypasses)

### 34. Get Learning Group
- **Endpoint**: `/api/learning-groups/:id`
- **Method**: `GET`
- **Request**: None
- **Response**: `{ id, name, parentGroupId, companyId, isTemporary, expiresAt, ... }` (200 OK)
- **Used By**: Group details view
- **Permissions**: Requires active session with `"organization:view"` permission (Superuser bypasses)

### 35. Create Learning Group
- **Endpoint**: `/api/learning-groups`
- **Method**: `POST`
- **Request**: `{ name, parentGroupId, isTemporary, expiresAt }`
- **Response**: `{ id, name, parentGroupId, companyId, isTemporary, expiresAt, ... }` (201 Created)
- **Used By**: Create group modal
- **Permissions**: Requires active session with `"organization:create"` permission (Superuser bypasses)

### 36. Update Learning Group
- **Endpoint**: `/api/learning-groups/:id`
- **Method**: `PUT`
- **Request**: `{ name }`
- **Response**: `{ id, name, ... }` (200 OK)
- **Used By**: Group edit forms
- **Permissions**: Requires active session with `"organization:edit"` permission (Superuser bypasses)

### 37. Move Learning Group
- **Endpoint**: `/api/learning-groups/:id/move`
- **Method**: `POST`
- **Request**: `{ parentGroupId }`
- **Response**: `{ id, name, parentGroupId, ... }` (200 OK)
- **Used By**: Group tree reorganizer
- **Permissions**: Requires active session with `"organization:edit"` permission. Prevents cyclical loop structures. (Superuser bypasses)

### 38. Soft Delete Learning Group
- **Endpoint**: `/api/learning-groups/:id`
- **Method**: `DELETE`
- **Request**: None
- **Response**: `{ success: true }` (200 OK)
- **Used By**: Group delete action (un-nests child groups automatically)
- **Permissions**: Requires active session with `"organization:delete"` permission (Superuser bypasses)

### 39. Restore Learning Group
- **Endpoint**: `/api/learning-groups/:id/restore`
- **Method**: `POST`
- **Request**: None
- **Response**: `{ success: true }` (200 OK)
- **Used By**: Trash bin / recovery actions
- **Permissions**: Requires active session with `"organization:delete"` permission (Superuser bypasses)

### 40. Add Group Member
- **Endpoint**: `/api/learning-groups/:id/members`
- **Method**: `POST`
- **Request**: `{ userId }`
- **Response**: `{ id, userId, learningGroupId, membershipType: "MEMBER", status: "ACTIVE", ... }` (201 Created)
- **Used By**: Group member additions
- **Permissions**: Requires active session with `"organization:manage-members"` permission. Rejects MANAGER role targets. (Superuser bypasses)

### 41. Remove Group Member
- **Endpoint**: `/api/learning-groups/:id/members/:userId`
- **Method**: `DELETE`
- **Request**: None
- **Response**: `{ success: true }` (200 OK)
- **Used By**: Group member list removal action
- **Permissions**: Requires active session with `"organization:manage-members"` permission (Superuser bypasses)

### 42. Get Expiring Learning Groups
- **Endpoint**: `/api/learning-groups/expiring`
- **Method**: `GET`
- **Request**: None
- **Response**: `[{ id, name, isTemporary, expiresAt, reminderSentAt }]` (200 OK)
- **Used By**: `ExpiringGroupsTab` component
- **Permissions**: Requires active session with `"organization:view"` permission (Superuser bypasses)

### 43. Extend Learning Group Expiration
- **Endpoint**: `/api/learning-groups/:id/extend`
- **Method**: `PATCH`
- **Request**: `{ newExpiresAt }`
- **Response**: `{ id, name, expiresAt, ... }` (200 OK)
- **Used By**: `ExpiringGroupsTab` component (Extend button)
- **Permissions**: Requires active session with `"organization:manage-groups"` permission (Superuser bypasses)

### 44. Create Setup Org Structure
- **Endpoint**: `/api/setup/org-structure`
- **Method**: `POST`
- **Request**: `{ ouNames }`
- **Response**: `{ success: true, company: { id, name, ... } }` (200 OK)
- **Used By**: `SetupWizard` (Step 3: Org Structure)
- **Permissions**: Requires active superuser session cookie (`sid`) (reaches 403 Forbidden if setup status is already `complete`)

### 45. Create Lesson Assignment
- **Endpoint**: `/api/assignments`
- **Method**: `POST`
- **Request**: `{ lessonId: string, targets: Array<{ type: "USER" | "ORGANIZATION_UNIT" | "LEARNING_GROUP", targetId: string }>, type: "IMMEDIATE" | "SCHEDULED", scheduledFor?: Date, dueDateDefaultDays?: number, isMandatory?: boolean }`
- **Response**: Created `Assignment` object (200 OK)
- **Used By**: Admin Dashboard / Assignments Scheduler
- **Permissions**: Requires authenticated session with `"assignments:create-mandatory"` (if `isMandatory` is true) or `"assignments:create"` (if false). Superuser bypasses.

### 46. Create Course Assignment
- **Endpoint**: `/api/assignments/course`
- **Method**: `POST`
- **Request**: `{ courseId: string, targets: Array<{ type: "USER" | "ORGANIZATION_UNIT" | "LEARNING_GROUP", targetId: string }>, type: "IMMEDIATE" | "SCHEDULED", scheduledFor?: Date, dueDateDefaultDays?: number, isMandatory?: boolean }`
- **Response**: Array of created `Assignment` objects (200 OK)
- **Used By**: Admin Dashboard / Course Scheduler
- **Permissions**: Requires authenticated session with `"assignments:create-mandatory"` (if `isMandatory` is true) or `"assignments:create"` (if false). Superuser bypasses.

### 47. Cancel / Delete Assignment
- **Endpoint**: `/api/assignments/:id`
- **Method**: `DELETE`
- **Request**: None
- **Response**: `{ success: true }` (200 OK)
- **Used By**: Admin Dashboard / Assignments List
- **Permissions**: Requires active session with `"assignments:delete"` permission. Superuser bypasses.

### 48. List Assignments
- **Endpoint**: `/api/assignments`
- **Method**: `GET`
- **Request**: Optional query filters: `status` and `lessonId`
- **Response**: `[{ id, companyId, lessonId, status, lesson: { id, title }, targets: [...] }]` (200 OK)
- **Used By**: Admin Dashboard / Assignments List
- **Permissions**: Requires active session with `"assignments:view"` permission. Superuser bypasses.

### 49. Get Assignment Instances
- **Endpoint**: `/api/assignments/:id/instances`
- **Method**: `GET`
- **Request**: None
- **Response**: List of materialized `UserAssignmentInstance` entries with user profiles (200 OK)
- **Used By**: Admin Reports / Progress breakdown
- **Permissions**: Requires active session with `"assignments:view-reports"` permission. Superuser bypasses.

### 50. Self-Assign Lesson
- **Endpoint**: `/api/assignments/self-assign`
- **Method**: `POST`
- **Request**: `{ lessonId }`
- **Response**: Created `UserAssignmentInstance` object (200 OK)
- **Used By**: Learner Dashboard / Course catalog
- **Permissions**: Requires active session with `"assignments:view"` permission.

### 51. Remove Self-Assignment
- **Endpoint**: `/api/assignments/self-assign/:instanceId`
- **Method**: `DELETE`
- **Request**: None
- **Response**: `{ success: true, message: "Self-assignment removed." }` (200 OK)
- **Used By**: Learner Dashboard / My Lessons
- **Permissions**: Requires active session with `"assignments:view"` permission (gated by owner matching req.user.id).

### 52. Complete Assignment Instance
- **Endpoint**: `/api/assignment-instances/:id/complete`
- **Method**: `POST`
- **Request**: None
- **Response**: `{ success: true, instance: { id, status: "COMPLETED", ... } }` (200 OK)
- **Used By**: Learner Lesson player / My Lessons
- **Permissions**: Requires active session with `"assignments:view"` permission (gated by owner matching req.user.id).

### 53. Reactivate User
- **Endpoint**: `/api/users/:id/reactivate`
- **Method**: `POST`
- **Request**: `{ option: "RESTORE" | "FRESH_START" }`
- **Response**: `{ success: true, user: { id, status: "ACTIVE" } }` (200 OK)
- **Used By**: Admin panel / User Management list
- **Permissions**: Requires active session with `"assignments:edit"` permission. Superuser bypasses.

### 54. List SCORM Packages
- **Endpoint**: `/api/content`
- **Method**: `GET`
- **Request**: Optional query parameters for filter
- **Response**: List of `Content` package structures with categories and tags (200 OK)
- **Used By**: SCORM Content Management & Package selectors
- **Permissions**: Requires active session with `"content:view"` permission.

### 55. Get SCORM Package Details
- **Endpoint**: `/api/content/:id`
- **Method**: `GET`
- **Request**: None
- **Response**: `Content` package object with tags and category (200 OK)
- **Used By**: `ScormPreviewPlayer` component
- **Permissions**: Requires active session with `"content:view"` permission (or active session).

### 56. Import SCORM Package
- **Endpoint**: `/api/content/import`
- **Method**: `POST`
- **Request**: Multipart form containing `package` file (ZIP), `categoryId`, and tags
- **Response**: Imported `Content` object (201 Created) — automatically creates a linked `Lesson` record in status `DRAFT`
- **Used By**: `ContentImportWizard` component
- **Permissions**: Requires active session with `"content:import"` permission.

### 57. Publish SCORM Package
- **Endpoint**: `/api/content/:id/publish`
- **Method**: `POST`
- **Request**: None
- **Response**: Updated `Content` object with status `PUBLISHED` (200 OK)
- **Used By**: `ContentManagement` page (detail panel)
- **Permissions**: Requires active session with `"content:publish"` permission.

### 58. Archive SCORM Package
- **Endpoint**: `/api/content/:id/archive`
- **Method**: `POST`
- **Request**: None
- **Response**: Updated `Content` object with status `ARCHIVED` (200 OK)
- **Used By**: `ContentManagement` page (detail panel)
- **Permissions**: Requires active session with `"content:archive"` permission.

### 59. Restore SCORM Package
- **Endpoint**: `/api/content/:id/restore`
- **Method**: `POST`
- **Request**: `{ targetStatus: "DRAFT" | "PUBLISHED" }`
- **Response**: Updated `Content` object (200 OK)
- **Used By**: `ContentManagement` page (detail panel)
- **Permissions**: Requires active session with `"content:restore"` permission.

### 60. Download SCORM original ZIP
- **Endpoint**: `/api/content/:id/download`
- **Method**: `GET`
- **Request**: None
- **Response**: Binary stream of the original uploaded `.zip` package (200 OK)
- **Used By**: `ContentManagement` page / Version history lists
- **Permissions**: Requires active session with `"content:download-zip"` permission.

### 61. List SCORM Package Versions
- **Endpoint**: `/api/content/:contentGroupId/versions`
- **Method**: `GET`
- **Request**: None
- **Response**: List of all package versions under the same group ID (200 OK)
- **Used By**: `ContentManagement` Version History Modal
- **Permissions**: Requires active session with `"content:view"` permission.

### 62. Start SCORM Content Attempt
- **Endpoint**: `/api/content-attempts/start`
- **Method**: `POST`
- **Request**: `{ userAssignmentInstanceId }`
- **Response**: Created `ContentAttempt` object (201 Created)
- **Used By**: ScormPlayer iframe launcher
- **Permissions**: Requires active session with `"assignments:view"` permission.

### 63. Commit SCORM Content Attempt State
- **Endpoint**: `/api/content-attempts/:id/commit`
- **Method**: `POST`
- **Request**: JSON object containing SCORM CMI state (`lessonStatus`, `scoreRaw`, `sessionTimeSeconds`, etc.)
- **Response**: `{ success: true, attempt: ContentAttempt, instanceStatus: string }` (200 OK)
- **Used By**: ScormPlayer SCORM 1.2 runtime bridge
- **Permissions**: Requires active session with `"assignments:view"` permission.

### 64. Fetch Attempt History
- **Endpoint**: `/api/content-attempts/:instanceId`
- **Method**: `GET`
- **Request**: None
- **Response**: List of all attempt records for the assignment instance (200 OK)
- **Used By**: ScormPlayer / AssignmentInstanceReport components
- **Permissions**: Requires active session with `"assignments:view"` permission.

### 65. Generate Bulk Import Template CSV
- **Endpoint**: `/api/users/bulk-import/template`
- **Method**: `GET`
- **Request**: None
- **Response**: Text CSV content file with headers for standard and company-required profile fields (200 OK)
- **Used By**: Bulk Import Wizard
- **Permissions**: Requires active session with `"users:create"` permission.

### 66. Dry-Run Validate Bulk Import CSV
- **Endpoint**: `/api/users/bulk-import/validate`
- **Method**: `POST`
- **Request**: Multipart file with key `"file"`, or JSON body with `csv` string, or raw CSV text
- **Response**: `{ results: Array<{ row: number, email: string, valid: boolean, errors: string[] }> }` (200 OK)
- **Used By**: Bulk Import Wizard (dry-run review page)
- **Permissions**: Requires active session with `"users:create"` permission.

### 67. Confirm and Bulk-Import Users
- **Endpoint**: `/api/users/bulk-import/confirm`
- **Method**: `POST`
- **Request**: Multipart file with key `"file"`, or JSON body with `csv` string, or raw CSV text
- **Response**: `{ success: true, count: number }` (200 OK) on success, or `{ error: string, results: [...] }` (422 Unprocessable Entity) on validation failure.
- **Used By**: Bulk Import Wizard (confirm submit action)
- **Permissions**: Requires active session with `"users:create"` permission. (Executes inside a secure SQL transaction: either all succeed or none are created).

### 68. MFA Verify Challenge
- **Endpoint**: `/api/auth/mfa/verify`
- **Method**: `POST`
- **Request**: `{ challengeToken, code }`
- **Response**: `{ success: true, user: { id, username, ... } }` (200 OK)
- **Used By**: Login screen (MFA challenge step)
- **Permissions**: Public access (validates challenge token, logs user in and sets session cookie)

### 69. MFA Pending Setup Secret Generation
- **Endpoint**: `/api/auth/mfa/setup-pending`
- **Method**: `POST`
- **Request**: `{ setupToken }`
- **Response**: `{ success: true, secret, otpauthUrl }` (200 OK)
- **Used By**: Login forced setup flow
- **Permissions**: Public access (validates setup token)

### 70. MFA Pending Setup Verification & Enablement
- **Endpoint**: `/api/auth/mfa/enable-pending`
- **Method**: `POST`
- **Request**: `{ setupToken, pendingSecret, code }`
- **Response**: `{ success: true, recoveryCodes, user: { id, username, ... } }` (200 OK)
- **Used By**: Login forced setup flow
- **Permissions**: Public access (consumes setup token, enables MFA on user, returns recovery codes, sets login session)

### 71. Setup Wizard Superuser MFA Generation
- **Endpoint**: `/api/setup/mfa/setup`
- **Method**: `GET`
- **Request**: None
- **Response**: `{ success: true, secret, otpauthUrl }` (200 OK)
- **Used By**: Setup Wizard (Step 1.5: Superuser MFA configuration)
- **Permissions**: Requires active superuser session cookie (`sid`)

### 72. Setup Wizard Superuser MFA Verification & Enablement
- **Endpoint**: `/api/setup/mfa/verify`
- **Method**: `POST`
- **Request**: `{ pendingSecret, code }`
- **Response**: `{ success: true, recoveryCodes }` (200 OK)
- **Used By**: Setup Wizard (Step 1.5: Superuser MFA configuration)
- **Permissions**: Requires active superuser session cookie (`sid`)

### 73. Self-Service MFA Status
- **Endpoint**: `/api/profile/mfa/status`
- **Method**: `GET`
- **Request**: None
- **Response**: `{ mfaEnabled: boolean, mfaEnabledAt: Date | null }` (200 OK)
- **Used By**: Profile Security Tab
- **Permissions**: Active session cookie required

### 74. Self-Service MFA Setup Initiation
- **Endpoint**: `/api/profile/mfa/setup`
- **Method**: `GET`
- **Request**: None
- **Response**: `{ success: true, secret, otpauthUrl }` (200 OK)
- **Used By**: Profile Security Tab
- **Permissions**: Active session cookie required

### 75. Self-Service MFA Enablement
- **Endpoint**: `/api/profile/mfa/enable`
- **Method**: `POST`
- **Request**: `{ pendingSecret, code }`
- **Response**: `{ success: true, recoveryCodes }` (200 OK)
- **Used By**: Profile Security Tab
- **Permissions**: Active session cookie required

### 76. Self-Service MFA Disablement
- **Endpoint**: `/api/profile/mfa/disable`
- **Method**: `POST`
- **Request**: `{ currentPassword }`
- **Response**: `{ success: true }` (200 OK)
- **Used By**: Profile Security Tab
- **Permissions**: Active session cookie required

### 77. Self-Service Regenerate Recovery Codes
- **Endpoint**: `/api/profile/mfa/regenerate-recovery`
- **Method**: `POST`
- **Request**: None
- **Response**: `{ success: true, recoveryCodes }` (200 OK)
- **Used By**: Profile Security Tab
- **Permissions**: Active session cookie required

### 78. Admin Reset MFA
- **Endpoint**: `/api/users/:id/admin-reset-mfa`
- **Method**: `POST`
- **Request**: None
- **Response**: `{ success: true, message: "MFA reset successfully." }` (200 OK)
- **Used By**: Admin panel / User Management list
- **Permissions**: Requires active session with `"users:edit"` permission (Superuser bypasses)

### 79. Fetch Identity Provider Config
- **Endpoint**: `/api/identity-providers/entra`
- **Method**: `GET`
- **Request**: None
- **Response**: Sanitized configuration containing `tenantId`, `clientId`, masked client secret, `loginMode`, `importStrategy`, and group selections.
- **Used By**: Identity Providers configuration screen
- **Permissions**: `identity-providers:view-config` (LMS Manager, Superuser, etc.)

### 80. Test Identity Provider Connection
- **Endpoint**: `/api/identity-providers/entra/test-connection`
- **Method**: `POST`
- **Request**: `{ tenantId, clientId, clientSecret }`
- **Response**: `{ success: boolean, allGranted: boolean, permissions: Array<{ permission: string, status: string, explanation: string }> }`
- **Used By**: Connection wizard test button
- **Permissions**: `identity-providers:configure` (Superuser only)

### 81. Save Identity Provider Config
- **Endpoint**: `/api/identity-providers/entra`
- **Method**: `POST`
- **Request**: `{ tenantId, clientId, clientSecret }`
- **Response**: `{ success: true, config: SanitizedConfig }`
- **Used By**: Connection wizard save button
- **Permissions**: `identity-providers:configure` (Superuser only)

### 82. Update Identity Provider Settings
- **Endpoint**: `/api/identity-providers/entra`
- **Method**: `PATCH`
- **Request**: `{ loginMode, importStrategy, defaultSyncedUserRoleId, groupSelections: Array<{ id: string, name: string }>, enabled }`
- **Response**: `{ success: true, config: SanitizedConfig }`
- **Used By**: Configuration sliders, dropdowns, and group selector
- **Permissions**: `identity-providers:configure` (Superuser only)

### 83. Trigger Manual Sync Now
- **Endpoint**: `/api/identity-providers/entra/sync-now`
- **Method**: `POST`
- **Request**: None
- **Response**: `{ status: SyncStatus, usersProcessed: number, usersFailed: number, groupsProcessed: number }`
- **Used By**: "Sync Now" trigger button
- **Permissions**: `identity-providers:manual-sync` (User Manager, etc.)

### 84. Get Paginated Sync Logs
- **Endpoint**: `/api/identity-providers/entra/sync-logs`
- **Method**: `GET`
- **Request**: URL query parameters `page` and `limit`
- **Response**: Paginated sync logs `{ data: SyncLog[], pagination: { page, limit, total, totalPages } }`
- **Used By**: Sync History table
- **Permissions**: `identity-providers:view-logs` (LMS Manager, User Manager, etc.)

### 85. Download Sync Log Details
- **Endpoint**: `/api/identity-providers/entra/sync-logs/:id/download`
- **Method**: `GET`
- **Request**: None (returns downloadable txt attachment)
- **Response**: Error logs txt file content
- **Used By**: "Download Log" button
- **Permissions**: `identity-providers:view-logs` (LMS Manager, User Manager, etc.)

### 86. Get Resolved Active Theme
- **Endpoint**: `/api/themes/resolved`
- **Method**: `GET`
- **Request**: Optional query parameter `test` (`?test=:themeId`)
- **Response**: `{ themeId: string, name: string, isTest: boolean, baseFontSize: number, tokens: Record<string, string>, colorValues: Record<string, string>, darkTokens: Record<string, string> | null, darkColorValues: Record<string, string> | null, fonts: Record<FontGroup, ResolvedFontDetails>, logoUrl: string | null }` (200 OK)
- **Used By**: Theme runtime provider, preview frame, and theme editor
- **Permissions**: Authenticated user session (`requireAuth` — no `theme:*` administrative permissions required)

### 87. List Themes
- **Endpoint**: `/api/themes`
- **Method**: `GET`
- **Request**: None
- **Response**: `Theme[]` (with font relations included) (200 OK)
- **Used By**: Theme management index
- **Permissions**: `theme:view`

### 88. Get Theme Detail
- **Endpoint**: `/api/themes/:id`
- **Method**: `GET`
- **Request**: None
- **Response**: `Theme` (with font relations included) (200 OK)
- **Used By**: Theme editor
- **Permissions**: `theme:view`

### 89. Create Theme From Template
- **Endpoint**: `/api/themes`
- **Method**: `POST`
- **Request**: `{ name: string, sourceThemeId: string }`
- **Response**: Newly created `Theme` in `DRAFT` status with deep-copied colors, fonts, and baseFontSize (201 Created)
- **Used By**: Theme management modal / creation flow
- **Permissions**: `theme:edit`

### 90. Update Theme
- **Endpoint**: `/api/themes/:id`
- **Method**: `PATCH`
- **Request**: Partial `{ name?: string, colorValues?: Record<string, string>, darkColorValues?: Record<string, string> | null, generalFontId?: string | null, ...fontSlots, baseFontSize?: number }`
- **Response**: Updated `Theme` (200 OK)
- **Used By**: Theme editor live changes
- **Permissions**: `theme:edit`
- **Rules**: Rejects active themes (409 Conflict) and Smart Cookie Default theme (403 Forbidden). Merges `colorValues` key-by-key.

### 91. Set Theme Ready
- **Endpoint**: `/api/themes/:id/set-ready`
- **Method**: `POST`
- **Request**: None
- **Response**: Updated `Theme` with `status: READY` (200 OK)
- **Used By**: Theme editor / management card actions
- **Permissions**: `theme:set-ready`
- **Rules**: Validates that all assigned font references still resolve to existing fonts for the company (400 if dangling).

### 92. Set Theme Draft
- **Endpoint**: `/api/themes/:id/set-draft`
- **Method**: `POST`
- **Request**: None
- **Response**: Updated `Theme` with `status: DRAFT` and `scheduledActivationAt: null` (200 OK)
- **Used By**: Theme editor / management card actions
- **Permissions**: `theme:set-ready`
- **Rules**: Rejects active themes (409 Conflict) and Smart Cookie Default theme (403 Forbidden).

### 93. Activate Theme (Immediate or Scheduled)
- **Endpoint**: `/api/themes/:id/activate`
- **Method**: `POST`
- **Request**: `{ mode: 'immediate' }` OR `{ mode: 'schedule', scheduledActivationAt: string (ISO), confirmReplaceExisting?: boolean }`
- **Response**: `Theme` (with fonts included) (200 OK)
- **Used By**: Theme management card / activation button, schedule activation modal
- **Permissions**: `theme:activate`
- **Rules**: Validates all font references before activation. For `immediate`: atomically promotes target theme to `ACTIVE` and demotes previously active theme to `READY` in a single transaction. For `schedule`: validates timestamp is in the future; if another theme is already scheduled and `confirmReplaceExisting` is false, returns 409 Conflict with `{ requiresConfirmation: true, existingScheduledTheme: { ... } }`; if confirmed, sets `scheduledActivationAt` and clears previous schedules.

### 94. Delete Theme (Soft-Delete)
- **Endpoint**: `/api/themes/:id`
- **Method**: `DELETE`
- **Request**: `{ confirmCancelSchedule?: boolean }` (optional body)
- **Response**: `{ success: true, message: string, theme: Theme }` (200 OK)
- **Used By**: Theme management card delete action
- **Permissions**: `theme:delete`
- **Rules**: Soft-deletes theme (`deletedAt = now`, `permanentDeleteAt = now + 14 days`, `deletionBatchId = uuid`). Rejects Smart Cookie Default theme (403 Forbidden). Rejects active theme (409 Conflict). If theme has scheduled activation, requires `{ confirmCancelSchedule: true }` (returns 409 Conflict with `{ requiresScheduleConfirmation: true }` if missing). Soft-deleted themes are automatically purged after 14 days by the hourly background scheduler.

### 95. Cancel Scheduled Theme Activation
- **Endpoint**: `/api/themes/:id/cancel-schedule`
- **Method**: `POST`
- **Request**: None
- **Response**: Updated `Theme` with `scheduledActivationAt: null` (200 OK)
- **Used By**: Theme management card cancel schedule button
- **Permissions**: `theme:activate`
- **Rules**: Clears `scheduledActivationAt`, `scheduledActivationFailedAt`, and `scheduledActivationFailedReason`. Rejects Smart Cookie Default theme (403 Forbidden).

### 96. Dismiss Scheduled Activation Failure
- **Endpoint**: `/api/themes/:id/dismiss-failure`
- **Method**: `POST`
- **Request**: None
- **Response**: Updated `Theme` with failure metadata cleared (200 OK)
- **Used By**: Theme management failure alert banner dismiss button
- **Permissions**: `theme:view`
- **Rules**: Clears `scheduledActivationFailedAt` and `scheduledActivationFailedReason`.

### 97. Run Scheduled Activations
- **Endpoint**: `/api/themes/run-scheduled-activation`
- **Method**: `POST`
- **Request**: None
- **Response**: `{ success: true, processed: number, activatedThemeId?: string }` (200 OK)
- **Used By**: Manual scheduler trigger / background task
- **Permissions**: `theme:activate`
- **Rules**: Checks for pending scheduled themes whose `scheduledActivationAt <= now()`, validates font references, and atomically activates the target theme.

### 98. Acquire or Heartbeat Theme Lock
- **Endpoint**: `/api/themes/:id/lock`
- **Method**: `POST`
- **Request**: `{ lockType?: 'EDIT' | 'TEST' }`
- **Response**: `{ success: true, lock: ThemeLock }` (200 OK)
- **Used By**: Theme editor auto-heartbeat, test mode heartbeat
- **Permissions**: `requireAuth`; `theme:edit` for `EDIT` lock, `theme:view` for `TEST` lock
- **Rules**: Enforces single-editor concurrency. Heartbeat TTL is 30 seconds. If locked by another user and active (<30s old), returns 409 Conflict with `{ error, holderName, lockType, lockedAt }`. Stale locks (>30s) are automatically stolen and reassigned to the caller.

### 99. Release Theme Lock
- **Endpoint**: `/api/themes/:id/lock`
- **Method**: `DELETE`
- **Request**: None
- **Response**: `{ success: true, released: boolean }` (200 OK)
- **Used By**: Theme editor exit / unmount handler, `beforeunload` cleanup
- **Permissions**: `requireAuth`
- **Rules**: Releases active lock on the theme if held by the authenticated user.

### 100. Get Theme Lock Status
- **Endpoint**: `/api/themes/:id/lock`
- **Method**: `GET`
- **Request**: None
- **Response**: `{ isLocked: boolean, lock: { ...ThemeLock, isMine: boolean } | null }` (200 OK)
- **Used By**: Theme editor polling, management card indicators
- **Permissions**: `theme:view`

### 101. List Company Fonts
- **Endpoint**: `/api/fonts`
- **Method**: `GET`
- **Request**: None
- **Response**: `Font[]` (system fonts + tenant uploaded custom fonts) (200 OK)
- **Used By**: FontLibrary modal, FontEditorTab slot pickers
- **Permissions**: `requireAuth`, `theme:view`

### 102. Stream Font File
- **Endpoint**: `/api/fonts/:id/file`
- **Method**: `GET`
- **Request**: None
- **Response**: Binary font file stream with `Content-Type` (`font/woff2`, `font/woff`, `font/ttf`, `font/otf`) and `Cache-Control: public, max-age=86400` (200 OK)
- **Used By**: Browser `@font-face` CSS rules
- **Permissions**: Public access (allows browser stylesheet loading without auth credentials)

### 103. Upload Custom Fonts
- **Endpoint**: `/api/fonts`
- **Method**: `POST`
- **Request**: `multipart/form-data` with file array under field name `fonts`
- **Response**: `{ created: Font[], errors: Array<{ filename: string, error: string }> }` (200 OK)
- **Used By**: FontLibrary dropzone
- **Permissions**: `theme:edit`
- **Rules**: Uses `fontkit` to inspect magic bytes, validate font integrity, and extract PostScript family name, weight, style, and format (WOFF, WOFF2, TTF, OTF; max 15MB). Enforces case-insensitive duplicate family name checks per company. Processes each file independently so invalid files do not block valid files.

### 104. Delete Custom Font
- **Endpoint**: `/api/fonts/:id`
- **Method**: `DELETE`
- **Request**: None
- **Response**: `{ success: true, message: string }` (200 OK)
- **Used By**: FontLibrary delete action
- **Permissions**: `theme:edit`
- **Rules**: System fonts cannot be deleted (403 Forbidden). Scans all company themes for references in any of the 8 font slots; if any references exist, returns 409 Conflict with `{ isReferenced: true, affectedThemes: Array<{ id: string, name: string, groups: string[] }> }` and halts deletion. If unreferenced, hard-deletes the font record and unlinks file from disk.

### 105. Replace Font Across Themes
- **Endpoint**: `/api/fonts/:id/replace`
- **Method**: `POST`
- **Request**: `{ replacementFontId: string }`
- **Response**: `{ success: true, message: string, updatedThemesCount: number }` (200 OK)
- **Used By**: FontReplacementModal confirmation
- **Permissions**: `theme:edit`
- **Rules**: In a single database transaction, migrates all theme slot references from font `:id` to `replacementFontId`, then hard-deletes the original font row and removes its stored file from disk. Rejects system fonts (403 Forbidden).

### 106. Upload Theme Logo
- **Endpoint**: `/api/themes/:id/logo`
- **Method**: `POST`
- **Request**: Multipart form data with single file field `logo` (JPEG, PNG, GIF, WebP up to 2MB)
- **Response**: `{ success: true, logoStoragePath: string, theme: Theme }` (200 OK)
- **Used By**: Theme Editor logo upload dropzone
- **Permissions**: `theme:edit`
- **Rules**: Validates magic-byte image signatures and 2MB limit. Replaces and unlinks any existing logo file for this theme on disk. Rejects active themes (409 Conflict) and Smart Cookie Default theme (403 Forbidden).

### 107. Stream Theme Logo
- **Endpoint**: `/api/themes/:id/logo`
- **Method**: `GET`
- **Request**: None
- **Response**: Binary image file stream with `Content-Type` (`image/jpeg`, `image/png`, `image/gif`, `image/webp`) and `Cache-Control: public, max-age=86400` (200 OK)
- **Used By**: Global branded headers, themed login/setup pages via `<img>` tags
- **Permissions**: Public access (pre-auth friendly)
- **Rules**: Returns 404 if no logo is set for the theme or if the file is missing from storage.

### 108. Delete Theme Logo
- **Endpoint**: `/api/themes/:id/logo`
- **Method**: `DELETE`
- **Request**: None
- **Response**: `{ success: true, message: string, theme: Theme }` (200 OK)
- **Used By**: Theme Editor logo removal action
- **Permissions**: `theme:edit`
- **Rules**: Removes the logo file from disk and clears `Theme.logoStoragePath` to `null`. Returns 404 if no logo is currently set. Rejects active themes (409 Conflict) and Smart Cookie Default theme (403 Forbidden).

### 109. List Unread & Recent Read Notifications
- **Endpoint**: `/api/notifications`
- **Method**: `GET`
- **Request**: None
- **Response**: `{ unread: NotificationListItem[], recentRead: NotificationListItem[] }` (200 OK)
- **Used By**: `NotificationBell.tsx` (Navbar dropdown & unread badge)
- **Permissions**: `requireAuth`
- **Rules**: Fetches unread in-LMS deliveries (`readAt: null`) and deliveries marked read within the last 7 days for the authenticated user. Resolves target availability for each item (verifying active, non-soft-deleted assignment instance targets). Interpolates localized placeholders for title and body.

### 110. Mark Notification as Read
- **Endpoint**: `/api/notifications/:deliveryId/read`
- **Method**: `PATCH`
- **Request**: None
- **Response**: `{ success: true, deliveryId: string, readAt: Date }` (200 OK)
- **Used By**: `NotificationBell.tsx`, `NotificationItemRow.tsx`
- **Permissions**: `requireAuth`
- **Rules**: Enforces delivery ownership (`delivery.notificationRecipient.userId === req.user.id`). Sets `readAt` to current timestamp. Idempotent: re-marking an already-read notification returns the existing `readAt` without error.

### 111. Paginated Notification History
- **Endpoint**: `/api/notifications/history`
- **Method**: `GET`
- **Request**: Query parameters `?page=1&pageSize=20` (pageSize capped between 1 and 50)
- **Response**: `{ items: NotificationListItem[], totalCount: number, page: number, pageSize: number, totalPages: number }` (200 OK)
- **Used By**: `NotificationHistoryModal.tsx`
- **Permissions**: `requireAuth`
- **Rules**: Returns paginated 365-day history of in-LMS deliveries for the authenticated user. Resolves target availability for linked assignment instances.

### 112. Fetch Notification Preferences
- **Endpoint**: `/api/notification-preferences`
- **Method**: `GET`
- **Request**: None
- **Response**: `{ preferences: Array<{ notificationType: string, governedBy: 'rule' | 'legacy', hasInLmsChannel: boolean, hasEmailChannel: boolean, mandatory: boolean, inLmsEnabled: boolean, emailEnabled: boolean }> }` (200 OK)
- **Used By**: `NotificationsTab.tsx`
- **Permissions**: `requireAuth`
- **Rules**: Unifies user preferences across active company notification rules and legacy settings. Reports whether each type is governed by `rule` or `legacy`, channel availability (`hasInLmsChannel`, `hasEmailChannel`), mandatory status, and per-channel toggle states (`inLmsEnabled`, `emailEnabled`). Filters out manager-only notification types (`MANAGER_COMPLETION`, `MANAGER_OVERDUE`) for users who do not currently hold an active `MANAGER`-type OU membership.

### 114. List Notification Rules
- **Endpoint**: `/api/notification-admin/rules`
- **Method**: `GET`
- **Request**: None
- **Response**: `NotificationRule[]` (200 OK)
- **Used By**: `NotificationRuleManagement.tsx`
- **Permissions**: `requireAuth`, `notifications:manage-rules`
- **Rules**: Returns all active notification rules for the user's company (`deletedAt: null`), ordered with system defaults first, then by creation date.

### 115. Create Notification Rule
- **Endpoint**: `/api/notification-admin/rules`
- **Method**: `POST`
- **Request**: `{ name: string, notificationType: NotificationType, enabled?: boolean, mandatory?: boolean, recipientConfig?: RecipientConfig, channels?: NotificationChannels, conditions?: any, titleKey?: string, bodyKey?: string, actionType?: string, actionUrl?: string }`
- **Response**: `NotificationRule` (201 Created)
- **Used By**: `NotificationRuleForm.tsx`
- **Permissions**: `requireAuth`, `notifications:manage-rules`
- **Rules**: Validates rule name, non-empty `channels` (at least one of `inLms` or `email` must be true), and valid `notificationType`. If `DUE_SOON`, enforces valid `conditions.daysBeforeDue` (integer >= 0). Creates custom rule with `isSystemDefault: false`.

### 116. Update Notification Rule
- **Endpoint**: `/api/notification-admin/rules/:id`
- **Method**: `PATCH`
- **Request**: `{ name?: string, enabled?: boolean, mandatory?: boolean, recipientConfig?: RecipientConfig, channels?: NotificationChannels, conditions?: any, titleKey?: string, bodyKey?: string, actionType?: string, actionUrl?: string }`
- **Response**: `NotificationRule` (200 OK)
- **Used By**: `NotificationRuleManagement.tsx`, `NotificationRuleForm.tsx`
- **Permissions**: `requireAuth`, `notifications:manage-rules`
- **Rules**: Validates rule exists and belongs to company. Rejects attempts to alter `notificationType` (returns 400 Bad Request; `notificationType` is strictly immutable). Enforces channel validation if updated. For system default rules, allows updating channels, templates, and enabled status.

### 117. Delete Notification Rule
- **Endpoint**: `/api/notification-admin/rules/:id`
- **Method**: `DELETE`
- **Request**: None
- **Response**: `{ success: true }` (200 OK)
- **Used By**: `NotificationRuleManagement.tsx`
- **Permissions**: `requireAuth`, `notifications:manage-rules`
- **Rules**: Soft-deletes a custom rule (`deletedAt = now()`). Blocks deletion of system-default rules (`isSystemDefault: true`) with 403 Forbidden.

### 118. Duplicate Notification Rule
- **Endpoint**: `/api/notification-admin/rules/:id/duplicate`
- **Method**: `POST`
- **Request**: None
- **Response**: `NotificationRule` (201 Created)
- **Used By**: `NotificationRuleManagement.tsx`
- **Permissions**: `requireAuth`, `notifications:manage-rules`
- **Rules**: Clones target rule (system-default or custom) into a new custom rule with `(Copy)` appended to the name, `isSystemDefault: false`, and `enabled: false`.

### 119. Delivery Failures Listing
- **Endpoint**: `/api/notification-admin/delivery-failures`
- **Method**: `GET`
- **Request**: Query parameters: `page?: number`, `pageSize?: number`, `recipientEmail?: string`, `dateFrom?: string`, `dateTo?: string`
- **Response**: `{ failures: DeliveryFailureItem[], pagination: { page, pageSize, totalCount, totalPages } }` (200 OK)
- **Used By**: `DeliveryFailures.tsx`
- **Permissions**: `requireAuth`, `notifications:view-delivery-failures`
- **Rules**: Returns paginated permanently failed email deliveries for the user's company, ordered by failure time descending.

### 120. Scheduled Notifications Listing
- **Endpoint**: `/api/scheduled-notifications`
- **Method**: `GET`
- **Request**: None
- **Response**: `ScheduledNotification[]` (200 OK)
- **Used By**: `ScheduledNotificationManagement.tsx`
- **Permissions**: `requireAuth`, `notifications:manage-scheduled`
- **Rules**: Returns all scheduled notifications for the company (both `ACTIVE` and `CANCELLED`, excluding soft-deleted `deletedAt IS NULL`), ordered chronologically by `nextExecutionAt ASC`.

### 121. Create Scheduled Notification
- **Endpoint**: `/api/scheduled-notifications`
- **Method**: `POST`
- **Request**: `{ title: string, message: string, recipientConfig: { entireCompany: boolean, groupIds: string[], userIds: string[], learner?: false, directManager?: false }, channels: { inLms: boolean, email: boolean }, startAt: string, recurrence: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY", endAt?: string | null, actionUrl?: string | null }`
- **Response**: `ScheduledNotification` (201 Created)
- **Used By**: `ScheduledNotificationForm.tsx`
- **Permissions**: `requireAuth`, `notifications:manage-scheduled`
- **Rules**: Enforces non-empty title/message, at least one delivery channel, non-learner/directManager recipient config with at least one recipient targeted, valid ISO start date. If `recurrence !== "NONE"`, `endAt` is strictly required and must be after `startAt`. Sets `nextExecutionAt = startAt` and `status = "ACTIVE"`.

### 122. Update Scheduled Notification
- **Endpoint**: `/api/scheduled-notifications/:id`
- **Method**: `PATCH`
- **Request**: `{ title?: string, message?: string, recipientConfig?: any, channels?: any, startAt?: string, recurrence?: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY", endAt?: string | null, actionUrl?: string | null }`
- **Response**: `ScheduledNotification` (200 OK)
- **Used By**: `ScheduledNotificationForm.tsx`
- **Permissions**: `requireAuth`, `notifications:manage-scheduled`
- **Rules**: Updates existing non-deleted notification belonging to company. Re-validates channels, recipient config, and conditional `endAt` requirement if recurrence is altered. Recalculates `nextExecutionAt` if `startAt` is updated and notification has not yet executed.

### 123. Cancel Scheduled Notification
- **Endpoint**: `/api/scheduled-notifications/:id/cancel`
- **Method**: `POST`
- **Request**: None
- **Response**: `{ success: true, message: string, notification: ScheduledNotification }` (200 OK)
- **Used By**: `ScheduledNotificationManagement.tsx`
- **Permissions**: `requireAuth`, `notifications:manage-scheduled`
- **Rules**: Cancels an active scheduled notification. Sets `status = "CANCELLED"`. Retains the record in the list for audit history (`deletedAt` remains `null`).

### 124. Duplicate Scheduled Notification
- **Endpoint**: `/api/scheduled-notifications/:id/duplicate`
- **Method**: `POST`
- **Request**: `{ startAt: string, endAt?: string | null, title?: string }`
- **Response**: `ScheduledNotification` (201 Created)
- **Used By**: `ScheduledNotificationManagement.tsx`
- **Permissions**: `requireAuth`, `notifications:manage-scheduled`
- **Rules**: Creates a new `ACTIVE` copy of an existing scheduled notification with a new `startAt` and optional `endAt` and `title`. Sets `nextExecutionAt = startAt` and `lastExecutedAt = null`.
