# Audit Log Search (searchText Denormalization + FULLTEXT) & EXPLAIN Re-Verification

## 1. Implementation Overview
- **Schema & Migration (`server/prisma/schema.prisma` & `server/prisma/migrations/20260929100000_add_audit_log_search_text/migration.sql`)**:
  - Added `searchText String? @map("search_text") @db.Text` to the `AuditLog` model.
  - Added `@@fulltext([searchText])` index in `schema.prisma`.
  - Created migration adding the `search_text` column and `CREATE FULLTEXT INDEX audit_logs_search_text_idx ON audit_logs(search_text)`.
- **Write-Time Denormalization (`server/src/shared/audit/auditLog.service.ts`)**:
  - `AuditLogService.log()` computes `searchText` from: `category`, `outcome`, `action`, `affectedObjectName`, `entityType`, actor label (`getUserDisplayName(actor)` or `"System"`), and flattened values-only string dump of `details`.
  - Runs strictly AFTER sanitization (`sanitizedDetails = sanitizeAuditPayload(input.details)`). Stripped secrets (e.g., `resetToken`, `password`, `apiKey`) are omitted before `extractPrimitiveValues()` runs, preventing any secret from leaking into `searchText`.
- **Search Query Service (`server/src/features/audit/services/auditQuery.service.ts`)**:
  - Shared filter builder `buildAuditLogWhereClause()` reused between `getAuditLogs` and `searchAuditLogs`.
  - `formatBooleanQuery()` strips boolean operators (`+`, `-`, `>`, `<`, `(`, `)`, `~`, `*`, `"`, `@`, `&`, `|`) and formats words with trailing wildcard operators (`+word*`) in boolean mode.
  - If `q` is a syntactically valid UUID: executes exact ID matching on `id = q` OR `entityId = q` (marked with `matchType: "exact_id"`), while also executing FULLTEXT search for non-matching rows (marked with `matchType: "fulltext"`).
  - Otherwise runs FULLTEXT search `MATCH(searchText) AGAINST ('+word*' IN BOOLEAN MODE)`.
- **Search Route (`server/src/features/audit/routes/audit.routes.ts`)**:
  - Mounted `GET /api/audit-logs/search` before `/:id` to avoid route collision.
  - Returns 400 for empty/whitespace `q`.
  - Combines with same query filters (`page`, `pageSize`, `dateFrom`, `dateTo`, `actorId`, `action`, `entityType`, `entityId`, `outcome`).

---

## 2. Acceptance Criteria Verification Evidence

### 1. Prefix vs. Infix Match (`Introduction to Biology`):
- Created audit log event:
  - `affectedObjectName`: `"Introduction to Biology"`
  - Denormalized `searchText`: `"LEARNING_CONTENT_ASSIGNMENTS SUCCESS PUBLISH_LESSON Introduction to Biology Lesson Super Admin Science and Nature"`
- **Prefix query (`q=Bio`)**:
  - HTTP Status: `200`
  - Total Count: `1`
  - Matched Object: `"Introduction to Biology"`
- **Infix query (`q=iolog`)**:
  - HTTP Status: `200`
  - Total Count: `0`
*(Confirms word-prefix FULLTEXT design matches prefix while rejecting infix substrings).*

### 2. Secret Redaction in Search Text:
- Created audit event with `details`:
  ```json
  {
    "resetToken": "superSecretResetToken98765",
    "normalAllowedNote": "AllowedNotesPrimitiveValue"
  }
  ```
- Denormalized `searchText`: `"AUTHENTICATION_SECURITY SUCCESS REQUEST_PASSWORD_RESET Super Admin User System AllowedNotesPrimitiveValue"`
- Contains secret value in `searchText`: `false`
- **Search for secret (`q=superSecretResetToken98765`)**:
  - Total Count: `0`
- **Search for allowed note (`q=AllowedNotesPrimitiveValue`)**:
  - Total Count: `1`
*(Confirms write-time sanitization prevents secrets from being indexed in searchText).*

### 3. Exact UUID Search (`matchType: exact_id`):
- Queried `GET /api/audit-logs/search?q=70ec15f7-fe65-4f40-b442-f9829f0e1329` (the exact audit event UUID):
  - HTTP Status: `200`
  - Total Count: `1`
  - `items[0].matchType`: `"exact_id"`
  - `items[0].id === "70ec15f7-fe65-4f40-b442-f9829f0e1329"`: `true`

### 4. Search Combined with 2+ Filters:
- `GET /api/audit-logs/search?q=Bio&outcome=SUCCESS&dateFrom=2026-01-01T00:00:00.000Z`:
  - Total Count: `1`
- `GET /api/audit-logs/search?q=Bio&outcome=FAILURE`:
  - Total Count: `0`

