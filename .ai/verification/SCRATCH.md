# Notification Rule Management UI — Concrete Verification Evidence

**Execution Timestamp:** 2026-09-20T08:52:05.253Z  
**Target Environment:** Local Dev Server (`http://localhost:3000`) & Production Build Container  
**Auditor:** AI Assistant  
**Code Changes:** Zero (verification only)

---

## STEP 1: Rule List Retrieval (User WITH `notifications:manage-rules`)

**Request:**  
`GET /api/notification-admin/rules`  
**Authenticated Session:** `admin` (`userId: "9363c660-5ae3-4494-83da-b50e21e05a68"`, `isSuperuser: true`)  
**HTTP Response Status:** `200 OK`  
**Total Rules Returned:** 8  

### Actual Response Payload:
```json
[
  {
    "id": "7a580868-ea5f-4a5f-9e51-d5ef8f25de33",
    "name": "New Lesson Assigned",
    "notificationType": "LESSON_ASSIGNED",
    "enabled": true,
    "isSystemDefault": true
  },
  {
    "id": "89faaf15-b4cf-4339-b134-7673f6d9420f",
    "name": "Deadline Reminder (7 days)",
    "notificationType": "DUE_SOON",
    "enabled": true,
    "isSystemDefault": true
  },
  {
    "id": "bd014add-c540-4523-8c43-6fe5a26177b4",
    "name": "Deadline Reminder (3 days)",
    "notificationType": "DUE_SOON",
    "enabled": true,
    "isSystemDefault": true
  },
  {
    "id": "288c7094-3f2e-4759-8085-27d559a5362d",
    "name": "Deadline Reminder (1 day)",
    "notificationType": "DUE_SOON",
    "enabled": true,
    "isSystemDefault": true
  },
  {
    "id": "dae39697-1fd5-47fe-9221-0c157fab46d2",
    "name": "Learner Overdue Notice",
    "notificationType": "OVERDUE",
    "enabled": true,
    "isSystemDefault": true
  },
  {
    "id": "95ca779f-6b5b-4df1-9425-f347c9a855d3",
    "name": "Learner Completion Confirmation",
    "notificationType": "COMPLETION_CONFIRMATION",
    "enabled": true,
    "isSystemDefault": true
  },
  {
    "id": "1b0693de-d735-4f41-8ed4-fe6f1dddd3be",
    "name": "Manager Completion Notice",
    "notificationType": "MANAGER_COMPLETION",
    "enabled": true,
    "isSystemDefault": true
  },
  {
    "id": "95a0b54c-6b92-41e0-8f0a-2dd0d6bf9e2a",
    "name": "Manager Overdue Notice",
    "notificationType": "MANAGER_OVERDUE",
    "enabled": true,
    "isSystemDefault": true
  }
]
```

---

## STEP 2: Toggle Rule Enabled State & Confirm Persistence

**Target Rule:**  
- **ID:** `7a580868-ea5f-4a5f-9e51-d5ef8f25de33`  
- **Name:** `"New Lesson Assigned"`  
- **Initial State:** `enabled: true`  

### Action:
`PATCH /api/notification-admin/rules/7a580868-ea5f-4a5f-9e51-d5ef8f25de33`  
**Headers:** `Content-Type: application/json`, `X-CSRF-Token: 2882b162c0ebdfb641e0f05ccb549a38803ea5971e9fe750`  
**Request Payload:**
```json
{
  "enabled": false
}
```

### Server Response (`200 OK`):
```json
{
  "id": "7a580868-ea5f-4a5f-9e51-d5ef8f25de33",
  "companyId": "730917be-9701-4af6-aef6-c78afb730d2b",
  "name": "New Lesson Assigned",
  "notificationType": "LESSON_ASSIGNED",
  "enabled": false,
  "mandatory": false,
  "recipientConfig": {
    "learner": true,
    "directManager": false,
    "entireCompany": false,
    "groupIds": [],
    "userIds": []
  },
  "channels": {
    "inLms": true,
    "email": true
  },
  "conditions": null,
  "titleKey": "New Lesson Assigned: {{lessonTitle}}",
  "bodyKey": "You have been assigned \"{{lessonTitle}}\". Please complete it{{dueDateText}}.",
  "actionType": null,
  "actionUrl": null,
  "isSystemDefault": true,
  "createdById": null,
  "createdAt": "2026-09-12T09:41:06.780Z",
  "updatedAt": "2026-09-20T08:52:04.687Z",
  "deletedAt": null
}
```

### Refetch / Verification:
**Request:** `GET /api/notification-admin/rules`  
**Observed State on Refetched Rule `7a580868-ea5f-4a5f-9e51-d5ef8f25de33`:**
- **Before:** `enabled: true`
- **After (Persisted in DB):** `enabled: false`  
- **Verified Timestamp Updated:** `updatedAt` changed from initial creation to `2026-09-20T08:52:04.687Z`.

