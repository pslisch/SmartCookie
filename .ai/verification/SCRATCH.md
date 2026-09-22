# Scheduled Notifications — Firing Logic (Phase 2, Part B) — Verification Evidence

**Execution Timestamp:** 2026-09-22T10:43:21.000Z  
**Task:** Scheduled Notifications — Firing Logic (Phase 2, part B)  
**Auditor:** AI Assistant  
**Environment:** Linux / Node.js 22 / MariaDB / Express Dev Server (Port 3000)  
**Target Repository:** `pslisch/SmartCookie`

---

## 1. Architecture & Design Verification

- **Direct Non-Rule Firing Engine**: `server/src/features/notifications/services/scheduledNotificationFiring.service.ts`
  - Mirrors the direct delivery failure notification architecture pattern (`ruleId: null`).
  - Implements application-level idempotency via checking `NotificationInstance` with `sourceEventType: 'SCHEDULED_NOTIFICATION'` and `sourceEventId: '${row.id}:${row.nextExecutionAt.toISOString()}'`.
  - Recipient resolution reuses `resolveRecipients` with `recipientConfig` (`entireCompany`, `groupIds`, `userIds`).
  - Direct delivery generation: `IN_LMS` channel created as `SENT` immediately (`sentAt = now`); `EMAIL` channel created as `PENDING` (`sentAt = null`), picked up by existing `processPendingEmailDeliveries()`.
  - Bypasses per-type `NotificationPreference` checks per ADR-0019 architectural decision.
  - Wraps individual row executions in try/catch to ensure errors on one row do not abort the scheduler batch.
- **Scheduler Integration**: `server/src/shared/scheduler/scheduledTasks.service.ts`
  - Registered `await processScheduledNotifications()` in `runAllTasks()` directly before `await processPendingEmailDeliveries()`.
- **Termination Without Schema Mutation**:
  - One-off rows (`recurrence: NONE`) are selected only when `lastExecutedAt IS NULL`. Upon first execution, `lastExecutedAt` is set to `now`, leaving `nextExecutionAt` unchanged, which naturally stops subsequent selection.
  - Recurring rows (`recurrence !== NONE`) are selected only when `nextExecutionAt <= endAt`. Advancing `nextExecutionAt` past `endAt` naturally terminates selection while preserving `status: ACTIVE` without requiring any schema changes or stored "expired" enum values.
- **Build & Typecheck Results**:
  - `npm run lint` (`tsc --noEmit`): Exited with code `0`, zero type errors.
  - `npm run build` (`vite build && esbuild ...`): Exited with code `0`, server bundle `545.5kb`.

---

## 2. Unit Test Verification — `computeNextExecution`

- **Base Timestamp:** `2026-10-01T10:00:00.000Z`
- **Results:**
  - `DAILY`: `2026-10-02T10:00:00.000Z` (Difference: exactly +1 day / +24 hours)
  - `WEEKLY`: `2026-10-08T10:00:00.000Z` (Difference: exactly +7 days / +168 hours)
  - `MONTHLY`: `2026-11-01T10:00:00.000Z` (Difference: +1 calendar month using plain Date arithmetic)
  - `NONE`: `2026-10-01T10:00:00.000Z` (Difference: 0 days, unchanged)

---

## 3. End-to-End Database Execution Evidence

### Test Case 1: One-Off Scheduled Notification (`recurrence: NONE`)
- **Row Created:**
  - **ID:** `a49a3b6f-0bf7-4dc4-9109-ee6426ba4f37`
  - **Title:** `"Verification One-Off Alert"`
  - **Channels:** `{"inLms": true, "email": true}`
  - **Initial `startAt` / `nextExecutionAt`:** `2026-09-22T09:43:20.514Z` (due in past)
  - **Recipients Target:** 2 active company users (`3aa57f8d-5267-47f6-807b-952ee85e592c`, `9363c660-5ae3-4494-83da-b50e21e05a68`)
- **Poller Run 1 (Execution):**
  - **Instance Created:** `id: 65b02d1a-2708-499f-9c11-534bcddb0514`
  - **Source Event:** `sourceEventType: 'SCHEDULED_NOTIFICATION'`, `sourceEventId: 'a49a3b6f-0bf7-4dc4-9109-ee6426ba4f37:2026-09-22T09:43:20.514Z'`
  - **Recipients Created:** 2 rows
  - **Deliveries Created per Recipient:**
    - `IN_LMS`: `status: SENT`, `sentAt: 2026-09-22T10:43:20.591Z`
    - `EMAIL`: `status: PENDING`, `sentAt: null`
  - **Row Mutation:** `lastExecutedAt` set to `2026-09-22T10:43:20.591Z`; `nextExecutionAt` left untouched (`2026-09-22T09:43:20.514Z`).
- **Poller Run 2 (Termination & Idempotency Check):**
  - **Instances Found for Row:** `1` (zero duplicates created).
  - **Row `lastExecutedAt`:** Verified identical (`2026-09-22T10:43:20.591Z`, not updated again).
  - **Confirmed:** One-off row fired exactly once and naturally was never selected on subsequent runs.