### 5. Legacy (Pre-Search) Row Visibility:
- Created legacy row with `searchText = null`, `action = "LEGACY_UNSEARCHABLE_ACTION"`, `affectedObjectName = "Legacy Unique Term XYZ"`.
- `GET /api/audit-logs/search?q=Legacy`:
  - Returns `0` results (legacy row is not matched by search).
- `GET /api/audit-logs?action=LEGACY_UNSEARCHABLE_ACTION`:
  - Returns `1` result on the plain list endpoint.

---

## 3. Performance & EXPLAIN Re-Verification (100,000 Rows Scale)

Seeded 100,000 performance rows in an isolated company, followed by:
```sql
ANALYZE TABLE audit_logs;
```

### (a) Re-Verification of Task 3 Default List Query:
```sql
EXPLAIN SELECT id, created_at, updated_at, category, outcome, action, entity_type, affected_object_name, auth_failure_count, resolved_at, actor_id
FROM audit_logs
WHERE company_id = ?
ORDER BY created_at DESC, id DESC
LIMIT 30;
```
**Output**:
```json
[
  {
    "id": 1,
    "select_type": "SIMPLE",
    "table": "audit_logs",
    "type": "ref",
    "possible_keys": "audit_logs_company_id_created_at_idx,audit_logs_company_id_category_created_at_idx,audit_logs_company_id_outcome_created_at_idx,audit_logs_company_id_actor_id_created_at_idx,audit_logs_company_id_actor_id_category_outcome_action_idx",
    "key": "audit_logs_company_id_created_at_idx",
    "key_len": "767",
    "ref": "const",
    "rows": 100258,
    "Extra": "Using filesort"
  }
]
```
**Analysis**:
- Index: `audit_logs_company_id_created_at_idx`
- Row Estimate: `100258` (reflects actual row volume of ~100,000 rows following `ANALYZE TABLE`, compared to the stale `1` row estimate before statistics collection).

### (b) Re-Verification of Task 3 Date + Outcome Query:
```sql
EXPLAIN SELECT id, created_at, updated_at, category, outcome, action, entity_type, affected_object_name, auth_failure_count, resolved_at, actor_id
FROM audit_logs
WHERE company_id = ?
  AND created_at >= '2026-01-01'
  AND outcome = 'SUCCESS'
ORDER BY created_at DESC, id DESC
LIMIT 30;
```
**Output**:
```json
[
  {
    "id": 1,
    "select_type": "SIMPLE",
    "table": "audit_logs",
    "type": "ref",
    "possible_keys": "audit_logs_company_id_created_at_idx,audit_logs_company_id_category_created_at_idx,audit_logs_company_id_outcome_created_at_idx,audit_logs_company_id_actor_id_created_at_idx,audit_logs_company_id_actor_id_category_outcome_action_idx",
    "key": "audit_logs_company_id_outcome_created_at_idx",
    "key_len": "768",
    "ref": "const,const",
    "rows": 66616,
    "Extra": "Using index condition; Using filesort"
  }
]
```
**Analysis**:
- Index: `audit_logs_company_id_outcome_created_at_idx`
- Row Estimate: `66616` (accurately reflects 2/3 of the 100,000 rows seeded with `outcome = 'SUCCESS'`).

### (c) Task 4 FULLTEXT Search Query EXPLAIN:
```sql
EXPLAIN SELECT id, created_at, updated_at, category, outcome, action, entity_type, affected_object_name, auth_failure_count, resolved_at, actor_id
FROM audit_logs
WHERE company_id = ?
  AND MATCH(search_text) AGAINST ('+Performance* +Target*' IN BOOLEAN MODE)
ORDER BY created_at DESC, id DESC
LIMIT 30;
```
**Output**:
```json
[
  {
    "id": 1,
    "select_type": "SIMPLE",
    "table": "audit_logs",
    "type": "fulltext",
    "possible_keys": "audit_logs_company_id_created_at_idx,audit_logs_company_id_category_created_at_idx,audit_logs_company_id_outcome_created_at_idx,audit_logs_company_id_actor_id_created_at_idx,audit_logs_company_id_actor_id_category_outcome_action_idx,audit_logs_search_text_idx",
    "key": "audit_logs_search_text_idx",
    "key_len": "0",
    "ref": "const",
    "rows": 1,
    "Extra": "Using where; Ft_hints: no_ranking; Using filesort"
  }
]
```
**Analysis**:
- Query access type: `fulltext`
- Index used: `audit_logs_search_text_idx` (FULLTEXT index on `search_text`).
- No table scan is performed.

---

## 4. TypeScript Compiler Output (`npx tsc --noEmit`)

Execution command: `npx tsc --noEmit`
Exit status: `0`

```text
```
*(Zero compilation or type errors.)*