*(Note: State was subsequently toggled back to `enabled: true` to preserve baseline seeding integrity).*

---

## STEP 3: Duplicate System-Default Rule

**Source Rule:** `7a580868-ea5f-4a5f-9e51-d5ef8f25de33` (`New Lesson Assigned`)  
**Request:** `POST /api/notification-admin/rules/7a580868-ea5f-4a5f-9e51-d5ef8f25de33/duplicate`  
**Headers:** `X-CSRF-Token: 2882b162c0ebdfb641e0f05ccb549a38803ea5971e9fe750`  
**HTTP Response Status:** `201 Created`  

### Actual Response Payload of the New Row:
```json
{
  "id": "dc3c20c9-6bbc-4e5b-a905-4fcb0b10f728",
  "companyId": "730917be-9701-4af6-aef6-c78afb730d2b",
  "name": "New Lesson Assigned (Copy)",
  "notificationType": "LESSON_ASSIGNED",
  "enabled": false,
  "mandatory": false,
  "recipientConfig": {
    "learner": true,
    "directManager": false,
    "entireCompany": false,
    "groupIds": [],
    "userIds": []
  },
  "channels": {
    "inLms": true,
    "email": true
  },
  "conditions": null,
  "titleKey": "New Lesson Assigned: {{lessonTitle}}",
  "bodyKey": "You have been assigned \"{{lessonTitle}}\". Please complete it{{dueDateText}}.",
  "actionType": null,
  "actionUrl": null,
  "isSystemDefault": false,
  "createdById": "9363c660-5ae3-4494-83da-b50e21e05a68",
  "createdAt": "2026-09-20T08:52:05.037Z",
  "updatedAt": "2026-09-20T08:52:05.037Z",
  "deletedAt": null
}
```

### Key Values of Created Copy:
- **`id`:** `"dc3c20c9-6bbc-4e5b-a905-4fcb0b10f728"`
- **`name`:** `"New Lesson Assigned (Copy)"`
- **`isSystemDefault`:** `false` (converted from system default to custom)
- **`enabled`:** `false` (defaults to disabled upon duplication for safe configuration)
- **`createdById`:** `"9363c660-5ae3-4494-83da-b50e21e05a68"` (attributed to current admin)

---

## STEP 4: Delete System-Default Protection vs. Custom Rule Deletion

### Part A: System-Default Delete Protection
**Observed UI Element for System-Default Rule (`id="delete-rule-btn-7a580868-ea5f-4a5f-9e51-d5ef8f25de33"`):**
- **HTML Element:**
  ```html
  <button
    type="button"
    disabled=""
    class="inline-flex items-center space-x-1.5 rounded-lg border border-card-border/40 bg-bg-subtle/50 px-2.5 py-1.5 text-xs font-semibold text-text-muted/60 cursor-not-allowed opacity-50"
    id="delete-rule-btn-7a580868-ea5f-4a5f-9e51-d5ef8f25de33"
    aria-label="System default notification rules cannot be deleted. You can disable them instead."
    title="System default notification rules cannot be deleted. You can disable them instead."
  >
    <svg ... class="lucide lucide-lock h-3.5 w-3.5 shrink-0">...</svg>
    <span>Delete</span>
  </button>
  ```
- **Visual & Behavioral Proof:**
  - Has explicit `disabled` attribute in the DOM.
  - Class styling: `cursor-not-allowed opacity-50` with muted gray background.
  - Renders a locked padlock (`Lock`) icon instead of the active trash icon.
  - Tooltip/`title` & `aria-label`: `"System default notification rules cannot be deleted. You can disable them instead."`
  - Clicking this button does nothing (browser blocks click events; no modal opens, no network request is sent).

**Backend Defense Enforcement:**  
Direct HTTP deletion attempt against system-default rule:  
`DELETE /api/notification-admin/rules/7a580868-ea5f-4a5f-9e51-d5ef8f25de33`  
- **HTTP Status:** `403 Forbidden`  
- **Payload:**
  ```json
  {
    "error": "System-default notification rules cannot be deleted. You can disable them instead."
  }
  ```

---

### Part B: Real Custom Rule Deletion
**Target Rule:** Custom duplicate created in Step 3 (`id: "dc3c20c9-6bbc-4e5b-a905-4fcb0b10f728"`, `name: "New Lesson Assigned (Copy)"`).  
**Request:**  
`DELETE /api/notification-admin/rules/dc3c20c9-6bbc-4e5b-a905-4fcb0b10f728`  
**Headers:** `X-CSRF-Token: 2882b162c0ebdfb641e0f05ccb549a38803ea5971e9fe750`  
**HTTP Response Status:** `200 OK`  

