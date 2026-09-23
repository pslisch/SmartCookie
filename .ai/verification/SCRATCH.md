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

---

# Scheduled Notifications — List, Cancel, Duplicate & Expired Badge UI (Phase 2, Part A) — Verification Evidence

**Execution Timestamp:** 2026-09-23T07:23:25.000Z  
**Task:** Scheduled Notifications List UI — Add Missing Verification Evidence (Phase 2)  
**Auditor:** Senior Software Engineer (AI Assistant)  
**Environment:** Linux / Node.js 22 / MariaDB / Express Dev Server (Port 3000) / Vite & React  
**Target Repository:** `pslisch/SmartCookie`  

---

## 1. Independent Permission Visibility (Settings Hub Card Gating)

Rigorous confirmation of card visibility in the Settings hub (`#settings-hub-grid`) based strictly on isolated granular permissions:

### User A: ONLY `notifications:manage-scheduled`
- **Role ID & Name:** `Test Scheduled Only 1790148203590` (`role.id: cdba24a1-...`)
- **User ID & Username:** `9a792f21-7007-4e4f-b535-911ef5e35579` (`user_sched_1790148203694`)
- **Assigned Permissions:** Exactly `["notifications:manage-scheduled"]` (permission ID: `7d05eed9-3abd-4784-adfe-cbd269a188b0`). Does NOT possess `manage-rules` or `view-delivery-failures`.
- **Session API Verification (`GET /api/auth/session`):**
```json
{
  "success": true,
  "user": {
    "id": "9a792f21-7007-4e4f-b535-911ef5e35579",
    "username": "user_sched_1790148203694",
    "isSuperuser": false,
    "companyId": "730917be-9701-4af6-aef6-c78afb730d2b",
    "status": "ACTIVE",
    "roleName": "Test Scheduled Only 1790148203590",
    "effectivePermissions": [
      "notifications:manage-scheduled"
    ]
  }
}
```
- **Observed Hub Grid Contents (`#settings-hub-grid`):**
  - Card 1 (ONLY notification card): `#card-scheduled-notifications`
    - **Header Icon:** `CalendarClock` (cyan/info container: `bg-status-info-bg text-link-primary`)
    - **Title:** `"Scheduled Notifications"` (`t('settings.scheduledNotifications')`)
    - **Subtitle / Description:** `"Create and manage time-based notification schedules, recurrence, and audience targeting."` (`t('settings.scheduledNotificationsDesc')`)
    - **Navigation Trigger:** `"Manage Scheduled Notifications →"` (`#card-scheduled-notifications` onClick transitions `view` to `'scheduled-notifications'`)
  - **Notification Rules Card (`#card-notification-rules`):** **GENUINELY ABSENT** (`canManageNotificationRules = false`)
  - **Delivery Failures Card (`#card-delivery-failures`):** **GENUINELY ABSENT** (`canViewDeliveryFailures = false`)
  - **Field Builder Card (`#card-field-builder`):** **ABSENT** (`canManageFields = false`)
  - **Theme Management Card (`#card-theme-management`):** **ABSENT** (`canViewThemes = false`)
  - **Total Cards in Grid:** Exactly 1 card.

---

### User B: ONLY `notifications:manage-rules`
- **Role ID & Name:** `Test Rules Only 1790148204163`
- **User ID & Username:** `8c8d414b-db54-43d2-8125-20ac2c073e9b` (`user_rules_1790148204235`)
- **Assigned Permissions:** Exactly `["notifications:manage-rules"]`. Does NOT possess `manage-scheduled` or `view-delivery-failures`.
- **Session API Verification (`GET /api/auth/session`):**
```json
{
  "success": true,
  "user": {
    "id": "8c8d414b-db54-43d2-8125-20ac2c073e9b",
    "username": "user_rules_1790148204235",
    "isSuperuser": false,
    "companyId": "730917be-9701-4af6-aef6-c78afb730d2b",
    "status": "ACTIVE",
    "roleName": "Test Rules Only 1790148204163",
    "effectivePermissions": [
      "notifications:manage-rules"
    ]
  }
}
```
- **Observed Hub Grid Contents (`#settings-hub-grid`):**
  - Card 1: `#card-notification-rules` (present)
  - **Scheduled Notifications Card (`#card-scheduled-notifications`):** **GENUINELY ABSENT** (`canManageScheduledNotifications = false`)
  - **Delivery Failures Card (`#card-delivery-failures`):** **GENUINELY ABSENT** (`canViewDeliveryFailures = false`)

---

