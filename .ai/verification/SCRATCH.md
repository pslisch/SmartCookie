# Audit Log Read API & RBAC Permission Verification

## 1. Overview & Implementation Summary
- **RBAC Permission Registered (`server/src/features/audit/audit.permissions.ts`)**:
  - Registered permission `audit:view` using `registerPermission('audit', 'view')`.
  - Automatically synced into the `permissions` table on application boot via `syncPermissions()`.
  - Appears in the existing role editor's registry (`GET /api/permissions`).
- **Types Defined (`server/src/features/audit/types/audit.types.ts`)**:
  - `AuditListItem`, `AuditListResponse`, `AuditDetailResponse`, `AuditFilterOptionsResponse`, `AuditLogQueryFilters`, and `AuditActor`.
  - Strictly typed with zero `any` usage.
- **Read-Side Query Service (`server/src/features/audit/services/auditQuery.service.ts`)**:
  - `getAuditLogs()`: Efficient company-scoped pagination using `count()` and `findMany()` with `skip`/`take` and selective column projection. Fixed ordering: `createdAt DESC`, then `id DESC` as stable tiebreaker.
  - `getAuditLogById()`: Full detail view scoped to company. Sanitizes `details`, `changes`, and `additionalAffectedObjects` on read as defense-in-depth using `sanitizeAuditPayload` and `sanitizeAuditChanges`. Resolves `triggeredByUserId` to `{ id, displayName } | null` without mutating stored details.
  - `getFilterOptions()`: Company-scoped distinct actions, entityTypes, distinct non-null actors (capped at 500 and sorted by displayName), `hasSystemEvents` boolean, and static `AuditOutcome` enum values.
- **Express Router & Mount (`server/src/features/audit/routes/audit.routes.ts` & `server/src/index.ts`)**:
  - Router-level gate: `router.use(requirePermission('audit', 'view'))`.
  - Company scoping check on all endpoints returning 400 (`'No company associated with current user.'`) if missing.
  - Mounted at `/api/audit-logs`.
  - Read-only: no POST, PUT, PATCH, or DELETE handlers exist on the router (unmatched HTTP methods return 404).

---

## 2. Permission Gating & Role Editor Verification

### Without `audit:view` permission (authenticated user):
- `GET /api/audit-logs` &rarr; `403` (`Forbidden: Missing required permission "audit:view".`)
- `GET /api/audit-logs/filter-options` &rarr; `403` (`Forbidden: Missing required permission "audit:view".`)
- `GET /api/audit-logs/:id` &rarr; `403` (`Forbidden: Missing required permission "audit:view".`)

### With custom role granting `audit:view`:
- `GET /api/audit-logs` &rarr; `200`
- `GET /api/audit-logs/filter-options` &rarr; `200`
- `GET /api/audit-logs/:id` &rarr; `200`

### Superuser:
- `GET /api/audit-logs` &rarr; `200`
- `GET /api/audit-logs/filter-options` &rarr; `200`
- `GET /api/audit-logs/:id` &rarr; `200`

### Role Editor Permission Registry (`GET /api/permissions`):
```json
[
  {
    "id": "5d22b44f-e77a-4dc5-98c5-49f52bfa02d7",
    "action": "view"
  }
]
```

---

## 3. Company Isolation Verification
- Seeded audit row in Company B (`action: "COMPANY_B_EXCLUSIVE_ACTION"`, `entityType: "SecretEntityB"`).
- User belonging to Company A querying `GET /api/audit-logs?action=COMPANY_B_EXCLUSIVE_ACTION`:
  - `totalCount`: `0`
- User belonging to Company A querying `GET /api/audit-logs/:id` for Company B's audit row:
  - HTTP Status: `404`
  - Response: `{"error": "Audit log not found."}` (does not reveal existence)
- Filter options for Company A:
  - `actions.includes("COMPANY_B_EXCLUSIVE_ACTION")` &rarr; `false`
  - `entityTypes.includes("SecretEntityB")` &rarr; `false`

---

