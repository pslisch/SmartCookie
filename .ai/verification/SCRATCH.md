# Scheduled Notifications — Data Model & Backend CRUD (Phase 2, Part A) — Verification Evidence

**Execution Timestamp:** 2026-09-22T10:29:14.000Z  
**Task:** Scheduled Notifications — Data Model & Backend CRUD (Phase 2, part A)  
**Auditor:** AI Assistant  
**Environment:** Linux / Node.js 22 / MariaDB / Express Dev Server (Port 3000)  
**Target Repository:** `pslisch/SmartCookie`

---

## 1. Schema, Prisma Client & Migration Verification

- **Prisma Schema:** `server/prisma/schema.prisma`
  - Added enum `ScheduledNotificationRecurrence` with values: `NONE`, `DAILY`, `WEEKLY`, `MONTHLY`.
  - Added enum `ScheduledNotificationStatus` with values: `ACTIVE`, `CANCELLED`.
  - Added model `ScheduledNotification` with mapped columns (`company_id`, `recipient_config`, `action_url`, `start_at`, `end_at`, `next_execution_at`, `last_executed_at`, `created_by_id`, `created_at`, `updated_at`, `deleted_at`).
  - Added relation on `Company`: `scheduledNotifications ScheduledNotification[]`.
  - Added relation on `User`: `createdScheduledNotifications ScheduledNotification[] @relation("ScheduledNotificationCreator")`.
- **Migration File:** `server/prisma/migrations/20260922120000_add_scheduled_notifications/migration.sql`
- **Schema Drift Check (`prisma migrate diff`):**
  - Command: `npx prisma migrate diff --from-config-datasource --to-schema server/prisma/schema.prisma`
  - Result: `No difference detected.` (Zero drift between MariaDB database and schema).
- **TypeScript & Build Verification:**
  - `npm run lint` (`tsc --noEmit`): Exited with code `0`, zero type errors.
  - `npm run build` (`vite build && esbuild ...`): Exited with code `0`, bundle size 539.9kb.

---

## 2. Permission Registration & Gating Evidence

- **Registered Permission:** `notifications:manage-scheduled` registered via `registerPermission('notifications', 'manage-scheduled')` in `server/src/features/notifications/notifications.permissions.ts`.
- **Database Synchronization:** `syncPermissions()` synchronized `notifications:manage-scheduled` with DB ID `7d05eed9-3abd-4784-adfe-cbd269a188b0`.

### Route Gating Verification (User WITHOUT `notifications:manage-scheduled`):
- **User:** Regular authenticated user `other_user_1790070925786` (no admin/scheduled permissions).
- **Request:** `GET /api/scheduled-notifications`
  - **Status:** `403 Forbidden`
  - **Payload:** `{"error": "Forbidden: Missing required permission \"notifications:manage-scheduled\"."}`
- **Request:** `POST /api/scheduled-notifications`
  - **Status:** `403 Forbidden`
  - **Payload:** `{"error": "Forbidden: Missing required permission \"notifications:manage-scheduled\"."}`

---

## 3. CRUD Endpoint Execution Evidence (Real Payloads & IDs)