### Actual Response Payload:
```json
{
  "success": true,
  "message": "Notification rule deleted successfully.",
  "rule": {
    "id": "dc3c20c9-6bbc-4e5b-a905-4fcb0b10f728",
    "companyId": "730917be-9701-4af6-aef6-c78afb730d2b",
    "name": "New Lesson Assigned (Copy)",
    "notificationType": "LESSON_ASSIGNED",
    "enabled": false,
    "mandatory": false,
    "recipientConfig": {
      "learner": true,
      "directManager": false,
      "entireCompany": false,
      "groupIds": [],
      "userIds": []
    },
    "channels": {
      "inLms": true,
      "email": true
    },
    "conditions": null,
    "titleKey": "New Lesson Assigned: {{lessonTitle}}",
    "bodyKey": "You have been assigned \"{{lessonTitle}}\". Please complete it{{dueDateText}}.",
    "actionType": null,
    "actionUrl": null,
    "isSystemDefault": false,
    "createdById": "9363c660-5ae3-4494-83da-b50e21e05a68",
    "createdAt": "2026-09-20T08:52:05.037Z",
    "updatedAt": "2026-09-20T08:52:05.253Z",
    "deletedAt": "2026-09-20T08:52:05.228Z"
  }
}
```

### Refetch Verification:
**Request:** `GET /api/notification-admin/rules`  
- **Does `dc3c20c9-6bbc-4e5b-a905-4fcb0b10f728` exist in list?** `false` (0 matches).  
- **Active rules count in list:** `8` (returned to exact baseline).  
- **Soft-Delete in DB:** Record has `deletedAt: 2026-09-20T08:52:05.228Z`, cleanly excluded by `where: { deletedAt: null }`.

---

## STEP 5: Permission Gating & Absence of Card for Non-Permitted Users

### Test Case A: User WITHOUT `notifications:manage-rules` Calling Backend API
**Target User:** `learner` (`id: "3aa57f8d-5267-47f6-807b-952ee85e592c"`, `isSuperuser: false`, `roleName: null`, `effectivePermissions: []`)  
**Request:** `GET /api/notification-admin/rules`  
**HTTP Response Status:** `403 Forbidden`  
**Actual Payload:**
```json
{
  "error": "Forbidden: Missing required permission \"notifications:manage-rules\"."
}
```

---

### Test Case B: Observed UI Render on Settings Page (`Settings.tsx`)

#### 1. Plain Learner (`isSuperuser: false`, all permissions `false`):
- **Permission State:**
  - `canManageFields`: `false`
  - `canViewThemes`: `false`
  - `canManageNotificationRules`: `false`
  - `canManageFields || canViewThemes || canManageNotificationRules`: `false`
- **Observed Hub Grid Rendering:**
  - `<div id="settings-hub-grid">`: **NOT PRESENT** (0 cards).
  - `<div id="card-notification-rules">`: **ABSENT**.
  - `<div id="settings-empty-state">`: **RENDERED** with:
    - Heading: `"Settings"`
    - Subtitle: `"No settings are configurable yet - check back as more features are added."`
- **Navigation & Access Control (`Navbar.tsx` & `App.tsx`):**
  - `hasSettingsAccess` = `false`.
  - The "Settings" navigation tab in the top navbar is completely hidden from the user.
  - If the learner enters `#settings` directly in the URL hash, `App.tsx` immediately executes `setCurrentTab(Tab.MyLessons)`, redirecting them away from the settings view.

#### 2. User with `theme:view` or `profile-fields:manage-fields`, but WITHOUT `notifications:manage-rules`:
- **Permission State:**
  - `canViewThemes`: `true`
  - `canManageFields`: `false`
  - `canManageNotificationRules`: `false`
  - `canManageFields || canViewThemes || canManageNotificationRules`: `true`
- **Observed Hub Grid Rendering:**
  - `<div id="settings-hub-grid">`: **RENDERED**
  - Cards present in grid: Exactly **1 card** (`id="card-theme-management"`)
  - `<div id="card-field-builder">`: **ABSENT** (`canManageFields` is false)
  - `<div id="card-notification-rules">`: **STRICTLY ABSENT** (`canManageNotificationRules` is false)

#### 3. User with `notifications:manage-rules` (Admin):
- **Permission State:**
  - `canManageNotificationRules`: `true`
- **Observed Hub Grid Rendering:**
  - `<div id="settings-hub-grid">`: **RENDERED**
  - `<div id="card-notification-rules">`: **RENDERED** with Title `"Notification Rules"`, Description `"Manage automated notification rules, delivery channels, and trigger schedules across your LMS."`, and Action Button `"Manage Rules"`.