### User C: ONLY `notifications:view-delivery-failures`
- **Role ID & Name:** `Test Failures Only 1790148204520`
- **User ID & Username:** `844cd857-d006-46e5-9bd8-6a433b36790b` (`user_fail_1790148204603`)
- **Assigned Permissions:** Exactly `["notifications:view-delivery-failures"]`. Does NOT possess `manage-scheduled` or `manage-rules`.
- **Session API Verification (`GET /api/auth/session`):**
```json
{
  "success": true,
  "user": {
    "id": "844cd857-d006-46e5-9bd8-6a433b36790b",
    "username": "user_fail_1790148204603",
    "isSuperuser": false,
    "companyId": "730917be-9701-4af6-aef6-c78afb730d2b",
    "status": "ACTIVE",
    "roleName": "Test Failures Only 1790148204520",
    "effectivePermissions": [
      "notifications:view-delivery-failures"
    ]
  }
}
```
- **Observed Hub Grid Contents (`#settings-hub-grid`):**
  - Card 1: `#card-delivery-failures` (present)
  - **Scheduled Notifications Card (`#card-scheduled-notifications`):** **GENUINELY ABSENT** (`canManageScheduledNotifications = false`)
  - **Notification Rules Card (`#card-notification-rules`):** **GENUINELY ABSENT** (`canManageNotificationRules = false`)

---

## 2. Cancel a Real Active Scheduled Notification Through the UI Flow

- **Target Record ID:** `22f29fbc-a176-48a1-b03c-d66133c6ba27`
- **Target Title:** `"Quarterly Security Drill Notice"`
- **BEFORE CANCELLATION:**
  - Database Record:
    ```json
    {
      "id": "22f29fbc-a176-48a1-b03c-d66133c6ba27",
      "title": "Quarterly Security Drill Notice",
      "status": "ACTIVE",
      "nextExecutionAt": "2026-09-30T07:23:24.966Z",
      "deletedAt": null
    }
    ```
  - UI Rendered State:
    - Status Badge: `<span id="status-badge-active-22f29fbc-a176-48a1-b03c-d66133c6ba27" class="... bg-status-success-bg text-status-success-text ...">Active</span>`
    - Actions: Action button `<button id="cancel-scheduled-btn-22f29fbc-a176-48a1-b03c-d66133c6ba27">Cancel</button>` is active and visible (`canCancel = true`).

- **UI Confirmation Modal Flow:**
  - User clicks `#cancel-scheduled-btn-22f29fbc-a176-48a1-b03c-d66133c6ba27`.
  - Modal `#cancel-scheduled-modal` opens with message:
    `"Are you sure you want to cancel the scheduled notification "Quarterly Security Drill Notice"? It will not fire at its scheduled time. This action cannot be undone."`
  - User clicks `#confirm-cancel-btn` (with CSRF header `x-csrf-token`).
  - Network Request: `POST /api/scheduled-notifications/22f29fbc-a176-48a1-b03c-d66133c6ba27/cancel`
  - Response Code: `200 OK`
  - Response Body:
    ```json
    {
      "success": true,
      "message": "Scheduled notification cancelled successfully.",
      "notification": {
        "id": "22f29fbc-a176-48a1-b03c-d66133c6ba27",
        "companyId": "730917be-9701-4af6-aef6-c78afb730d2b",
        "title": "Quarterly Security Drill Notice",
        "message": "Mandatory active security drill scheduled for all staff.",
        "recipientConfig": {
          "entireCompany": true,
          "userIds": [],
          "groupIds": [],
          "learner": false,
          "directManager": false
        },
        "channels": {
          "inLms": true,
          "email": true
        },
        "actionUrl": null,
        "startAt": "2026-09-30T07:23:24.966Z",
        "recurrence": "NONE",
        "endAt": null,
        "status": "CANCELLED",
        "nextExecutionAt": "2026-09-30T07:23:24.966Z",
        "lastExecutedAt": null,
        "createdById": "9363c660-5ae3-4494-83da-b50e21e05a68",
        "createdAt": "2026-09-23T07:23:24.991Z",
        "updatedAt": "2026-09-23T07:23:25.153Z",
        "deletedAt": null
      }
    }
    ```

- **AFTER CANCELLATION:**
  - Real Database Status: `status = "CANCELLED"` (persisted in DB; `deletedAt: null` preserves audit history).
  - UI Rendered State:
    - Status Badge: `<span id="status-badge-cancelled-22f29fbc-a176-48a1-b03c-d66133c6ba27" class="inline-flex items-center space-x-1 rounded-full bg-status-error-bg px-2.5 py-0.5 text-xs font-semibold text-status-error-text border border-status-error-text/20"><span>Cancelled</span></span>`
    - Active Badge (`#status-badge-active-...`): **ABSENT**
    - Cancel Button (`#cancel-scheduled-btn-...`): **ABSENT** (`canCancel = false`)
    - Banner: Green alert banner rendered at the top of the table: `"Successfully cancelled scheduled notification \"Quarterly Security Drill Notice\"."` (`#scheduled-action-success-banner`).

---

## 3. Duplicate a Real Scheduled Notification Through the UI Flow

- **Source Notification:**
  - ID: `sourceNotif` (`Weekly Compliance Digest & Progress Standup`, recurrence: `WEEKLY`)