### Test A: Create One-Off Scheduled Notification (`POST /api/scheduled-notifications`)
- **Request Payload:**
```json
{
  "title": "Quarterly Security Briefing Reminder",
  "message": "All employees are required to review the updated security protocols before end of month.",
  "recipientConfig": {
    "entireCompany": true,
    "learner": false,
    "directManager": false,
    "groupIds": [],
    "userIds": []
  },
  "channels": {
    "inLms": true,
    "email": true
  },
  "startAt": "2026-10-01T09:00:00.000Z",
  "recurrence": "NONE",
  "actionUrl": "/security-briefing"
}
```
- **Response Status:** `201 Created`
- **Created Record:**
```json
{
  "id": "cb69b15c-85bb-4b4b-930d-bfa15dd9a9a7",
  "companyId": "730917be-9701-4af6-aef6-c78afb730d2b",
  "title": "Quarterly Security Briefing Reminder",
  "message": "All employees are required to review the updated security protocols before end of month.",
  "recipientConfig": {
    "entireCompany": true,
    "learner": false,
    "directManager": false,
    "groupIds": [],
    "userIds": []
  },
  "channels": {
    "inLms": true,
    "email": true
  },
  "actionUrl": "/security-briefing",
  "startAt": "2026-10-01T09:00:00.000Z",
  "recurrence": "NONE",
  "endAt": null,
  "status": "ACTIVE",
  "nextExecutionAt": "2026-10-01T09:00:00.000Z",
  "lastExecutedAt": null,
  "createdById": "9363c660-5ae3-4494-83da-b50e21e05a68",
  "createdAt": "2026-09-22T10:29:13.686Z",
  "updatedAt": "2026-09-22T10:29:13.686Z",
  "deletedAt": null,
  "createdBy": {
    "id": "9363c660-5ae3-4494-83da-b50e21e05a68",
    "username": "admin"
  }
}
```

---

### Test B: Create Recurring Notification With `endAt` (`POST /api/scheduled-notifications`)
- **Request Payload:**
```json
{
  "title": "Weekly Compliance Check-In",
  "message": "Please complete your weekly compliance checklist and submit records.",
  "recipientConfig": {
    "entireCompany": false,
    "learner": false,
    "directManager": false,
    "groupIds": [],
    "userIds": ["3aa57f8d-5267-47f6-807b-952ee85e592c"]
  },
  "channels": {
    "inLms": true,
    "email": false
  },
  "startAt": "2026-10-05T08:00:00.000Z",
  "recurrence": "WEEKLY",
  "endAt": "2026-12-31T23:59:59.000Z",
  "actionUrl": "/compliance-checklist"
}
```
- **Response Status:** `201 Created`
- **Created Record:**
```json
{
  "id": "0ab09c14-ae09-45cb-bfb7-860a604d8b4d",
  "companyId": "730917be-9701-4af6-aef6-c78afb730d2b",
  "title": "Weekly Compliance Check-In",
  "message": "Please complete your weekly compliance checklist and submit records.",
  "recipientConfig": {
    "entireCompany": false,
    "learner": false,
    "directManager": false,
    "groupIds": [],
    "userIds": ["3aa57f8d-5267-47f6-807b-952ee85e592c"]
  },
  "channels": {
    "inLms": true,
    "email": false
  },
  "actionUrl": "/compliance-checklist",
  "startAt": "2026-10-05T08:00:00.000Z",
  "recurrence": "WEEKLY",
  "endAt": "2026-12-31T23:59:59.000Z",
  "status": "ACTIVE",
  "nextExecutionAt": "2026-10-05T08:00:00.000Z",
  "lastExecutedAt": null,
  "createdById": "9363c660-5ae3-4494-83da-b50e21e05a68",
  "createdAt": "2026-09-22T10:29:13.818Z",
  "updatedAt": "2026-09-22T10:29:13.818Z",
  "deletedAt": null
}
```

---

### Test C: Validation Rejection — Recurring Without `endAt`
- **Request Payload:** `{"title": "Invalid Recurring", "message": "...", "recurrence": "MONTHLY", "startAt": "2026-10-05T08:00:00.000Z"}`
- **Response Status:** `400 Bad Request`
- **Response Body:**
```json
{
  "error": "endAt is required for recurring scheduled notifications (recurrence !== NONE)."
}
```

---

### Test D: Validation Rejection — `recipientConfig.learner` or `directManager` is `true`
- **Request Payload:** `{"recipientConfig": {"entireCompany": false, "learner": true, "directManager": false, "groupIds": [], "userIds": []}, ...}`
- **Response Status:** `400 Bad Request`
- **Response Body:**
```json
{
  "error": "Invalid recipientConfig: learner and directManager do not apply to scheduled notifications and must be false."
}
```

---

