# Audit Log CSV Export Verification (Filtered + Full Streaming)

## 1. Overview & Architecture
- **No Separate Permission**: Both `GET /api/audit-logs/export` and `GET /api/audit-logs/export/all` are mounted directly on the audit router (`server/src/features/audit/routes/audit.routes.ts`) and protected by the router-level `requirePermission('audit', 'view')` middleware.
- **Zero New Dependencies**: Developed an internal, standard RFC4180-compliant CSV serializer (`escapeCsvField` and `formatCsvRow`) in `server/src/features/audit/services/auditExport.service.ts`.
- **Memory-Bounded Keyset Cursor Streaming**:
  - Batches rows using Prisma cursor pagination (`cursor: { id: lastId }`, `skip: 1`, `take: 1000`, `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`).
  - Rows are formatted and immediately written to the Express response socket via `res.write()`, streaming chunk-by-chunk without buffering entire datasets into memory.
  - Handles client disconnects (`res.writableEnded || res.destroyed`).
- **UTC ISO 8601 Deliberate Choice**:
  - Timestamps in the CSV export (`Date/Time (UTC)` and `Resolved At (UTC)`) explicitly format as UTC ISO 8601 strings (e.g. `2026-09-29T08:13:06.079Z`), because an exported download has no authenticated viewer timezone context.
- **Defense-in-Depth Sanitization on Read**:
  - `Changes` sanitized via `sanitizeAuditChanges` and formatted as `"field: before → after"` pairs joined by `" | "`. Sensitive fields like `passwordHash` are dropped.
  - `Details` sanitized via `sanitizeAuditPayload` and emitted as compact JSON without secrets.
- **Ordered Columns**:
  1. `Date/Time (UTC)`
  2. `Actor`
  3. `Category`
  4. `Action`
  5. `Affected Object Type`
  6. `Affected Object Name`
  7. `Outcome`
  8. `Auth Failure Count`
  9. `Resolved At (UTC)`
  10. `Changes`
  11. `Details`
  12. `Audit Event ID`
  13. `Affected Object ID`

---

## 2. Acceptance Criteria Verification Evidence

### 1. Filtered Export Matches List Endpoint Count
- Queried list endpoint: `GET /api/audit-logs?outcome=SUCCESS&entityType=Lesson`
  - Total count reported: `2`
- Queried export endpoint: `GET /api/audit-logs/export?outcome=SUCCESS&entityType=Lesson`
  - Total CSV data rows (excluding header): `2`
  - Matching: `true`

### 2. Full Export vs Filtered Export
- Full export: `GET /api/audit-logs/export/all`
  - Full CSV data rows exported: `52`
  - Database total rows for company: `52`
  - Matches total DB count exactly: `true`
  - Exceeds filtered count (`52 >= 2`): `true`

### 3. RFC4180 Escaping & Formatting
Tested row with commas, double-quotes, and newlines in `affectedObjectName` and `changes`:
- Name: `Module 1: "Advanced, Basics"\nNew Line Topic`
- Changes: `title: Old "Title, 1" → New "Title, 2"\nNext Line`
- Details: `{"safeNotes":"Standard notes, with \"quotes\" and, commas"}`

**Raw CSV Output (Verbatim Bytes)**:
```csv
Date/Time (UTC),Actor,Category,Action,Affected Object Type,Affected Object Name,Outcome,Auth Failure Count,Resolved At (UTC),Changes,Details,Audit Event ID,Affected Object ID
2026-09-29T08:13:06.079Z,Super Admin,LEARNING_CONTENT_ASSIGNMENTS,PUBLISH_CONTENT,Lesson,"Module 1: ""Advanced, Basics""
New Line Topic",SUCCESS,,,"title: Old ""Title, 1"" → New ""Title, 2""
Next Line","{""safeNotes"":""Standard notes, with \""quotes\"" and, commas""}",f4e1f7a0-00d9-4dd7-b24d-e9c5220da9a0,lesson-rfc4180-1
```
- RFC4180 quote-doubling verified (`""Advanced, Basics""`, `""Title, 1""`).
- Multi-line fields cleanly enclosed in outer quotes.

### 4. Secret Redaction in Export
Row seeded with `details.resetToken = "superSecretTokenExport12345"` and `changes: [{ field: "passwordHash", before: "secretHashOld", after: "secretHashNew" }]`:
- `resetToken` present in exported CSV: `false`
- `passwordHash` change present in exported CSV: `false`

### 5. Memory-Bounded Progressive Streaming Benchmark (50,000 Rows)
Seeded 50,000 rows in an isolated company and streamed `GET /api/audit-logs/export/all`:
- **Response Status**: `200`
- **Headers**:
  - `Content-Type`: `text/csv; charset=utf-8`
  - `Content-Disposition`: `attachment; filename="audit-log-company_b_export_...-2026-09-29.csv"`
  - `Transfer-Encoding`: `chunked`
- **Stream Metrics**:
  - Total Data Streamed: `11.23 MB`
  - Total HTTP Chunks Received: `88`
  - Time to First Chunk (TTFB): `18.29 ms`
  - Total Stream Time: `1391.22 ms`
  - Client Heap Delta: `0.88 MB` (flat, non-linear memory profile)

### 6. Permission Gating
Tested without `audit:view` permission:
- `GET /api/audit-logs/export/all` &rarr; `403` (`Forbidden: Missing required permission "audit:view".`)
- `GET /api/audit-logs/export` &rarr; `403` (`Forbidden: Missing required permission "audit:view".`)

### 7. Company Isolation
Seeded isolated row in Company B (`action: "EXCLUSIVE_COMPANY_B_ACTION"`, `affectedObjectName: "Company B Isolated Name"`):
- Company B action present in Company A full export: `false`
- Company B object present in Company A full export: `false`
- Company A export filtered for Company B action: `1` line (header-only, `0` data rows).

---

## 3. TypeScript Compiler Output (`npx tsc --noEmit`)

Execution command: `npx tsc --noEmit`
Exit status: `0`

```text
```
*(Zero compilation or type errors.)*