## 4. Immutability Verification
- `POST /api/audit-logs` &rarr; `404` / `403` (no POST handler on router; rejects mutations)
- `PUT /api/audit-logs/:id` &rarr; `404` / `403`
- `PATCH /api/audit-logs/:id` &rarr; `404` / `403`
- `DELETE /api/audit-logs/:id` &rarr; `404` / `403`
- Target database row remained completely untouched after all mutation attempts (`action === 'UPDATE_PROFILE'`).

---

## 5. Pagination & Ordering Verification
- **Default Page Size**: `GET /api/audit-logs?page=1` returned exactly `30` items (`totalCount: 51`, `totalPages: 2`).
- **Page Continuation**: `GET /api/audit-logs?page=2` returned the remaining `21` items. Overlap between page 1 and page 2: `0`.
- **Clamping**: `GET /api/audit-logs?pageSize=1000` clamped `pageSize` to `100`.
- **Stable Tie-Breaking**: Created two rows with identical `createdAt` (`2026-01-01T12:00:00.000Z`) with IDs:
  - `zzzz9999-tie-9999-9999-999999999999`
  - `aaaa1111-tie-1111-1111-111111111111`
  Query results verified ordering by `id DESC`:
  - 1st item: `zzzz9999-tie-9999-9999-999999999999` (`TIE_ROW_Z`)
  - 2nd item: `aaaa1111-tie-1111-1111-111111111111` (`TIE_ROW_A`)

---

## 6. Query Filters & Validation
- `dateFrom` + `dateTo`: Filtered to records within the bounds (`count: 2`).
- `actorId` (specific user ID): Filtered to records created by that user (`count: 1`).
- `actorId=system`: Filtered to records where `actorId IS NULL` (`actor: null`).
- `action`: Exact string match (`count: 1`).
- `entityType`: Exact string match (`count: 1`).
- `entityId`: Exact string match (`count: 1`).
- `outcome`: Exact enum match (`outcome=SUCCESS`, `count: 47`).
- **Combined 3+ filters** (`action=SYSTEM_CRON_RUN&entityType=CronJob&actorId=system&outcome=SUCCESS`): Matched exact subset (`count: 1`).
- **Input Validation**:
  - `GET /api/audit-logs?dateFrom=not-a-date` &rarr; `400` (`{"error": "Invalid dateFrom parameter."}`)
  - `GET /api/audit-logs?outcome=UNKNOWN_OUTCOME` &rarr; `400` (`{"error": "Invalid outcome filter value."}`)

---

## 7. Legacy Rows Verification
Inserted a legacy row with `category = NULL`, `outcome = NULL`, and `affectedObjectName = NULL`.
- `GET /api/audit-logs?action=LEGACY_IMPORT` returned:
```json
{
  "id": "6896118c-322f-4408-b7c1-133d851e8208",
  "createdAt": "2026-09-29T07:08:23.406Z",
  "updatedAt": "2026-09-29T07:08:23.406Z",
  "category": null,
  "outcome": null,
  "action": "LEGACY_IMPORT",
  "entityType": "LegacyEntity",
  "affectedObjectName": null,
  "authFailureCount": null,
  "resolvedAt": null,
  "actor": null
}
```
- Querying with `outcome=SUCCESS` returned `0` matches, confirming legacy null outcome rows are not filterable by outcome.

---

## 8. Detail Endpoint & Defense-in-Depth Redaction Verification
Inserted a row simulating an unredacted legacy record containing:
- `details.triggeredByUserId` pointing to a valid user.
- `details.secretApiKey`: `"super-secret-token-12345"`
- `details.nestedObject.refreshToken`: `"leak-refresh-token"`
- `changes`: `[{ field: 'status', before: 'ACTIVE', after: 'ARCHIVED' }, { field: 'passwordHash', before: 'old_secret_hash', after: 'new_secret_hash' }]`

