# Notification Rule Create/Edit Form (Phase 2) — Verification Confirmation

**Execution Timestamp:** 2026-09-22T08:58:20.000Z  
**Task:** Notification Rule Create/Edit Form (Phase 2)  
**Auditor:** AI Assistant  

---

## 1. Create Rule End-to-End (Real Request / Response)

### Request: POST `/api/notification-admin/rules`
- **Headers:**
  - `Cookie: sid=s:493f6c8c-...; csrfToken=test-csrf-token-...`
  - `x-csrf-token: test-csrf-token-...`
  - `Content-Type: application/json`
- **Payload:**
```json
{
  "name": "Custom 5-Day Due Soon Alert (1790067480003)",
  "notificationType": "DUE_SOON",
  "enabled": true,
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
  "conditions": {
    "daysBeforeDue": 5
  },
  "titleKey": "Action Required: {{lessonTitle}} due soon",
  "bodyKey": "Your assignment \"{{lessonTitle}}\" is due in 5 days on {{dueDate}}.",
  "actionType": "OPEN_LESSON",
  "actionUrl": "/catalog"
}
```

### Response: HTTP 201 Created
```json
{
  "id": "c2864343-d820-49f8-bf2c-b1fa52d1a23e",
  "companyId": "730917be-9701-4af6-aef6-c78afb730d2b",
  "name": "Custom 5-Day Due Soon Alert (1790067480003)",
  "notificationType": "DUE_SOON",
  "enabled": true,
  "mandatory": false,
  "isSystemDefault": false,
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
  "conditions": {
    "daysBeforeDue": 5
  },
  "titleKey": "Action Required: {{lessonTitle}} due soon",
  "bodyKey": "Your assignment \"{{lessonTitle}}\" is due in 5 days on {{dueDate}}.",
  "actionType": "OPEN_LESSON",
  "actionUrl": "/catalog",
  "createdAt": "2026-09-22T08:58:00.003Z",
  "updatedAt": "2026-09-22T08:58:00.003Z",
  "deletedAt": null
}
```

---

## 2. Edit a System-Default Rule's Channels (Real Before / After)

### Target System-Default Rule:
- **Name:** `"New Lesson Assigned"`
- **Rule ID:** `7a580868-ea5f-4a5f-9e51-d5ef8f25de33`
- **isSystemDefault:** `true`

### Initial State (Before):
- `channels.inLms`: `true`
- `channels.email`: `true`

### PATCH Request: `/api/notification-admin/rules/7a580868-ea5f-4a5f-9e51-d5ef8f25de33`
- **Payload:**
```json
{
  "channels": {
    "inLms": true,
    "email": false
  }
}
```

### Result (After):
- **HTTP Status:** `200 OK`
- **Updated Channels:** `channels.inLms = true`, `channels.email = false`
- **Server-Side Immutability Enforcement Verified:** Sending PATCH with `notificationType: "OVERDUE"` was immediately rejected by the server:
  - **HTTP Status:** `400 Bad Request`
  - **Response:** `{"error": "notificationType is immutable and cannot be changed."}`

---

## 3. Form UI: Immutable `notificationType` Disabled State

In `NotificationRuleForm.tsx`, when editing an existing rule (`isEditing = true`):
- **DOM Element:** `<select id="rule-notification-type-select" disabled={isEditing} ...>`
- **Rendered State Attributes:**
  - The HTML `<select>` element receives `disabled=""`.
  - Tailwind styling classes applied: `cursor-not-allowed bg-card-header-bg/70 opacity-75` to clearly indicate read-only/locked status to users and assistive technologies.
  - An inline lock indicator is rendered underneath with icon `<Lock className="h-3.5 w-3.5" />`:
    `"Notification type is locked after creation and cannot be changed."` (`notificationRules.form.notificationTypeImmutableNote`).
- **User Actions:** The field cannot be interacted with or focused, preventing client-side alteration, matching the server-side immutability constraint.

---

## 4. Functional End-to-End Test: `processDeadlineReminders()` Dynamic Pick-Up

### Scenario:
A custom `DUE_SOON` rule configured with `conditions.daysBeforeDue = 5` is created in the database. A learner is assigned a lesson with a due date exactly 5 days from today (`2026-09-27T12:00:00.000Z`).

### Execution:
- **Custom Rule ID:** `c2864343-d820-49f8-bf2c-b1fa52d1a23e` (`daysBeforeDue: 5`)
- **Created Assignment ID:** `4d462bb9-e404-4da9-a7e3-a861540ab9bc`
- **Created UserAssignmentInstance ID:** `3426e629-9c05-4446-ae23-4ae8c9c23587`
- **Learner User ID:** `3aa57f8d-5267-47f6-807b-952ee85e592c`
- **Trigger:** Executed `await processDeadlineReminders()` directly.

### Verified Results:
`processDeadlineReminders()` dynamically queried all enabled `DUE_SOON` rules, parsed `conditions.daysBeforeDue === 5`, matched the `UserAssignmentInstance` scheduled for 5 days out, and invoked `processNotificationEvent`:
1. **NotificationInstance Created:**
   - **ID:** `d75b16ac-322f-4239-b7c6-68bc544ce4b4`
   - **ruleId:** `c2864343-d820-49f8-bf2c-b1fa52d1a23e` (Matches custom rule ID exactly)
   - **sourceEventType:** `ASSIGNMENT_DUE_SOON`
   - **sourceEventId:** `3426e629-9c05-4446-ae23-4ae8c9c23587` (Matches instance ID)
   - **titleKey Template:** `"Action Required: {{lessonTitle}} due soon"`
   - **titleParams:** `{"lessonTitle":"employee-health-and-wellness-sample-course-scorm12-0B2a3WZM","dueDate":"2026-09-27"}`
   - **bodyKey Template:** `"Your assignment \"{{lessonTitle}}\" is due in 5 days on {{dueDate}}."`
   - **bodyParams:** `{"lessonTitle":"employee-health-and-wellness-sample-course-scorm12-0B2a3WZM","dueDate":"2026-09-27"}`
   - **actionType:** `"OPEN_LESSON"`
   - **actionUrl:** `"/catalog"`
2. **NotificationRecipient & Deliveries Generated:**
   - **Recipient:** `userId = 3aa57f8d-5267-47f6-807b-952ee85e592c` (learner)
   - **Deliveries:**
     - Channel `IN_LMS` (Status: `SENT`)
     - Channel `EMAIL` (Status: `PENDING`)

---

## 5. Typecheck & Build Summary
- `npm run lint` (`tsc --noEmit`): **Passed** (0 errors)
- `npm run build` (`vite build && esbuild ...`): **Passed** (dist/server.cjs compiled in 157ms, vite assets bundled cleanly)
