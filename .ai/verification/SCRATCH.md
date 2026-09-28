# Audit Log — Changes Array Sensitive Field Redaction Verification

## 1. Overview & Root Cause Analysis
- **Problem**: `sanitizeAuditPayload()` previously only checked object keys. When passed an array of structured changes `{ field: "password", before: "oldPass", after: "newPass" }`, the object keys are `"field"`, `"before"`, and `"after"`—none of which match the sensitive-key deny-list. Consequently, sensitive field diffs (e.g. passwords, tokens, API keys) bypassed redaction and were stored in plaintext.
- **Solution**:
  - Exported `isSensitiveKey` from `server/src/shared/audit/auditSanitizer.ts`.
  - Added dedicated function `sanitizeAuditChanges(changes: AuditLogChange[])` in `auditSanitizer.ts`.
  - For each change entry, the function evaluates `entry.field` (the value of the property) against `isSensitiveKey()`.
  - If sensitive, the entire entry is dropped from the array (deleted entirely, not masked).
  - If safe, the entry is still passed through `sanitizeAuditPayload` defensively.
  - When all entries in `changes` are sensitive, the function returns `[]`, persisting as an empty array `[]` (not `null`), ensuring "no changes were safe to log" is not conflated with "no changes occurred".
  - Updated `AuditLogService.log()` in `server/src/shared/audit/auditLog.service.ts` to call `sanitizeAuditChanges(input.changes)` instead of the generic payload sanitizer.

---

## 2. Verbatim TypeScript Compiler Output (`npx tsc --noEmit`)

Execution command: `npx tsc --noEmit`
Exit status: `0`

```text
```
*(No compilation errors were produced. Project compiles completely clean.)*

---

## 3. Real Database Re-Verification Test

### 3.1 Mixed Sensitive and Safe Changes Array Test
A test record was inserted with both sensitive (`field: "password"`) and safe (`field: "email"`) entries in `changes`, along with secrets in `details`.

#### Real Read-Back Row From Database (`FETCHED_ROW`):
```json
{
  "id": "a3f889d1-8ee4-4c86-90c7-01053b925b30",
  "companyId": "730917be-9701-4af6-aef6-c78afb730d2b",
  "entityType": "SecurityTest",
  "entityId": "test-id-123",
  "action": "TEST_SANITIZATION",
  "actorId": null,
  "category": "AUTHENTICATION_SECURITY",
  "outcome": "SUCCESS",
  "affectedObjectName": "Test User Security Object",
  "additionalAffectedObjects": null,
  "changes": [
    {
      "field": "email",
      "before": "old@example.com",
      "after": "new@example.com"
    }
  ],
  "details": {
    "note": "This note must survive sanitization",
    "nested": {
      "safeField": "keep this"
    }
  },
  "authFailureCount": null,
  "resolvedAt": null,
  "createdAt": "2026-09-28T07:00:59.102Z",
  "updatedAt": "2026-09-28T07:00:59.102Z"
}
```

### 3.2 All-Sensitive Changes Array Test
A test record was inserted with only sensitive entries (`password` and `apiKey`).

#### Real Read-Back Row From Database (`ALL_SENSITIVE_ROW_CHANGES`):
```json
[]
```
- The empty result persists as `[]` (not `null`).

### 3.3 Verification Confirmation
- In `changes`: The `{ field: "password", before: "oldPass", after: "newPass" }` entry was **completely dropped**; the safe `{ field: "email", before: "old@example.com", after: "new@example.com" }` entry was **preserved intact**.
- In `details`: Sensitive keys (`password`, `userToken`, `apiKey`, `resetToken`, `mfaSecret`, `credentialHash`) remain stripped, while non-sensitive fields (`note`, `nested.safeField`) are preserved.
