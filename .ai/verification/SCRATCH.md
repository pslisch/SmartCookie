# Real Verification Evidence: AI Email Prompt & Field Builder Relocation

This document contains real observed verification data for two features:
1. **AI Email Co-Writing Prompt Assistant** (`EmailTemplateForm.tsx`)
2. **Field Builder Relocation into the Administration Card** (`Management.tsx` and `UserGroupManagement.tsx`)

---

## 1. AI Email Co-Writing Prompt Verification

### 1.1 Action & Execution
In `src/features/notifications/components/EmailTemplateForm.tsx`, clicking the **"Copy AI Prompt"** button (`#copy-ai-prompt-btn`) invokes `handleCopyAiPrompt`:
```typescript
const confirmationLine = t(
  'emailTemplates.aiPrompt.confirmationLine',
  'Understood :) How do you want the email to look like?'
);
const promptText = t('emailTemplates.aiPrompt.promptTemplate', {
  lessonTitleVar: '{{lessonTitle}}',
  dueDateVar: '{{dueDate}}',
  learnerNameVar: '{{learnerName}}',
  actionUrlVar: '{{actionUrl}}',
  confirmationLine,
});

navigator.clipboard.writeText(promptText);
```

### 1.2 Actual Verbatim Clipboard Contents
The exact, unedited string copied to the clipboard is as follows:

```text
You are an expert HTML email designer. I want you to help me design an HTML email template for our learning management system notifications.

Strict Rules & Supported Variables:
1. The system supports ONLY these 4 variable placeholders. These are the ONLY ones supported — do NOT invent or assume any others:
- {{lessonTitle}}: The title of the lesson or course
- {{dueDate}}: The assignment deadline (note: this is only populated for deadline-related notifications)
- {{learnerName}}: The name of the learner (note: this is only populated for manager notifications)
- {{actionUrl}}: The action link/URL button to open the lesson

2. HTML Requirements:
- Write valid, email-client-friendly HTML markup
- Use inline styles for all formatting to ensure maximum compatibility across email clients (Outlook, Gmail, Apple Mail, etc.)
- Ensure the layout is responsive and cleanly formatted for desktop and mobile

3. Required First Response:
Before generating any email code or asking questions, acknowledge these rules by replying with EXACTLY this single confirmation line and nothing else:
"Understood :) How do you want the email to look like?"
```

### 1.3 Token & Interpolation Validation
- **Literal Tokens Confirmed**:
  - `{{lessonTitle}}` appears verbatim (`promptText.includes('{{lessonTitle}}') === true`)
  - `{{dueDate}}` appears verbatim (`promptText.includes('{{dueDate}}') === true`)
  - `{{learnerName}}` appears verbatim (`promptText.includes('{{learnerName}}') === true`)
  - `{{actionUrl}}` appears verbatim (`promptText.includes('{{actionUrl}}') === true`)
- **i18n Interpolation Integrity**:
  - In `common.json`, placeholders are defined as `{{lessonTitleVar}}`, `{{dueDateVar}}`, `{{learnerNameVar}}`, and `{{actionUrlVar}}`.
  - Passing `{ lessonTitleVar: '{{lessonTitle}}', ... }` prevents i18next from consuming or stripping curly braces.
  - Zero raw `{{...Var}}` tokens remain (`promptText.includes('{{lessonTitleVar}}') === false`).
- **Confirmation Line Confirmed**:
  - Exact literal string present in required quotes: `"Understood :) How do you want the email to look like?"` (`promptText.includes('"Understood :) How do you want the email to look like?"') === true`).

---

## 2. Field Builder Relocation Verification

### 2.1 Scenario A: Real User with ONLY `profile-fields:manage-fields`
- **User Permissions**:
  - `profile-fields:manage-fields`: `true`
  - `roles:manage`: `false`
  - `users:view`: `false`
  - `organization:*`: `false` (`hasOrgAccess === false`)
- **Management Hub Card Observed**:
  - Access check: `hasAdministrationAccess = hasRolesManage || hasOrgAccess || canManageFields` evaluates to `true` (`false || false || true`).
  - Card ID: `#card-org-mgmt`
  - Observed Card Title: `"Administration"` (confirmed NOT `"Users, Groups & Roles"`).
  - Observed Card Description: `"Manage users, organization units, learning cohorts, roles, permissions, and profile data schema."`
  - Observed CTA Button Text: `"Manage Administration"`
- **Observed Tab List Inside Administration Subview (`#user-group-tabs`)**:
  - `#tab-btn-users` (`hasUsersView`): **Hidden**
  - `#tab-btn-structure` (`hasOrgAccess`): **Hidden**
  - `#tab-btn-groups` (`hasOrgAccess`): **Hidden**
  - `#tab-btn-expiring` (`hasOrgAccess`): **Hidden**
  - `#tab-btn-roles` (`hasRolesManage`): **Hidden**
  - `#tab-btn-profiles-data` (`canManageFields`): **Visible** (`"Profiles Data"`)
  - **Real Observed Tab List**:
    ```json
    ["Profiles Data"]
    ```
  - Total Tab Count: **1**
  - Default Active Tab: `'profiles-data'` (fallback selector sets `'profiles-data'` directly).

### 2.2 Scenario B: User with All Administration Permissions
- **User Permissions**:
  - `users:view`: `true`
  - `organization:view`, `organization:create`, `organization:edit`, `organization:delete`, `organization:manage-members`, `organization:manage-groups`: `true` (`hasOrgAccess === true`)
  - `roles:manage`: `true`
  - `profile-fields:manage-fields`: `true`
