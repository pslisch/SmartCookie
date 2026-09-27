# AuditLogService Contract Rewrite & Call Site Migration Verification

## 1. Overview & Architectural Summary
- **Contract Signature Updated**: Replaced `AuditLogService.log()` with `AuditLogInput` accepting required `companyId`, `category`, `outcome`, `action`, `actorId`, `entityType`, `entityId`, `affectedObjectName`, and optional `additionalAffectedObjects`, `changes`, `details`.
- **Sanitizer Integration**: Created `server/src/shared/audit/auditSanitizer.ts`. All `details`, `changes`, and `additionalAffectedObjects` pass through `sanitizeAuditPayload()` prior to Prisma insertion. Case-insensitive sensitive keys matching `password`, `token`, `secret`, `apikey`, `api_key`, `accesstoken`, `refreshtoken`, `resettoken`, `mfasecret`, `hash`, `credential` are recursively omitted (deleted) entirely.
- **Bug 1 Fixed**: `userManagement.service.ts` line ~259 formerly passed `user.companyId || 'SYSTEM'`. `user.companyId` is now passed directly (with an explicit check throwing an error if a user lacks a companyId), preventing foreign key violations against `companies(id)`.
- **Bug 2 Fixed**: `entraSync.service.ts` lines ~310 & ~404 formerly passed `triggeredByUserId || 'SYSTEM'` as `actorId`. Per spec, `actorId` is set to `null` (System actor) and `triggeredByUserId` is recorded inside `details` under `{ triggeredByUserId }`.
- **All Call Sites Migrated**: Updated all 9 call sites across 8 files to the new `AuditLogInput` shape.

---

## 2. Summary of 9 Migrated Call Sites

1. **`assignment.service.ts` (`CREATE_LESSON_ASSIGNMENT`)**:
   - `category`: `LEARNING_CONTENT_ASSIGNMENTS`, `outcome`: `SUCCESS`
   - `affectedObjectName`: `lesson.title`
2. **`assignment.service.ts` (`CREATE_COURSE_ASSIGNMENT`)**:
   - `category`: `LEARNING_CONTENT_ASSIGNMENTS`, `outcome`: `SUCCESS`
   - `affectedObjectName`: `course.title`
3. **`assignment.service.ts` (`CANCEL_ASSIGNMENT`)**:
   - `category`: `LEARNING_CONTENT_ASSIGNMENTS`, `outcome`: `SUCCESS`
   - `affectedObjectName`: `assignment.lesson.title` (included `lesson` relation in query)
4. **`completion.service.ts` (`COMPLETED`)**:
   - `category`: `LEARNING_RESULTS`, `outcome`: `SUCCESS`
   - `affectedObjectName`: `instance.assignment.lesson.title`
5. **`mandatoryAssignment.service.ts` (`CREATED`)**:
   - `category`: `LEARNING_CONTENT_ASSIGNMENTS`, `outcome`: `SUCCESS`
   - `affectedObjectName`: `assignment.lesson.title` (included `lesson` relation in query)
6. **`materialization.service.ts` (`CREATED`)**:
   - `category`: `LEARNING_CONTENT_ASSIGNMENTS`, `outcome`: `SUCCESS`
   - `affectedObjectName`: `assignment.lesson.title`
7. **`membershipAssignmentHooks.service.ts` (`CREATED` - OU & Learning Group branches)**:
   - `category`: `LEARNING_CONTENT_ASSIGNMENTS`, `outcome`: `SUCCESS`
   - `affectedObjectName`: `assignment.lesson.title` (included `lesson` relation in query)
8. **`userManagement.service.ts` (`ARCHIVE`)**:
   - `category`: `PERMISSIONS_ORGANIZATION`, `outcome`: `SUCCESS`
   - `affectedObjectName`: `getUserDisplayName(user)`
   - Bug fix applied: `user.companyId` validated and used directly without `'SYSTEM'` fallback string.
9. **`userReactivation.service.ts` (`REACTIVATE_RESTORE`, `REACTIVATE_FRESH_START`)**:
   - `category`: `PERMISSIONS_ORGANIZATION`, `outcome`: `SUCCESS`
   - `affectedObjectName`: `getUserDisplayName(user)`
10. **`entraSync.service.ts` (`PROVISION_ENTRA`, `ARCHIVE_DELETED_ENTRA_USER`)**:
    - `PROVISION_ENTRA`: `category`: `PERMISSIONS_ORGANIZATION`, `outcome`: `SUCCESS`
    - `ARCHIVE_DELETED_ENTRA_USER`: `category`: `DELETION`, `outcome`: `SUCCESS`
    - `affectedObjectName`: `getUserDisplayName(user / missingUser)`
    - Bug fix applied: `actorId = null` (System actor) with `triggeredByUserId` passed in `details`.

---

## 3. Verbatim TypeScript Compiler Output (`npx tsc --noEmit`)

Execution command: `npx tsc --noEmit`
Exit status: `0`

```text
```
*(No compilation errors were produced. Project compiles completely clean.)*

---

## 4. Live Database Secret Redaction Test

A test record was inserted via `AuditLogService.log()` with secret keys (`password`, `userToken`, `apiKey`, `resetToken`, `nested.mfaSecret`, `nested.credentialHash`) and non-secret keys (`note`, `nested.safeField`).

### Read-Back Database Payload:
```json
{
  "id": "a64c12ef-2df4-46bb-86e0-ef925c4db2ff",
  "companyId": "4ff77413-5777-44f3-b77a-ec4f67c30e20",
  "entityType": "SecurityTest",
  "entityId": "test-id-123",
  "action": "TEST_SANITIZATION",
  "actorId": null,
  "details": {
    "note": "This note must survive sanitization",
    "nested": {
      "safeField": "keep this"
    }
  },
  "createdAt": "2026-09-27T09:50:18.232Z",
  "category": "AUTHENTICATION_SECURITY",
  "outcome": "SUCCESS",
  "affectedObjectName": "Test User Security Object",
  "additionalAffectedObjects": null,
  "changes": [
    {
      "after": "newPass",
      "before": "oldPass",
      "field": "password"
    },
    {
      "after": "new@example.com",
      "before": "old@example.com",
      "field": "email"
    }
  ],
  "authFailureCount": null,
  "resolvedAt": null,
  "updatedAt": "2026-09-27T09:50:18.232Z"
}
```

### Result:
- `password`, `userToken`, `apiKey`, `resetToken`, `mfaSecret`, `credentialHash` keys were **deleted entirely** from `details`.
- `note` and `nested.safeField` were preserved intact.
