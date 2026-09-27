# Audit Log Schema Fix: Nullable Category/Outcome & Verification

## 1. Migration Strategy & Rationale
- **Approach Taken**: Direct edit of `server/prisma/migrations/20260927090000_extend_audit_log_schema/migration.sql` alongside `server/prisma/schema.prisma`.
- **Why**: The migration `20260927090000_extend_audit_log_schema` was created during the current schema extension cycle and had not yet been deployed or applied to any production environment. Correcting `category` and `outcome` in-place from `NOT NULL` to `NULL` prevents introducing migration debt and ensures a single atomic, clean schema upgrade.
- **Migration Safety**: Historical audit log entries written prior to this classification feature do not possess category or outcome values. Making `category` and `outcome` nullable in the database (`AuditCategory?`, `AuditOutcome?`) prevents migration failure on populated tables and avoids arbitrary/guessed default backfills. All new writes will be strictly validated and required at the application layer (`AuditLogService`).

---

## 2. Pre-Migration Database State
Before applying the migration, the database was inspected:
- **Pre-existing `audit_logs` row count**: `5` rows
- **Pre-existing columns**: `id`, `company_id`, `entity_type`, `entity_id`, `action`, `actor_id`, `metadata`, `created_at`

---

## 3. Exact Migration SQL Applied
File: `server/prisma/migrations/20260927090000_extend_audit_log_schema/migration.sql`

```sql
-- AlterTable
ALTER TABLE `audit_logs`
    ADD COLUMN `category` ENUM('AUTHENTICATION_SECURITY', 'PERMISSIONS_ORGANIZATION', 'LEARNING_CONTENT_ASSIGNMENTS', 'LEARNING_RESULTS', 'DELETION', 'FAILURES') NULL,
    ADD COLUMN `outcome` ENUM('SUCCESS', 'FAILURE', 'RESOLVED') NULL,
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

---

## 4. Post-Migration Database Verification
The migration script was executed directly against the database containing the 5 pre-existing rows.

### 4.1 Row Count & Data Integrity
- **Post-migration row count**: `5` rows (preserved without data loss)
- **Sample historical records**:
  - Row 1: `id`: `0d053493-f117-4199-bf1e-5a19beaa72f0`, `entity_type`: `UserAssignmentInstance`, `action`: `COMPLETED`, `category`: `null`, `outcome`: `null`, `details`: `{"assignmentId":"99109db6-0e25-4926-bd96-ebaa4b693c7c","learnerId":"bce278c3-49cd-40e7-a8d2-62bd222ccdf5"}`
  - Row 2: `id`: `202ed40f-1432-4aef-86e2-a09e335fc45d`, `entity_type`: `UserAssignmentInstance`, `action`: `COMPLETED`, `category`: `null`, `outcome`: `null`, `details`: `{"assignmentId":"e66ff763-7bf5-40e2-825d-0ab7bb97578a","learnerId":"3fab7dfc-9852-4b41-ad77-93ae0dea761a"}`
  - Row 3: `id`: `45f71e7c-57ed-4cc1-b8f4-8d77b1c5e1c6`, `entity_type`: `UserAssignmentInstance`, `action`: `CREATED`, `category`: `null`, `outcome`: `null`, `details`: `null`

### 4.2 Column Schema Confirmation (DESCRIBE `audit_logs`)
- `id`: `varchar(191)` (PRI)
- `company_id`: `varchar(191)` (MUL)
- `entity_type`: `varchar(191)`
- `entity_id`: `varchar(191)`
- `action`: `varchar(191)`
- `actor_id`: `varchar(191)` (YES / NULL)
- `details`: `longtext` (YES / NULL, successfully renamed from `metadata` with historical JSON intact)
- `created_at`: `datetime(3)` (NOT NULL)
- `category`: `enum('AUTHENTICATION_SECURITY','PERMISSIONS_ORGANIZATION','LEARNING_CONTENT_ASSIGNMENTS','LEARNING_RESULTS','DELETION','FAILURES')` (YES / NULL)
- `outcome`: `enum('SUCCESS','FAILURE','RESOLVED')` (YES / NULL)
- `affected_object_name`: `varchar(191)` (YES / NULL)
- `additional_affected_objects`: `longtext` (YES / NULL)
- `changes`: `longtext` (YES / NULL)
- `auth_failure_count`: `int(11)` (YES / NULL)
- `resolved_at`: `datetime(3)` (YES / NULL)
- `updated_at`: `datetime(3)` (NOT NULL, default `current_timestamp(3)` on update `current_timestamp(3)`)

---

## 5. Verbatim TypeScript Compiler Output (`tsc --noEmit`)

Prisma Client was regenerated via `npx prisma generate` to reflect `AuditCategory?` and `AuditOutcome?` as optional on `AuditLogCreateInput`.

Executing `npx tsc --noEmit` yielded the following verbatim output:

```text
server/src/shared/audit/auditLog.service.ts(22,9): error TS2353: Object literal may only specify known properties, and 'metadata' does not exist in type '(Without<AuditLogCreateInput, AuditLogUncheckedCreateInput> & AuditLogUncheckedCreateInput) | (Without<...> & AuditLogCreateInput)'.
```

### Analysis of Compile Error:
- Only **1** compile error exists across the entire codebase.
- The error is isolated to `server/src/shared/audit/auditLog.service.ts:22:9`, caused exclusively by the expected rename of the Prisma schema field `metadata` to `details`.
- Because `category` and `outcome` are now nullable (`AuditCategory?`, `AuditOutcome?`), Prisma Client does not require them in `AuditLogCreateInput`, so no missing property errors are emitted for category/outcome.
- Per task constraints, `auditLog.service.ts` is intentionally left untouched until the upcoming AuditLogService rewrite task.
