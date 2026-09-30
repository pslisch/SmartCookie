# Audit Log Retention Cleanup Job & Write-Failure Alerting Verification

## 1. Architectural Summary & Implementation

- **Resilient Audit Log Writing (`AuditLogService.log`)**:
  - `server/src/shared/audit/auditLog.service.ts`: Implemented retry-once execution with fallback alerting.
  - On first database create error, waits 200ms and retries the insert once.
  - If the second attempt succeeds, returns the created `AuditLog` row normally without alerting.
  - If both attempts fail, calls `auditWriteFailureAlertService.sendAuditWriteFailureAlert` passing sanitized error metadata (no raw passwords, tokens, or secrets), and returns `null`.
  - The entire method is safely trapped; it NEVER throws or propagates an exception to the caller.
- **Recipient Resolution & Write-Failure Alerting (`AuditWriteFailureAlertService`)**:
  - `server/src/shared/audit/auditWriteFailureAlert.service.ts`: Resolves recipients as:
    `(permission holders of audit:receive-failure-alerts for that company)` UNION `(company.settings.auditLogFailureAlertRecipients)`, deduped by lowercase email.
  - Sends the `audit-log-failure` email template containing human-readable description, affected action, affected object, timestamp, and technical error.
  - If sending the failure alert throws, waits and retries once.
  - If the retry also throws, sends the generic fallback template `audit-log-system-problem` (no payload details).
  - If that also fails, logs to console and stops without retrying or attempting third templates.
- **Retention & Alert Settings Endpoints**:
  - `server/src/features/audit/routes/audit.routes.ts`: Added `GET /api/audit-logs/settings` and `PATCH /api/audit-logs/settings`.
  - Gated strictly by `audit:manage-retention` (independent from `audit:view`).
  - Reads and merges into `company.settings`: `{ auditLogRetentionDays, auditLogFailureAlertRecipients }`.
  - Default values when unconfigured: `retentionDays: 365`, `failureAlertRecipients: []`.
  - Validates positive integers for `retentionDays` and email formats for `failureAlertRecipients` (returns 400 on violations).
- **Scheduled Retention Cleanup Job (`purgeExpiredAuditLogs`)**:
  - `server/src/shared/scheduler/scheduledTasks.service.ts`: Registered `purgeExpiredAuditLogs()` in `runAllTasks()` alongside other periodic jobs.
  - For each company, computes `cutoff = now - retentionDays` (default 365 days).
  - Executes batched deletions in fixed chunks of 1000 IDs (`take: 1000` looping until 0 remain) to protect memory and transactions.
  - When `purgedCount > 0`, logs a single System `AuditLog` event:
    - category: `DELETION`
    - outcome: `SUCCESS`
    - action: `RETENTION_CLEANUP`
    - actorId: `null`
    - entityType: `'Company'`
    - entityId: `companyId`
    - affectedObjectName: `company.name`
    - details: `{ purgedCount, retentionDays, cutoffDate }`

---

## 2. Acceptance Criteria Verification Evidence

### 1. Simulated Audit Write Failure (Retry Once, Alert Sent, Never Throw)
- **Execution**: Simulated database failure during audit log insertion (injected connection error).
- **Results**:
  - `auditLogService.log()` returned without throwing: `result === null: true`.
  - Total database create attempts executed: `2` (initial attempt + exactly 1 retry).
  - Both attempts failed; `audit-log-failure` email dispatched.
  - Recipients resolved:
    - User with `audit:receive-failure-alerts`: `alert_officer_1790726561146@test.com`
    - Configured extra address from settings: `sec-ops@company-a.com`, `audit-lead@company-a.com`
    - Resolved list: `["alert_officer_1790726561146@test.com", "sec-ops@company-a.com", "audit-lead@company-a.com"]`
  - Template used: `audit-log-failure`
  - Technical error passed: `Database connection timeout during audit insert (attempt 2)`
  - Raw secret leaked in alert email: `false`