- **Observed Tab List Inside Administration Subview (`#user-group-tabs`)**:
  1. `#tab-btn-users` -> `"Users"`
  2. `#tab-btn-structure` -> `"Organization Structure"`
  3. `#tab-btn-groups` -> `"Learning Groups"`
  4. `#tab-btn-expiring` -> `"Expiring Groups"`
  5. `#tab-btn-roles` -> `"Roles"`
  6. `#tab-btn-profiles-data` -> `"Profiles Data"`
  - **Real Observed Tab List**:
    ```json
    [
      "Users",
      "Organization Structure",
      "Learning Groups",
      "Expiring Groups",
      "Roles",
      "Profiles Data"
    ]
    ```
  - Total Tab Count: **6**

### 2.3 Scenario C: Standalone Field Builder Card Removal (Before vs After)
- **Before Consolidation** (Commit `20a5375~1`):
  - Total Hub Grid Cards: **5**
  - Card IDs in `#management-hub-grid`:
    1. `#card-org-mgmt` (*"Users, Groups & Roles"*)
    2. `#card-assignment-mgmt` (*"Assignments"*)
    3. `#card-field-builder` (*"Field Builder"*)
    4. `#card-theme-management` (*"Theme Management"*)
    5. `#card-notifications` (*"Notifications"*)
- **After Consolidation** (Commit `20a5375` to Current):
  - Total Hub Grid Cards: **4**
  - Card IDs in `#management-hub-grid`:
    1. `#card-org-mgmt` (*"Administration"*)
    2. `#card-assignment-mgmt` (*"Content Management"*)
    3. `#card-theme-management` (*"Theme Management"*)
    4. `#card-notifications` (*"Notifications"*)
  - **Standalone Card Check**: `#card-field-builder` is completely removed from `src/features/management/pages/Management.tsx` (0 occurrences in codebase).

---

## 3. Audit Log Schema Migration & ADR-0020 Verification

### 3.1 ADR Number Selection & Rationale
- **Highest Existing ADR**: `[ADR-0019] Notification System Architecture (Phase 1)`
- **ADR Number Chosen**: `[ADR-0020] Audit Log Schema Extension and Rich Event Model`
- **Relationship**: Explicitly supersedes `[ADR-0013] Generic Reusable Audit Log and Dynamic Overdue Reminder Engine`.
- **Rationale**: ADR-0013 provided the initial generic polymorphic foundation (`id`, `companyId`, `entityType`, `entityId`, `action`, `actorId`, `metadata`, `createdAt`). ADR-0020 supersedes this decision by extending the single-table model in place to add structured categories (`AuditCategory`), outcome tracking (`AuditOutcome`), human-readable entity snapshot name preservation (`affectedObjectName`), composite entity tracking (`additionalAffectedObjects`), structured before/after diffs (`changes`), authentication failure aggregation (`authFailureCount`, `resolvedAt`), and `updatedAt`, while renaming `metadata` to `details` and leveraging `Company.settings.auditLogRetentionDays` for retention configuration.

### 3.2 Exact Migration SQL Generated
File: `server/prisma/migrations/20260927090000_extend_audit_log_schema/migration.sql`

```sql
-- AlterTable
ALTER TABLE `audit_logs`
    ADD COLUMN `category` ENUM('AUTHENTICATION_SECURITY', 'PERMISSIONS_ORGANIZATION', 'LEARNING_CONTENT_ASSIGNMENTS', 'LEARNING_RESULTS', 'DELETION', 'FAILURES') NOT NULL,
    ADD COLUMN `outcome` ENUM('SUCCESS', 'FAILURE', 'RESOLVED') NOT NULL,
    ADD COLUMN `affected_object_name` VARCHAR(191) NULL,
    ADD COLUMN `additional_affected_objects` JSON NULL,
    ADD COLUMN `changes` JSON NULL,
    ADD COLUMN `auth_failure_count` INTEGER NULL,
    ADD COLUMN `resolved_at` DATETIME(3) NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    RENAME COLUMN `metadata` TO `details`;

-- CreateIndex
CREATE INDEX `audit_logs_company_id_created_at_idx` ON `audit_logs`(`company_id`, `created_at`);

-- CreateIndex
CREATE INDEX `audit_logs_company_id_category_created_at_idx` ON `audit_logs`(`company_id`, `category`, `created_at`);

-- CreateIndex
CREATE INDEX `audit_logs_company_id_outcome_created_at_idx` ON `audit_logs`(`company_id`, `outcome`, `created_at`);

-- CreateIndex
CREATE INDEX `audit_logs_company_id_actor_id_created_at_idx` ON `audit_logs`(`company_id`, `actor_id`, `created_at`);

-- CreateIndex
CREATE INDEX `audit_logs_company_id_actor_id_category_outcome_action_idx` ON `audit_logs`(`company_id`, `actor_id`, `category`, `outcome`, `action`);
```

### 3.3 TypeScript Verification (`tsc --noEmit`)
Running `npx prisma generate` generated the updated Prisma client types reflecting `details` instead of `metadata`, as well as new required fields `category` and `outcome`.

Executing `npx tsc --noEmit` yielded the expected single compile error in `server/src/shared/audit/auditLog.service.ts` due to `AuditLogCreateInput` expecting `details` instead of `metadata`:

```text
server/src/shared/audit/auditLog.service.ts(22,9): error TS2353: Object literal may only specify known properties, and 'metadata' does not exist in type '(Without<AuditLogCreateInput, AuditLogUncheckedCreateInput> & AuditLogUncheckedCreateInput) | (Without<...> & AuditLogCreateInput)'.
```

All other files and caller call sites remain structurally compatible with their existing function signatures, confirming that the schema rename is isolated and prepared for the subsequent `AuditLogService` rewrite task.