---

### Test Case 2: Weekly Recurring Scheduled Notification (`recurrence: WEEKLY`)
- **Row Created:**
  - **ID:** `f04a844c-7800-48ff-a6f3-27a353649fc0`
  - **Title:** `"Verification Weekly Report"`
  - **Channels:** `{"inLms": true, "email": false}`
  - **Recurrence:** `WEEKLY`
  - **Original `nextExecutionAt`:** `2026-09-22T08:43:20.993Z`
  - **`endAt`:** `2026-10-22T10:43:20.993Z` (+30 days)
- **Poller Run 1 (Execution):**
  - **Instance Created:** `id: fe7fdfaa-37f0-493a-838e-705d3bc7fdc8`
  - **Row Mutation:**
    - `lastExecutedAt`: Updated to `2026-09-22T10:43:21.046Z`.
    - `nextExecutionAt`: Advanced from `2026-09-22T08:43:20.993Z` to **`2026-09-29T08:43:20.993Z`**.
    - **Difference:** Advanced by **exactly 7 days** (`7 * 24 * 3600 * 1000` ms).
- **Poller Run 2 (Subsequent Poller Check):**
  - **Instances Found for Row:** `1` (zero duplicate instances created).
  - **Confirmed:** Advanced `nextExecutionAt` is in the future (~7 days ahead), so it is not eligible again until that new timestamp arrives.

---

### Test Case 3: Recurring Notification Reaching Expiration (`nextExecutionAt > endAt`)
- **Row Created:**
  - **ID:** `9d5b3765-3a56-4c66-ba03-1f8dd5a51632`
  - **Title:** `"Expiring Weekly Notification"`
  - **Initial `nextExecutionAt`:** `2026-09-22T09:43:21.335Z` (past, eligible)
  - **`endAt`:** `2026-09-24T10:43:21.335Z` (+2 days in future)
  - **Recurrence:** `WEEKLY`
- **Poller Run 1 (Final Eligible Execution):**
  - At execution time, `nextExecutionAt <= endAt` (`2026-09-22 <= 2026-09-24`), so it is eligible.
  - **Instance Created:** `id: 0395d050-2bf2-4dc4-8905-4e4e0034fe14`
  - **Row Mutation:**
    - `lastExecutedAt`: Updated to `2026-09-22T10:43:21.335Z`.
    - `nextExecutionAt`: Advanced by 7 days to `2026-09-29T09:43:21.335Z`.
    - **Comparison:** `nextExecutionAt` (`2026-09-29`) is now **greater than** `endAt` (`2026-09-24`).
    - **Status:** Remains `ACTIVE` (no "expired" status required in schema).
- **Poller Run 2 (Natural Exclusion Check):**
  - **Instances Found for Row:** `1` (not selected; zero new instances).
  - **Confirmed:** The row naturally stopped being selected because `nextExecutionAt > endAt`.

---

### Test Case 4: Cancelled Notification (`status: CANCELLED`)
- **Row Created:**
  - **ID:** `8ba66eeb-46c1-4bd6-bd2e-bc0b14286357`
  - **`status`:** `CANCELLED`
  - **`nextExecutionAt`:** `2026-09-22T09:43:20.514Z` (due in past)
- **Poller Run Results:**
  - **Instances Created:** `0`
  - **`lastExecutedAt`:** `null`
  - **Confirmed:** Cancelled rows are never selected regardless of `nextExecutionAt`.

---

### Test Case 5: Zero Resolved Recipients
- **Row Created:**
  - **ID:** `b935ce0a-27a0-4bad-a16d-ba05ca23a031`
  - **`recipientConfig`:** Single non-existent user ID (`non-existent-user-uuid-000000000000`).
  - **`nextExecutionAt`:** `2026-09-22T09:43:20.514Z`
- **Poller Run Results:**
  - **Instance Creation:** Skipped (`0` instances created).
  - **Row Mutation:** `lastExecutedAt` was successfully updated to `2026-09-22T10:43:21.797Z`.
  - **Confirmed:** Does not create empty notification instances and advances execution pointers cleanly without stalling subsequent runs.

---

## 4. Conclusion

All acceptance criteria for Phase 2, Part B are satisfied:
1. `ScheduledNotificationFiringService` created and fully integrated with `scheduledTasks.service.ts`.
2. One-off scheduled notifications fire once and terminate cleanly via `lastExecutedAt IS NULL` check.
3. Weekly recurring notifications fire and advance `nextExecutionAt` by exactly 7 days.
4. Recurring notifications nearing expiration fire their final eligible run, then naturally cease firing once `nextExecutionAt > endAt`.
5. Cancelled rows are never selected.
6. Execution is idempotent and safe against reprocessing.
7. Rows with zero resolved recipients advance execution pointers without stalling.
8. Full build (`npm run build`) and lint (`tsc --noEmit`) pass with zero errors.
