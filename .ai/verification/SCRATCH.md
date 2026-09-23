# Verification Evidence: Email Templates — Data Model & Backend CRUD (Phase 2, Part A)

**Date**: 2026-09-23  
**Target**: `EmailTemplate` model, CRUD endpoints (`/api/email-templates`), single-default enforcement, deletion guards, `notifications:manage-templates` permission gating, and `NotificationRule` linkage via extended `PATCH /api/notification-admin/rules/:id`.

---

## 1. Typecheck & Build Verification

- **Lint & TypeScript Validation**: `npm run lint` (`tsc --noEmit`) completed with exit code 0 (zero errors).
- **Prisma Schema Validation**: `npx prisma validate --schema=server/prisma/schema.prisma` returned valid datamodel.
- **Database Drift Check**: `npx prisma migrate diff --from-config-datasource --to-schema server/prisma/schema.prisma --exit-code` returned `No difference detected` (exit code 0).
- **Application Build**: `npm run build` (`vite build && tsc -p server/tsconfig.json`) succeeded cleanly.

---

## 2. Permission Gating Verification (`notifications:manage-templates`)

- **User without permission**:
  - User: `no_tmpl_user_1758614330691@example.com` (Role: `No Template Access Role`, company: `SmartCookieDev` `730917be-9701-4af6-aef6-c78afb730d2b`, assigned only `notifications:manage-rules`).
  - Request: `GET /api/email-templates`
  - Response: **HTTP 403 Forbidden**
  ```json
  {
    "error": "Forbidden: Missing required permission \"notifications:manage-templates\"."
  }
  ```

---

## 3. Template Creation & Single-Default Enforcement

### Step 3A: Create Template 1 as Initial Default
- **User**: `template_admin_1758614330689@example.com` (Role: `Template Manager Role` with `notifications:manage-templates`)
- **Request**: `POST /api/email-templates`
  ```json
  {
    "name": "Standard Corporate Notification Template",
    "htmlContent": "<div class=\"email-base\"><h1>SmartCookie Learning</h1><div>{{body}}</div></div>",
    "isDefault": true
  }
  ```
- **Response**: **HTTP 201 Created**
  ```json
  {
    "id": "2cffa2d5-2be7-4f66-88bf-01936e13aa63",
    "companyId": "730917be-9701-4af6-aef6-c78afb730d2b",
    "name": "Standard Corporate Notification Template",
    "isDefault": true,
    "htmlContent": "<div class=\"email-base\"><h1>SmartCookie Learning</h1><div>{{body}}</div></div>",
    "createdById": "53472091-bf99-4d6d-b8d9-3e33f38ce713",
    "createdAt": "2026-09-23T07:59:04.298Z",
    "updatedAt": "2026-09-23T07:59:04.298Z",
    "deletedAt": null,
    "createdBy": {
      "id": "53472091-bf99-4d6d-b8d9-3e33f38ce713",
      "username": "tmpl_admin_1758614330689",
      "email": "template_admin_1758614330689@example.com",
      "firstName": null,
      "lastName": null
    },
    "_count": {
      "notificationRules": 0
    }
  }
  ```

### Step 3B: Create Template 2 as Non-Default
- **Request**: `POST /api/email-templates`
  ```json
  {
    "name": "Compliance Urgent Alert Template",
    "htmlContent": "<div class=\"alert-base\"><h2>Urgent Action Required</h2><div>{{body}}</div></div>",
    "isDefault": false
  }
  ```
- **Response**: **HTTP 201 Created**
  ```json
  {
    "id": "c48d6b5f-6b5c-4a66-92fc-11d6ad3c04c9",
    "companyId": "730917be-9701-4af6-aef6-c78afb730d2b",
    "name": "Compliance Urgent Alert Template",
    "isDefault": false,
    "htmlContent": "<div class=\"alert-base\"><h2>Urgent Action Required</h2><div>{{body}}</div></div>",
    "createdById": "53472091-bf99-4d6d-b8d9-3e33f38ce713",
    "createdAt": "2026-09-23T07:59:04.380Z",
    "updatedAt": "2026-09-23T07:59:04.380Z",
    "deletedAt": null
  }
  ```

### Step 3C: Single-Default Enforcement via PATCH
- **Before PATCH**:
  - Template 1 (`2cffa2d5-2be7-4f66-88bf-01936e13aa63`): `isDefault = true`
  - Template 2 (`c48d6b5f-6b5c-4a66-92fc-11d6ad3c04c9`): `isDefault = false`
- **Action**: Update Template 2 to `isDefault: true`
  - Request: `PATCH /api/email-templates/c48d6b5f-6b5c-4a66-92fc-11d6ad3c04c9`
  - Payload: `{ "isDefault": true }`
  - Response: **HTTP 200 OK**
