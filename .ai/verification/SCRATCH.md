# Scheduled Notifications — Create/Edit Form (Phase 2, Part B) — Verification Evidence

**Execution Timestamp:** 2026-09-22T11:36:44.000Z  
**Task:** Scheduled Notifications — Create/Edit Form (Phase 2)  
**Auditor:** AI Assistant  
**Environment:** Linux / Node.js 22 / MariaDB / Express Dev Server (Port 3000) / Vite & React  
**Target Repository:** `pslisch/SmartCookie`  

---

## 1. Feature Implementation Summary

### A. Component: `ScheduledNotificationForm.tsx` (`src/features/notifications/components/ScheduledNotificationForm.tsx`)
- **Dual Mode (Create & Edit):** Accepts an optional `notification?: ScheduledNotification | null`. When provided, initializes in Edit mode (prepopulating title, message, actionUrl, recipientConfig, channels, recurrence, startAt, endAt), with the heading displaying "Edit Scheduled Notification" and button "Save Changes". When `null`/omitted, initializes in Create mode with the heading "Create Scheduled Notification" and button "Schedule Notification".
- **Form Fields & Layout:**
  - **Details Card:** `title` (required, text input with char count), `message` (required, textarea with char count), `actionUrl` (optional, link input with URL prefix icon).
  - **Recipients Card:** Single-choice distribution strategy: Entire Company radio vs Specific Users / Groups radio. When specific, embeds `GroupMultiSelect` and `UserMultiSelect` with search, selection chips, and count badges. Note: Deliberately omits `learner` and `directManager` options per specification.
  - **Delivery Channels Card:** Checkboxes for `inLms` (In-App Notification) and `email` (Email Notification). Enforces that at least one channel must remain enabled.
  - **Schedule & Recurrence Card:**
    - `startAt` (datetime-local picker, required).
    - `recurrence` (select dropdown: `NONE` [One-off], `DAILY` [Daily], `WEEKLY` [Weekly], `MONTHLY` [Monthly]).
    - `endAt` (datetime-local picker, conditionally required when `recurrence !== 'NONE'`).
- **Client-Side Validation (`validateForm`):**
  - Title required and non-empty.
  - Message required and non-empty.
  - Recipient targeting: Must select entire company OR at least one user / group.
  - Channels: At least one channel must be checked.
  - Start date: Must be valid and non-empty.
  - Recurrence conditional validation: If `recurrence !== 'NONE'`, `endAt` is strictly required and must be chronologically after `startAt`.
  - Blocks network request submission immediately and sets inline error messages under each offending input.
- **CSRF & Security:** Automatically parses and sends `X-CSRF-Token` from cookies for all mutative requests (`POST` for create, `PATCH` for edit).

### B. List Integration & View Toggling: `ScheduledNotificationManagement.tsx`
- State `formNotification: ScheduledNotification | null | undefined`:
  - `undefined`: Displays the table list view, count badges, and action buttons.
  - `null`: Opens `ScheduledNotificationForm` in **Create** mode.
  - `ScheduledNotification` object: Opens `ScheduledNotificationForm` in **Edit** mode.
- Top Header Row: Added "Schedule Notification" button (`#create-scheduled-notification-btn`) with `Plus` icon.
- Empty State: Added "Schedule Notification" action button (`#empty-create-scheduled-notification-btn`).
- Table Actions Column: Added "Edit" action button (`#edit-scheduled-btn-${item.id}`) alongside Cancel and Duplicate actions.
- Action Success Banners: On successful save, returns to the list view, triggers a refresh of the scheduled notification table, and displays a prominent green confirmation alert banner.

