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
- **Used By**: SCORM Content Library Page
- **Permissions**: Requires active session with `"content:view"` permission.

### 55. Import SCORM Package
- **Endpoint**: `/api/content/import`
- **Method**: `POST`
- **Request**: Multipart form containing `package` file (ZIP), `categoryId`, and tags
- **Response**: Imported `Content` object (201 Created)
- **Used By**: ContentImportWizard component
- **Permissions**: Requires active session with `"content:import"` permission.

### 56. Publish SCORM Package
- **Endpoint**: `/api/content/:id/publish`
- **Method**: `POST`
- **Request**: None
- **Response**: Updated `Content` object with status `PUBLISHED` (200 OK)
- **Used By**: SCORM Content Library
- **Permissions**: Requires active session with `"content:publish"` permission.

### 57. Archive SCORM Package
- **Endpoint**: `/api/content/:id/archive`
- **Method**: `POST`
- **Request**: None
- **Response**: Updated `Content` object with status `ARCHIVED` (200 OK)
- **Used By**: SCORM Content Library
- **Permissions**: Requires active session with `"content:archive"` permission.

### 58. Restore SCORM Package
- **Endpoint**: `/api/content/:id/restore`
- **Method**: `POST`
- **Request**: `{ targetStatus: "DRAFT" | "PUBLISHED" }`
- **Response**: Updated `Content` object (200 OK)
- **Used By**: SCORM Content Library
- **Permissions**: Requires active session with `"content:restore"` permission.

### 59. Download SCORM original ZIP
- **Endpoint**: `/api/content/:id/download`
- **Method**: `GET`
- **Request**: None
- **Response**: Binary stream of the original uploaded `.zip` package (200 OK)
- **Used By**: SCORM Content Library / Version lists
- **Permissions**: Requires active session with `"content:download-zip"` permission.

### 60. List SCORM Package Versions
- **Endpoint**: `/api/content/:contentGroupId/versions`
- **Method**: `GET`
- **Request**: None
- **Response**: List of all package versions under the same group ID (200 OK)
- **Used By**: SCORM Content Library Version History Modal
- **Permissions**: Requires active session with `"content:view"` permission.

### 61. Start SCORM Content Attempt
- **Endpoint**: `/api/content-attempts/start`
- **Method**: `POST`
- **Request**: `{ userAssignmentInstanceId }`
- **Response**: Created `ContentAttempt` object (201 Created)
- **Used By**: ScormPlayer iframe launcher
- **Permissions**: Requires active session with `"assignments:view"` permission.

### 62. Commit SCORM Content Attempt State
- **Endpoint**: `/api/content-attempts/:id/commit`
- **Method**: `POST`
- **Request**: JSON object containing SCORM CMI state (`lessonStatus`, `scoreRaw`, `sessionTimeSeconds`, etc.)
- **Response**: `{ success: true, attempt: ContentAttempt, instanceStatus: string }` (200 OK)
- **Used By**: ScormPlayer SCORM 1.2 runtime bridge
- **Permissions**: Requires active session with `"assignments:view"` permission.

### 63. Fetch Attempt History
- **Endpoint**: `/api/content-attempts/:instanceId`
- **Method**: `GET`
- **Request**: None
- **Response**: List of all attempt records for the assignment instance (200 OK)
- **Used By**: ScormPlayer / AssignmentInstanceReport components
- **Permissions**: Requires active session with `"assignments:view"` permission.