- **After PATCH Verification**:
  - Template 1 (`2cffa2d5-2be7-4f66-88bf-01936e13aa63`): `isDefault = false` (automatically unset by transactional enforcement)
  - Template 2 (`c48d6b5f-6b5c-4a66-92fc-11d6ad3c04c9`): `isDefault = true`

---

## 4. NotificationRule Linkage via Extended Rule-PATCH

- **Target Rule**: `1b0693de-d735-4f41-8ed4-fe6f1dddd3be` ("Manager Completion Notice")
- **State BEFORE**:
  ```json
  {
    "id": "1b0693de-d735-4f41-8ed4-fe6f1dddd3be",
    "name": "Manager Completion Notice",
    "emailTemplateId": null
  }
  ```
- **Action**: Link Rule to Custom Template 2 (`c48d6b5f-6b5c-4a66-92fc-11d6ad3c04c9`)
  - Request: `PATCH /api/notification-admin/rules/1b0693de-d735-4f41-8ed4-fe6f1dddd3be`
  - Payload:
    ```json
    {
      "emailTemplateId": "c48d6b5f-6b5c-4a66-92fc-11d6ad3c04c9"
    }
    ```
  - Response: **HTTP 200 OK**
- **State AFTER**:
  ```json
  {
    "id": "1b0693de-d735-4f41-8ed4-fe6f1dddd3be",
    "name": "Manager Completion Notice",
    "emailTemplateId": "c48d6b5f-6b5c-4a66-92fc-11d6ad3c04c9"
  }
  ```

---

## 5. Deletion Guards Verification

### 5A. Attempt to Delete Referenced Template (Expect 400)
- **Context**: Template 1 is restored to default, leaving Template 2 as `isDefault: false` and referenced by `1b0693de-d735-4f41-8ed4-fe6f1dddd3be`.
- **Request**: `DELETE /api/email-templates/c48d6b5f-6b5c-4a66-92fc-11d6ad3c04c9`
- **Response**: **HTTP 400 Bad Request**
  ```json
  {
    "error": "Cannot delete email template because it is currently referenced by 1 notification rule(s). Please reassign or clear those rules first."
  }
  ```
- **Outcome**: Template deletion was blocked, preventing broken notification rule rendering.

### 5B. Attempt to Delete Default Template (Expect 400)
- **Context**: Template 1 (`2cffa2d5-2be7-4f66-88bf-01936e13aa63`) is `isDefault: true` and has 0 referencing rules.
- **Request**: `DELETE /api/email-templates/2cffa2d5-2be7-4f66-88bf-01936e13aa63`
- **Response**: **HTTP 400 Bad Request**
  ```json
  {
    "error": "Cannot delete the current default email template. Please designate another default template or unset default status first via PATCH."
  }
  ```
- **Outcome**: Default template cannot be deleted outright; requires explicitly unsetting default status first.

---

## 6. Tenant & Cross-Company Isolation Verification

### 6A. Reject Linking Rule to Foreign Company's Template
- **Company B Template**: Created template `75ade4f4-d7ee-423e-a329-ca5d1e287b8b` in tenant `fe38d0c5-12c6-44b7-a449-61efa7ed124c` ("Other Isolation Test Co").
- **Action**: Company A admin attempts to link Company A rule `1b0693de-d735-4f41-8ed4-fe6f1dddd3be` to Company B's template.
- **Request**: `PATCH /api/notification-admin/rules/1b0693de-d735-4f41-8ed4-fe6f1dddd3be`
  ```json
  {
    "emailTemplateId": "75ade4f4-d7ee-423e-a329-ca5d1e287b8b"
  }
  ```
- **Response**: **HTTP 404 Not Found**
  ```json
  {
    "error": "Email template not found or does not belong to your company."
  }
  ```

### 6B. Reject Direct Retrieval of Foreign Template
- **Action**: Company A admin calls `GET /api/email-templates/75ade4f4-d7ee-423e-a329-ca5d1e287b8b`
- **Response**: **HTTP 404 Not Found**
  ```json
  {
    "error": "Email template not found."
  }
  ```

---

## 7. Clearing Rule Linkage & Successful Soft-Delete

### Step 7A: Clear Rule Linkage back to Generic Default
- **Request**: `PATCH /api/notification-admin/rules/1b0693de-d735-4f41-8ed4-fe6f1dddd3be`
  ```json
  {
    "emailTemplateId": null
  }
  ```
- **Response**: **HTTP 200 OK**
- **Verified DB State**: `notificationRule.emailTemplateId = null`

### Step 7B: Delete Unreferenced Non-Default Template
- **Request**: `DELETE /api/email-templates/c48d6b5f-6b5c-4a66-92fc-11d6ad3c04c9`
- **Response**: **HTTP 200 OK**
  ```json
  {
    "success": true,
    "message": "Email template deleted successfully."
  }
  ```
- **Verified DB State**:
  - `deletedAt = 2026-09-23T07:59:05.980Z`
  - `GET /api/email-templates` excludes soft-deleted record.