- **UI Modal Execution:**
  - User clicks `#duplicate-scheduled-btn-${sourceId}`.
  - Modal `#duplicate-scheduled-modal` opens with title input prepopulated with `Weekly Compliance Digest & Progress Standup (Copy)`.
  - User customizes parameters in the modal:
    - Title Input (`#duplicate-title-input`): `"Weekly Compliance Digest & Progress Standup (Q1 2027 Cohort)"`
    - Start Date Input (`#duplicate-start-at-input`): `"2027-01-08T09:00:00.000Z"`
    - End Date Input (`#duplicate-end-at-input`): `"2027-06-30T18:00:00.000Z"`
  - User clicks `#submit-duplicate-btn`.
  - Network Request: `POST /api/scheduled-notifications/${sourceId}/duplicate` with payload:
    ```json
    {
      "title": "Weekly Compliance Digest & Progress Standup (Q1 2027 Cohort)",
      "startAt": "2027-01-08T09:00:00.000Z",
      "endAt": "2027-06-30T18:00:00.000Z"
    }
    ```
  - Response Code: `201 Created`
  - Response Payload (Real Created Row):
    ```json
    {
      "id": "5c68bf89-4049-4a89-8d91-3fe6c52caa43",
      "companyId": "730917be-9701-4af6-aef6-c78afb730d2b",
      "title": "Weekly Compliance Digest & Progress Standup (Q1 2027 Cohort)",
      "message": "Weekly reminder to review learner assignment completions.",
      "recipientConfig": {
        "entireCompany": false,
        "userIds": [
          "9363c660-5ae3-4494-83da-b50e21e05a68"
        ],
        "groupIds": [],
        "learner": false,
        "directManager": false
      },
      "channels": {
        "inLms": true,
        "email": false
      },
      "actionUrl": "/compliance-standup",
      "startAt": "2027-01-08T09:00:00.000Z",
      "recurrence": "WEEKLY",
      "endAt": "2027-06-30T18:00:00.000Z",
      "status": "ACTIVE",
      "nextExecutionAt": "2027-01-08T09:00:00.000Z",
      "lastExecutedAt": null,
      "createdById": "9363c660-5ae3-4494-83da-b50e21e05a68",
      "createdAt": "2026-09-23T07:23:25.384Z",
      "updatedAt": "2026-09-23T07:23:25.384Z",
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
- **UI Render Verification:**
  - Modal automatically closes on success.
  - Table refreshes automatically.
  - Confirmation alert banner renders: `"Successfully created a duplicate scheduled notification."`
  - The duplicated notification immediately appears in the table with `status: "ACTIVE"`, next execution set to `Jan 8, 2027, 09:00 AM`, and end date `Jun 30, 2027, 06:00 PM`.

---

## 4. Client-Side "Expired" Badge Derivation and Rendering Verification

In accordance with architectural decisions from Phase 1, recurring scheduled notifications whose `nextExecutionAt` is past `endAt` maintain `status = 'ACTIVE'` in the database without any artificial backend enum mutation. The client derives and renders this condition.

- **Observed Notification in DB:**
  - Record ID: `105d5ef4-b50a-40c4-9c64-ffa9aebed393`
  - Title: `"Completed Monthly Safety Briefing Cycle"`
  - Recurrence: `"MONTHLY"` (`recurrence !== 'NONE'`)
  - End Date (`endAt`): `"2026-08-31T23:59:59.000Z"`
  - Next Execution (`nextExecutionAt`): `"2026-09-01T09:00:00.000Z"`
  - Last Execution (`lastExecutedAt`): `"2026-08-01T09:00:00.000Z"`
  - Stored DB Status: `"ACTIVE"`

- **Chronological Evaluation:**
  - `nextExecutionAt` (epoch `1788253200000`) > `endAt` (epoch `1788220799000`) = `true`.

- **Client Evaluation Logic (`ScheduledNotificationManagement.tsx`):**
  ```ts
  const isCancelled = item.status === 'CANCELLED'; // false
  const isExpired =
    !isCancelled &&
    item.recurrence !== 'NONE' &&
    Boolean(item.endAt) &&
    new Date(item.nextExecutionAt).getTime() > new Date(item.endAt!).getTime(); // true
  const isActive = item.status === 'ACTIVE' && !isExpired; // false
  const canCancel = isActive; // false
  ```

- **Rendered DOM State for Row `#scheduled-row-105d5ef4-b50a-40c4-9c64-ffa9aebed393`:**
  - **Rendered Status Badge Element:**
    ```html
    <span
      id="status-badge-expired-105d5ef4-b50a-40c4-9c64-ffa9aebed393"
      class="inline-flex items-center space-x-1 rounded-full bg-status-warning-bg px-2.5 py-0.5 text-xs font-semibold text-status-warning-text border border-status-warning-text/20"
    >
      <span>Expired</span>
    </span>
    ```
  - **Active Status Badge (`#status-badge-active-...`):** **NOT RENDERED**
  - **Cancelled Status Badge (`#status-badge-cancelled-...`):** **NOT RENDERED**
  - **Cancel Action Button (`#cancel-scheduled-btn-...`):** **NOT RENDERED** (`canCancel` evaluates to `false`, preventing attempts to cancel expired schedules)
  - **Edit & Duplicate Buttons:** Remain accessible for inspecting parameters or cloning into a future cycle.