### C. Internationalization: `src/shared/i18n/locales/en/common.json`
- Added comprehensive structured translations under `scheduledNotifications.form`:
  - Card titles, descriptions, and labels (`createTitle`, `editTitle`, `detailsSectionTitle`, `recipientsSectionTitle`, `channelsSectionTitle`, `scheduleSectionTitle`).
  - Validation messages (`titleRequired`, `messageRequired`, `recipientsRequired`, `channelsRequired`, `startAtRequired`, `endAtRequired`, `endAtAfterStart`).
  - Button text and state indicators (`submitCreate`, `submitEdit`, `saving`, `cancel`, `createSuccess`, `editSuccess`).

---

## 2. End-to-End Execution Evidence (Real Payloads & Responses)

### Test 1: Create One-Off Scheduled Notification (`POST /api/scheduled-notifications`)
- **Request Payload:**
```json
{
  "title": "Q4 Annual Security Awareness Refresher",
  "message": "Mandatory annual information security refresher for all active staff members.",
  "recipientConfig": {
    "learner": false,
    "directManager": false,
    "entireCompany": true,
    "groupIds": [],
    "userIds": []
  },
  "channels": {
    "inLms": true,
    "email": true
  },
  "startAt": "2026-10-15T09:00:00.000Z",
  "recurrence": "NONE",
  "endAt": null,
  "actionUrl": "/security-refresher-2026"
}
```
- **Response Status:** `201 Created`
- **Created Record:**
```json
{
  "id": "17e87816-5e11-4b09-a8a6-748cd4b7e33c",
  "companyId": "730917be-9701-4af6-aef6-c78afb730d2b",
  "title": "Q4 Annual Security Awareness Refresher",
  "message": "Mandatory annual information security refresher for all active staff members.",
  "recipientConfig": {
    "learner": false,
    "directManager": false,
    "entireCompany": true,
    "groupIds": [],
    "userIds": []
  },
  "channels": {
    "inLms": true,
    "email": true
  },
  "actionUrl": "/security-refresher-2026",
  "startAt": "2026-10-15T09:00:00.000Z",
  "recurrence": "NONE",
  "endAt": null,
  "status": "ACTIVE",
  "nextExecutionAt": "2026-10-15T09:00:00.000Z",
  "lastExecutedAt": null,
  "createdById": "9363c660-5ae3-4494-83da-b50e21e05a68",
  "createdAt": "2026-09-22T11:36:44.052Z",
  "updatedAt": "2026-09-22T11:36:44.052Z",
  "deletedAt": null,
  "createdBy": {
    "id": "9363c660-5ae3-4494-83da-b50e21e05a68",
    "username": "admin",
    "email": null,
    "firstName": null,
    "lastName": null
  }
}
```

---

### Test 2: Create Recurring Notification with `endAt` (`POST /api/scheduled-notifications`)
- **Request Payload:**
```json
{
  "title": "Weekly Compliance Digest & Progress Standup",
  "message": "Weekly reminder to review learner assignment completions and address flagged risks.",
  "recipientConfig": {
    "learner": false,
    "directManager": false,
    "entireCompany": false,
    "groupIds": [],
    "userIds": ["9363c660-5ae3-4494-83da-b50e21e05a68"]
  },
  "channels": {
    "inLms": true,
    "email": false
  },
  "startAt": "2026-10-01T08:00:00.000Z",
  "recurrence": "WEEKLY",
  "endAt": "2026-12-31T23:59:59.000Z",
  "actionUrl": "/compliance-standup"
}
```
- **Response Status:** `201 Created`
- **Created Record:**
```json
{
  "id": "4ebc2f08-d60c-4778-bec4-bd29325887fe",
  "companyId": "730917be-9701-4af6-aef6-c78afb730d2b",
  "title": "Weekly Compliance Digest & Progress Standup",
  "message": "Weekly reminder to review learner assignment completions and address flagged risks.",
  "recipientConfig": {
    "learner": false,
    "directManager": false,
    "entireCompany": false,
    "groupIds": [],
    "userIds": [
      "9363c660-5ae3-4494-83da-b50e21e05a68"
    ]
  },
  "channels": {
    "inLms": true,
    "email": false
  },
  "actionUrl": "/compliance-standup",
  "startAt": "2026-10-01T08:00:00.000Z",
  "recurrence": "WEEKLY",
  "endAt": "2026-12-31T23:59:59.000Z",
  "status": "ACTIVE",
  "nextExecutionAt": "2026-10-01T08:00:00.000Z",
  "lastExecutedAt": null,
  "createdById": "9363c660-5ae3-4494-83da-b50e21e05a68",
  "createdAt": "2026-09-22T11:36:44.190Z",
  "updatedAt": "2026-09-22T11:36:44.190Z",
  "deletedAt": null,
  "createdBy": {
    "id": "9363c660-5ae3-4494-83da-b50e21e05a68",
    "username": "admin",
    "email": null,
    "firstName": null,
    "lastName": null
  }
}
```