### 2. Alert Email Fails Twice -> Fallback to System Problem Template
- **Execution**: Simulated SMTP failure for primary `audit-log-failure` template.
- **Results**:
  - Primary alert attempts made before fallback: `2` (try 1 + retry 1).
  - Fallback emails dispatched: `1`.
  - Fallback template used: `audit-log-system-problem`.
  - No further retries attempted after fallback.

### 3. Settings Endpoints & Independent Permission Gating
- **User with `audit:view` only (lacking `audit:manage-retention`)**:
  - `GET /api/audit-logs/settings` status: `403` Forbidden
  - `PATCH /api/audit-logs/settings` status: `403` Forbidden
  - Confirms `audit:manage-retention` is independent of `audit:view`.
- **User with `audit:manage-retention`**:
  - `GET /api/audit-logs/settings` on unconfigured company: returns `200` with defaults `{ retentionDays: 365, failureAlertRecipients: [] }`.
  - `PATCH /api/audit-logs/settings` with negative `retentionDays: -10`: returns `400` Bad Request.
  - `PATCH /api/audit-logs/settings` with zero `retentionDays: 0`: returns `400` Bad Request.
  - `PATCH /api/audit-logs/settings` with invalid email: returns `400` Bad Request.
  - `PATCH /api/audit-logs/settings` with valid payload `{ retentionDays: 90, failureAlertRecipients: ["sec-ops@company-a.com", "audit-lead@company-a.com"] }`: returns `200`.
  - Subsequent `GET /api/audit-logs/settings` returns persisted values: `{ retentionDays: 90, failureAlertRecipients: ["sec-ops@company-a.com", "audit-lead@company-a.com"] }`.
  - Unrelated keys in `Company.settings` (e.g. `customBrandingEnabled: true`) remained intact and un-clobbered.

### 4. Retention Cleanup Job
- **Setup**: Company configured with `retentionDays: 1` day.
- **Seeded**: 10 expired logs (3 days old) + 5 active logs (1 hour old).
  - Count before cleanup: `15`.
- **Execution**: `scheduledTasksService.purgeExpiredAuditLogs()`.
- **Results**:
  - Expired rows remaining: `0`.
  - Active rows remaining: `5`.
  - Exactly 1 new System `AuditLog` row created:
    - category: `DELETION`
    - outcome: `SUCCESS`
    - action: `RETENTION_CLEANUP`
    - actorId: `null`
    - entityType: `'Company'`
    - entityId: `c6079d38-fe6c-4b53-a7fa-53da56ec1fe7`
    - affectedObjectName: `TestCo_A_1790726561146`
    - details: `{"cutoffDate":"2026-09-29T05:22:45.340Z", "purgedCount": 10, "retentionDays": 1}`

### 5. Batch-Safety (2,500 Expired Rows in 1,000-Row Batches)
- **Setup**: Seeded 2,500 expired rows in `audit_logs` table for Company A.
- **Execution**: `scheduledTasksService.purgeExpiredAuditLogs()`.
- **Results**:
  - Batch iterations executed: `3` (Batch 1: 1000 rows, Batch 2: 1000 rows, Batch 3: 500 rows).
  - Expired bulk rows remaining: `0`.
  - Resulting `RETENTION_CLEANUP` event `purgedCount`: `2500`.

### 6. Company Isolation
- **Setup**: Company B configured with `retentionDays: 365` days; seeded with 7 rows dated 30 days ago.
- **Execution**: `scheduledTasksService.purgeExpiredAuditLogs()`.
- **Results**:
  - Company B logs before purge: `7`.
  - Company B logs after purge: `7` (unaffected by Company A's 1-day retention purge).

---

## 3. TypeScript Compiler Output (`npx tsc --noEmit`)

Command: `npx tsc --noEmit`
Exit status: `0`

```text
```
*(Zero compilation or type errors.)*