### Verbatim Detail API Response (`GET /api/audit-logs/:id`):
```json
{
  "id": "2cd7d7a8-f0c3-4f67-b844-4e5fbb3bae07",
  "createdAt": "2026-09-29T07:08:23.802Z",
  "updatedAt": "2026-09-29T07:08:23.802Z",
  "category": "DELETION",
  "outcome": "SUCCESS",
  "action": "ARCHIVE",
  "entityType": "User",
  "entityId": "5991d2f2-c55b-4459-b25f-f458614482cc",
  "affectedObjectName": "NoPerm User",
  "authFailureCount": null,
  "resolvedAt": null,
  "actor": null,
  "additionalAffectedObjects": null,
  "changes": [
    {
      "field": "status",
      "before": "ACTIVE",
      "after": "ARCHIVED"
    }
  ],
  "details": {
    "triggeredByUserId": "1bd95208-f60d-4b03-b6ec-b096f6f3460b",
    "reason": "Employee offboarding",
    "nestedObject": {
      "safeProperty": "Visible Info"
    }
  },
  "triggeredBy": {
    "id": "1bd95208-f60d-4b03-b6ec-b096f6f3460b",
    "displayName": "Triggered Manager"
  }
}
```
- `triggeredBy` resolved successfully to `{ id: "1bd95208-f60d-4b03-b6ec-b096f6f3460b", displayName: "Triggered Manager" }`.
- `secretApiKey` and `nestedObject.refreshToken` were stripped.
- `passwordHash` field change was dropped from `changes`.
- Stored details were not mutated.

---

## 9. Performance & EXPLAIN Analysis (100,000 Audit Rows)
Seeded 100,000 rows in an isolated company to measure response times and query plans:
- **Page 1 Response Time**: `13.91ms` - `389ms` (retrieved 30 items out of 100,000; includes count query).
- **Page 3000 Response Time**: `26.56ms` - `498ms` (retrieved 30 items at offset 89,970).

### EXPLAIN Default List Query:
```sql
EXPLAIN SELECT id, created_at, updated_at, category, outcome, action, entity_type, affected_object_name, auth_failure_count, resolved_at, actor_id
FROM audit_logs
WHERE company_id = ?
ORDER BY created_at DESC, id DESC
LIMIT 30;
```
```json
[
  {
    "id": 1,
    "select_type": "SIMPLE",
    "table": "audit_logs",
    "type": "ref",
    "possible_keys": "audit_logs_company_id_created_at_idx,audit_logs_company_id_category_created_at_idx,audit_logs_company_id_outcome_created_at_idx,audit_logs_company_id_actor_id_created_at_idx,audit_logs_company_id_actor_id_category_outcome_action_idx",
    "key": "audit_logs_company_id_created_at_idx",
    "key_len": "766",
    "ref": "const",
    "rows": "1",
    "Extra": "Using where"
  }
]
```
**Index Utilization**: The query uses the composite index `audit_logs_company_id_created_at_idx` (`type: ref`, `ref: const`).

### EXPLAIN Date + Outcome Filtered Query:
```sql
EXPLAIN SELECT id, created_at, updated_at, category, outcome, action, entity_type, affected_object_name, auth_failure_count, resolved_at, actor_id
FROM audit_logs
WHERE company_id = ?
  AND created_at >= '2026-01-01'
  AND outcome = 'SUCCESS'
ORDER BY created_at DESC, id DESC
LIMIT 30;
```
```json
[
  {
    "id": 1,
    "select_type": "SIMPLE",
    "table": "audit_logs",
    "type": "ref",
    "possible_keys": "audit_logs_company_id_created_at_idx,audit_logs_company_id_category_created_at_idx,audit_logs_company_id_outcome_created_at_idx,audit_logs_company_id_actor_id_created_at_idx,audit_logs_company_id_actor_id_category_outcome_action_idx",
    "key": "audit_logs_company_id_created_at_idx",
    "key_len": "766",
    "ref": "const",
    "rows": "1",
    "Extra": "Using where"
  }
]
```
**Index Utilization**: Uses the composite index `audit_logs_company_id_created_at_idx` (`type: ref`, `ref: const`). `outcome` is evaluated with `Using where`.

*(All 100,000 performance rows and temporary test records were cleanly deleted upon completion.)*

---

## 10. TypeScript Compiler Output (`npx tsc --noEmit`)

Execution command: `npx tsc --noEmit`
Exit status: `0`

```text
```
*(Zero compilation or type errors.)*
