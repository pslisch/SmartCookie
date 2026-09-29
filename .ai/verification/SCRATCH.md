# Authentication Failure Aggregation, Lockout, and Password-Change Audit Verification

## 1. Overview & Architecture
- **Auth Failure Aggregation Service (`server/src/shared/audit/authFailureAggregation.service.ts`)**:
  - Implemented `recordAuthFailure` and `resolveOpenFailures`.
  - **3-Strikes Failure Aggregation**: For identifiable users, failures 1 and 2 are tracked in an in-memory counter (`preFailureCounters`) per `(companyId, actorId, action)`. No AuditLog row is created for the 1st or 2nd failure.
  - On the 3rd failure, an AuditLog row is created with `authFailureCount: 3`, `category: AUTHENTICATION_SECURITY`, `outcome: FAILURE`.
  - On the 4th+ failure, the existing open row (`resolvedAt IS NULL`) is updated with `authFailureCount += 1`. Its ID and initial `createdAt` timestamp remain constant.
  - **Unresolvable Identifiers**: Failures against nonexistent users or invalid tokens (actorId `null`) do not aggregate and create immediate individual rows with `actorId: null` and `details.attemptedIdentifier`.
  - **Resolution on Session Issuance**: Successful login (direct non-MFA) and successful MFA verification resolve all currently open `AUTHENTICATION_SECURITY/FAILURE` events for that actor (`outcome: RESOLVED`, `resolvedAt: now`), retaining the historical `authFailureCount`.
- **Lockout Auditing (`server/src/shared/middleware/rateLimit.middleware.ts`)**:
  - At the point of returning HTTP 429 in `LoginRateLimiter.middleware`, an internal indexed lookup resolves the username/email to a real User.
  - If a real user is resolved, exactly ONE `ACCOUNT_LOCKOUT` audit event is logged with `category: AUTHENTICATION_SECURITY`, `outcome: FAILURE`, `actorId: user.id`, `details: { attemptThreshold: 5, windowMinutes: 15 }`.
  - Unresolvable / IP-only identifiers hitting 429 are blocked without creating an audit log.
- **Password Change Auditing (`server/src/features/auth/routes/auth.routes.ts`)**:
  - On successful `POST /api/auth/change-password`, logs a plain `SUCCESS` event with `action: 'PASSWORD_CHANGE'`. No `changes` or `details` containing plaintext or hashed passwords are recorded.

---

## 2. Acceptance Criteria Verification Evidence

### 1. 1st and 2nd Failed Logins (Zero Audit Rows)
- Executed 2 failed login attempts with invalid passwords for user `faillogin_1790672348512`.
  - Attempt 1 Status: `401`
  - Attempt 2 Status: `401`
  - Database Query for `action: 'LOGIN_FAILURE'` and `actorId: testUser.id`:
    - **Total rows found**: `0`

### 2. 3rd Failed Login (Initial Aggregated Row)
- Executed 3rd failed login attempt:
  - Attempt 3 Status: `401`
  - **AuditLog rows count**: `1`
  - Row ID: `fbc235cb-b6aa-4db3-ae4a-ee83ea1bfbfe`
  - `authFailureCount`: `3`
  - `outcome`: `FAILURE`
  - `resolvedAt`: `null`

### 3. 4th and 5th Failed Logins (Same Row Updated, Counter Progressing)
- Executed 4th and 5th failed login attempts:
  - After 4th attempt:
    - Same row ID preserved (`fbc235cb-b6aa-4db3-ae4a-ee83ea1bfbfe`): `true`
    - `authFailureCount`: `4`
  - After 5th attempt:
    - Same row ID preserved (`fbc235cb-b6aa-4db3-ae4a-ee83ea1bfbfe`): `true`
    - `authFailureCount`: `5`
    - `createdAt` unchanged: `true`

### 4. Successful Login After Failures (Outcome RESOLVED, History Retained)
- Executed successful login with correct password:
  - Login Status: `200`
  - Verified row `fbc235cb-b6aa-4db3-ae4a-ee83ea1bfbfe`:
    - `outcome`: `RESOLVED`
    - `resolvedAt`: `2026-09-29T09:39:13.916Z`
    - Retained `authFailureCount`: `5` (retained, not reset to 0 or null)

### 5. Nonexistent User Logins (Separate Individual Rows, actorId: null)
- Executed 3 failed login attempts using nonexistent username `unknown_actor_1790672351234`:
  - Resulting AuditLog rows: `3` separate individual rows
  - Each row has `actorId`: `null`
  - Each row has `details.attemptedIdentifier`: `'unknown_actor_1790672351234'`
  - Each row has a unique UUID (no aggregation counter used): `true`

### 6. Independent MFA Failure Aggregation
- User with MFA enabled failed login 3 times &rarr; open `LOGIN_FAILURE` event created (`authFailureCount: 3`, `resolvedAt: null`).
- User authenticated password successfully &rarr; `mfaRequired: true`, challenge token issued.
  - Verified `LOGIN_FAILURE` row remained open (`resolvedAt: null`).
- User failed MFA verification 3 times via `POST /api/auth/mfa/verify`:
  - A separate `MFA_FAILURE` row was created with `authFailureCount: 3`, `outcome: FAILURE`.
  - The original `LOGIN_FAILURE` row was untouched and remained open.

### 7. MFA Success Resolves Both Series
- User provided valid recovery code to `POST /api/auth/mfa/verify`:
  - Status: `200`
  - Both rows verified in database:
    - `LOGIN_FAILURE` row: `outcome: RESOLVED`, `resolvedAt: not null`
    - `MFA_FAILURE` row: `outcome: RESOLVED`, `resolvedAt: not null`

### 8. Password Reset Failures
- **Unresolved User**: Submitted invalid token `completely-invalid-token-12345` to `POST /api/auth/reset-password`:
  - Status: `400`
  - Audit row created with `action: 'PASSWORD_RESET_FAILURE'`, `actorId: null`.
  - `details` contains `{ failureReason: 'INVALID_OR_EXPIRED_TOKEN' }` (raw token omitted).
- **Known User Policy Violation**: Valid token consumed, but new password violated length policy ("short") 3 times:
  - 3rd attempt created an aggregated row with `action: 'PASSWORD_RESET_FAILURE'`, `actorId: testUser.id`, `authFailureCount: 3`.

### 9. Rate-Limiter Lockout (`ACCOUNT_LOCKOUT`)
- **Real User**: Submitted 5 failed attempts, triggering HTTP 429 on 6th and 7th requests:
  - Status: `429`
  - Exactly `1` row created in AuditLog for `action: 'ACCOUNT_LOCKOUT'` with `actorId: testUser.id`.
  - `details`: `{"attemptThreshold":5,"windowMinutes":15}`.
  - Subsequent 429 request did not duplicate the lockout audit log.
- **Nonsense User**: Submitted 5 failed attempts with nonsense username, triggering HTTP 429:
  - Status: `429`
  - AuditLog rows created for nonsense user: `0` (unaudited per locked decision).

### 10. Password Change Success (No Password Leaks)
- Authenticated user executed `POST /api/auth/change-password`:
  - Status: `200`
  - Exactly `1` row created with `action: 'PASSWORD_CHANGE'`, `outcome: 'SUCCESS'`.
  - `changes`: `null`
  - `details`: `null`
  - String search of raw database row for plaintext current and new password values: `false` (no credentials present).

---

## 3. TypeScript Compiler Output (`npx tsc --noEmit`)

Execution command: `npx tsc --noEmit`
Exit status: `0`

```text
```
*(Zero compilation or type errors.)*