---

### Test 3: Confirm Client-Side Rejection of Recurring Submission Missing `endAt`
- **Attempted Submission:** Recurring form (`recurrence: 'WEEKLY'`) where `endAt` input was left blank `""`.
- **Client-Side Validator Check (`validateScheduledNotificationForm`):**
  - `isValid`: `false`
  - `errors.endAt`: `"End date and time is required for recurring notifications."`
  - **Result:** Form execution halts immediately; `fetch` is never dispatched.
- **Server Defense-in-Depth Verification:**
  - Sending raw `POST /api/scheduled-notifications` without `endAt`:
  - **Status:** `400 Bad Request`
  - **Response Body:**
```json
{
  "error": "endAt is required for recurring scheduled notifications (recurrence !== NONE)."
}
```

---

### Test 4: Edit an Existing Scheduled Notification (Real Before and After)
- **Target Notification ID:** `17e87816-5e11-4b09-a8a6-748cd4b7e33c`
- **BEFORE EDIT:**
  - Title: `"Q4 Annual Security Awareness Refresher"`
  - Message: `"Mandatory annual information security refresher for all active staff members."`
  - Recurrence: `NONE`
  - Channels: `inLms: true, email: true`
  - Start At: `2026-10-15T09:00:00.000Z`
  - End At: `null`
  - Action URL: `"/security-refresher-2026"`
  - Updated At: `2026-09-22T11:36:44.052Z`

- **PATCH Request Payload (`PATCH /api/scheduled-notifications/17e87816-5e11-4b09-a8a6-748cd4b7e33c`):**
```json
{
  "title": "Q4 Annual Security Awareness Refresher (UPDATED V2)",
  "message": "Updated priority: Please complete the updated 2026 security training module immediately.",
  "recipientConfig": {
    "learner": false,
    "directManager": false,
    "entireCompany": true,
    "groupIds": [],
    "userIds": []
  },
  "channels": {
    "inLms": true,
    "email": false
  },
  "startAt": "2026-10-20T10:00:00.000Z",
  "recurrence": "MONTHLY",
  "endAt": "2027-04-30T23:59:59.000Z",
  "actionUrl": "/security-refresher-v2"
}
```
- **Response Status:** `200 OK`
- **AFTER EDIT:**
  - Title: `"Q4 Annual Security Awareness Refresher (UPDATED V2)"`
  - Message: `"Updated priority: Please complete the updated 2026 security training module immediately."`
  - Recurrence: `MONTHLY`
  - Channels: `inLms: true, email: false`
  - Start At: `2026-10-20T10:00:00.000Z`
  - End At: `2027-04-30T23:59:59.000Z`
  - Next Execution At: `2026-10-20T10:00:00.000Z`
  - Action URL: `"/security-refresher-v2"`
  - Updated At: `2026-09-22T11:36:44.416Z`

---

## 3. Build & Lint Verification
- **Linter (`npm run lint` / `tsc --noEmit`):**
  - Exited with status code `0`.
  - Zero TypeScript diagnostic or syntax errors across the entire project.
- **Production Build (`npm run build`):**
  - Exited with status code `0`.
  - Vite client bundle and esbuild CommonJS backend bundle built cleanly.