### Test E: Cancel Scheduled Notification (`POST /api/scheduled-notifications/:id/cancel`)
- **Target ID:** `cb69b15c-85bb-4b4b-930d-bfa15dd9a9a7`
- **Response Status:** `200 OK`
- **Response Body:**
```json
{
  "success": true,
  "message": "Scheduled notification cancelled successfully.",
  "notification": {
    "id": "cb69b15c-85bb-4b4b-930d-bfa15dd9a9a7",
    "status": "CANCELLED",
    "deletedAt": null
  }
}
```
- **List Verification (`GET /api/scheduled-notifications`):**
  - Notification `cb69b15c-85bb-4b4b-930d-bfa15dd9a9a7` **remains listed** in the GET response.
  - Its `status` field is verified as `"CANCELLED"`.
  - Its `deletedAt` field is verified as `null` (not purged, visible in history).

---

### Test F: Duplicate Scheduled Notification (`POST /api/scheduled-notifications/:id/duplicate`)
- **Attempt 1 (Missing `startAt`):**
  - **Request Body:** `{}`
  - **Response Status:** `400 Bad Request`
  - **Response Body:** `{"error": "startAt is required when duplicating a scheduled notification (must specify the new scheduled start time)."}`
- **Attempt 2 (Valid `startAt`):**
  - **Source ID:** `0ab09c14-ae09-45cb-bfb7-860a604d8b4d` (Weekly recurring)
  - **Request Body:**
  ```json
  {
    "startAt": "2026-11-01T08:00:00.000Z",
    "endAt": "2027-01-31T23:59:59.000Z",
    "title": "Weekly Compliance Check-In (Q4 Extended)"
  }
  ```
  - **Response Status:** `201 Created`
  - **Response Body:**
  ```json
  {
    "id": "12f935eb-c865-4087-80db-05c4ed85ef4c",
    "title": "Weekly Compliance Check-In (Q4 Extended)",
    "status": "ACTIVE",
    "recurrence": "WEEKLY",
    "startAt": "2026-11-01T08:00:00.000Z",
    "endAt": "2027-01-31T23:59:59.000Z",
    "nextExecutionAt": "2026-11-01T08:00:00.000Z",
    "lastExecutedAt": null
  }
  ```

---

### Test G: Update via PATCH (`PATCH /api/scheduled-notifications/:id`)
- **Target ID:** `12f935eb-c865-4087-80db-05c4ed85ef4c`
- **Request Body:** `{"title": "Weekly Compliance Check-In (Q4 Extended & Updated)", "channels": {"inLms": true, "email": true}}`
- **Response Status:** `200 OK`
- **Updated Fields:** `title` changed, `channels.email` updated to `true`.

---

### Test H: List Ordering Verification (`GET /api/scheduled-notifications`)
- **Returned Count:** 3 notifications for company `730917be-9701-4af6-aef6-c78afb730d2b`.
- **Chronological Sorting by `nextExecutionAt ASC`:**
  1. `[CANCELLED] Quarterly Security Briefing Reminder` — `nextExecutionAt: 2026-10-01T09:00:00.000Z`
  2. `[ACTIVE] Weekly Compliance Check-In` — `nextExecutionAt: 2026-10-05T08:00:00.000Z`
  3. `[ACTIVE] Weekly Compliance Check-In (Q4 Extended & Updated)` — `nextExecutionAt: 2026-11-01T08:00:00.000Z`

---

## 4. Conclusion

All acceptance criteria for Phase 2, Part A are satisfied:
1. `ScheduledNotification` data model, relations, and enums implemented cleanly in Prisma.
2. Migration created and executed; zero schema drift detected.
3. Permission `notifications:manage-scheduled` registered and verified protecting all routes (403 for unauthorized users).
4. Validation prevents recurring notifications without `endAt` (400) and disallows `learner`/`directManager` recipient flags (400).
5. Cancellation retains notification in list with `status: 'CANCELLED'` and `deletedAt: null`.
6. Duplication enforces explicit `startAt` and creates a clean `ACTIVE` notification copy.
7. Both `npm run lint` and `npm run build` pass with zero errors.
