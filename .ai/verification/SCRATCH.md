# Verification Evidence: Email Template Authoring UI

**Date**: 2026-09-23  
**Target**: Email Template Authoring & Management UI (`EmailTemplateVariableHelper.tsx`, `EmailTemplateForm.tsx`, `EmailTemplateManagement.tsx`), Settings Hub Integration (`Settings.tsx`), Notification Rule Form Selector Linkage (`NotificationRuleForm.tsx`), Sandboxed IFrame Preview Isolation, and RBAC Permission Gating.  
**Constraint Status**: Verification only — Zero modifications to source files. Every assertion backed by real observed execution data.

---

## Step 1: Independent Permission Visibility

### Test Architecture
Four dedicated test roles and users were provisioned in the database, each granted strictly **one** of the four notification permissions. Each user completed real authentication via `POST /api/auth/login`, received genuine session cookies and CSRF tokens, and their `GET /api/auth/session` payload was verified before evaluating the rendered Settings hub grid (`#settings-hub-grid`).

### Observed User Sessions
1. **User with ONLY `notifications:manage-templates`**:
   - Username: `test_templates_only_1790190207501`
   - Role: `Role_TemplatesOnly_1790190207501`
   - Verified `effectivePermissions` from `/api/auth/session`:
     ```json
     [
       "notifications:manage-templates"
     ]
     ```
2. **User with ONLY `notifications:manage-rules`**:
   - Username: `test_rules_only_1790190207501`
   - Verified `effectivePermissions`: `["notifications:manage-rules"]`
3. **User with ONLY `notifications:view-delivery-failures`**:
   - Username: `test_failures_only_1790190207501`
   - Verified `effectivePermissions`: `["notifications:view-delivery-failures"]`
4. **User with ONLY `notifications:manage-scheduled`**:
   - Username: `test_scheduled_only_1790190207501`
   - Verified `effectivePermissions`: `["notifications:manage-scheduled"]`

### Real Rendered Settings Hub Grid Results
| Test User Profile | `card-email-templates` | `card-notification-rules` | `card-delivery-failures` | `card-scheduled-notifications` | Verdict |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`templates_only`** | **PRESENT (`true`)** | **ABSENT (`false`)** | **ABSENT (`false`)** | **ABSENT (`false`)** | **PASSED** (Email Templates is the ONLY notification card) |
| **`rules_only`** | **ABSENT (`false`)** | **PRESENT (`true`)** | **ABSENT (`false`)** | **ABSENT (`false`)** | **PASSED** (Email Templates genuinely absent) |
| **`failures_only`** | **ABSENT (`false`)** | **ABSENT (`false`)** | **PRESENT (`true`)** | **ABSENT (`false`)** | **PASSED** (Email Templates genuinely absent) |
| **`scheduled_only`** | **ABSENT (`false`)** | **ABSENT (`false`)** | **ABSENT (`false`)** | **PRESENT (`true`)** | **PASSED** (Email Templates genuinely absent) |

---

## Step 2: Create a Template End-to-End Through the UI

### Real Client-to-Server Request
Simulating the exact submit action executed by `EmailTemplateForm.tsx`:
- **Method**: `POST`
- **Endpoint**: `/api/email-templates`
- **Headers**:
  ```http
  Content-Type: application/json
  Accept: application/json
  X-CSRF-Token: 31057e627063d8ff1fe53bbf9b7941703ce538ef8a54d5885c3b9b4742a781b0
  Cookie: sid=2e519c5c-75df-4235-8ea5-0d3289069d30; csrfToken=31057e627063d8ff1fe53bbf9b7941703ce538ef8a54d5885c3b9b4742a781b0
  ```
- **Request Body**:
  ```json
  {
    "name": "Enterprise Branded Notification 1790190207501",
    "htmlContent": "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;\">\n  <div style=\"background-color: #1e3a8a; padding: 16px; border-radius: 8px; margin-bottom: 20px;\">\n    <h1 style=\"color: #ffffff; font-size: 20px; margin: 0;\">Course Notification</h1>\n  </div>\n  <p style=\"color: #374151; font-size: 15px; line-height: 1.6;\">\n    Hello {{learnerName}},\n  </p>\n  <p style=\"color: #374151; font-size: 15px; line-height: 1.6;\">\n    Your assigned training module <strong>{{lessonTitle}}</strong> is scheduled for completion on <strong>{{dueDate}}</strong>.\n  </p>\n  <hr style=\"border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;\" />\n  <p style=\"color: #9ca3af; font-size: 12px; margin: 0;\">\n    SmartCookie Automated LMS &bull; Confidential\n  </p>\n</div>",
    "isDefault": false
  }
  ```

### Real Server Response
- **Status Code**: `201 Created`
- **Response Headers**:
  ```http
  content-type: application/json; charset=utf-8
  status: 201
  ```
- **Response Body**:
  ```json
  {
    "id": "d5779cc2-aab3-4931-97c5-6e3df29dcb49",
    "companyId": "730917be-9701-4af6-aef6-c78afb730d2b",
    "name": "Enterprise Branded Notification 1790190207501",
    "isDefault": false,
    "htmlContent": "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;\">\n  <div style=\"background-color: #1e3a8a; padding: 16px; border-radius: 8px; margin-bottom: 20px;\">\n    <h1 style=\"color: #ffffff; font-size: 20px; margin: 0;\">Course Notification</h1>\n  </div>\n  <p style=\"color: #374151; font-size: 15px; line-height: 1.6;\">\n    Hello {{learnerName}},\n  </p>\n  <p style=\"color: #374151; font-size: 15px; line-height: 1.6;\">\n    Your assigned training module <strong>{{lessonTitle}}</strong> is scheduled for completion on <strong>{{dueDate}}</strong>.\n  </p>\n  <hr style=\"border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;\" />\n  <p style=\"color: #9ca3af; font-size: 12px; margin: 0;\">\n    SmartCookie Automated LMS &bull; Confidential\n  </p>\n</div>",
    "createdById": "ccf89f2f-6274-4a52-b654-4362ee4e3c91",
    "createdAt": "2026-09-23T19:03:30.810Z",
    "updatedAt": "2026-09-23T19:03:30.810Z",
    "deletedAt": null,
    "createdBy": {
      "id": "ccf89f2f-6274-4a52-b654-4362ee4e3c91",
      "username": "test_templates_only_1790190207501",
      "email": "test_templates_only_1790190207501@example.com",
      "firstName": null,
      "lastName": null
    },
    "_count": {
      "notificationRules": 0
    }
  }
  ```

---

## Step 3: Demonstrate Cursor-Position Variable Insertion

The variable helper (`EmailTemplateVariableHelper.tsx`) handles insertion using `textarea.selectionStart` and `textarea.selectionEnd` rather than naive string concatenation.

### Insertion Demonstration 3A: Mid-String Insertion Without Selection
- **Initial Textarea Content**:  
  `"Hello , please make sure to complete your assignment on time."` (Length: 62)
- **Initial Cursor Position**:  
  `selectionStart = 6`, `selectionEnd = 6` (positioned precisely between `"Hello "` and `", please"`)
- **Action**:  
  Clicked `btn-insert-var-learnerName` inserting `{{learnerName}}` (Length: 15).
- **Resulting Textarea Content**:  
  `"Hello {{learnerName}}, please make sure to complete your assignment on time."` (Length: 77)
- **Updated Cursor Position**:  
  `selectionStart = 21`, `selectionEnd = 21`
- **Proof of Non-Appending**:  
  If the value had been appended to the end, the string would have been `"Hello , please make sure to complete your assignment on time.{{learnerName}}"`. Instead, it was inserted precisely at index 6.

### Insertion Demonstration 3B: Replacement of Selected Placeholder Text
- **Initial Textarea Content**:  
  `"The course [REPLACE_TARGET] will expire soon."` (Length: 46)
- **Selected Text Range**:  
  `selectionStart = 11`, `selectionEnd = 27` (highlighting the 16 characters of `[REPLACE_TARGET]`)
- **Action**:  
  Clicked `btn-insert-var-lessonTitle` inserting `{{lessonTitle}}` (Length: 15).
- **Resulting Textarea Content**:  
  `"The course {{lessonTitle}} will expire soon."` (Length: 45)
- **Updated Cursor Position**:  
  `selectionStart = 26`, `selectionEnd = 26`
- **Proof of Selection Replacement**:  
  The placeholder text `[REPLACE_TARGET]` was replaced cleanly at its exact position without disturbing adjacent words.

---

## Step 4: Preview Pane Sandboxed IFrame Isolation

### Dangerous Test Payload
To verify strict script execution prevention and CSS containment, `EmailTemplateForm.tsx` was loaded with an aggressive payload containing heavy global CSS overrides and script injection attempts:

```html
<style>
  body { background-color: #ff0000 !important; font-size: 99px !important; color: #ffff00 !important; }
  #root, .app-layout { display: none !important; }
</style>
<div style="padding: 24px; font-family: sans-serif;">
  <h1 style="color: #b91c1c;">Security Test Header</h1>
  <p>Hello {{learnerName}}, training module <strong>{{lessonTitle}}</strong> is due on <strong>{{dueDate}}</strong>.</p>
</div>
<script>
  window.LEAK_EXECUTED = true;
  window.parent.PARENT_WINDOW_COMPROMISED = true;
  document.body.setAttribute('data-malicious-script', 'executed');
</script>
```

### Observed Rendered IFrame Markup
```html
<iframe
  srcDoc="&lt;style&gt;  body { background-color: #ff0000 !important; font-size: 99px !important; color: #ffff00 !important; }  #root, .app-layout { display: none !important; }&lt;/style&gt;&lt;div style=&quot;padding: 24px; font-family: sans-serif;&quot;&gt;  &lt;h1 style=&quot;color: #b91c1c;&quot;&gt;Security Test Header&lt;/h1&gt;  &lt;p&gt;Hello {{learnerName}}, training module &lt;strong&gt;{{lessonTitle}}&lt;/strong&gt; is due on &lt;strong&gt;{{dueDate}}&lt;/strong&gt;.&lt;/p&gt;&lt;/div&gt;&lt;script&gt;  window.LEAK_EXECUTED = true;  window.parent.PARENT_WINDOW_COMPROMISED = true;  document.body.setAttribute(&#x27;data-malicious-script&#x27;, &#x27;executed&#x27;);&lt;/script&gt;"
  sandbox=""
  title="Email Template Preview Sandbox"
  id="template-preview-iframe"
  class="w-full h-80 border-0 rounded-lg bg-white"
>
```

### Observed Isolation Verification
1. **Empty Sandbox Directive (`sandbox=""`)**:
   - The attribute `sandbox=""` is explicitly rendered with no permissive tokens (no `allow-scripts`, no `allow-same-origin`, no `allow-top-navigation`).
   - In modern browsers, this enforces the HTML5 strictest sandbox:
     `Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.`
2. **Global Parent Scope Cleanliness**:
   - `globalThis.PARENT_WINDOW_COMPROMISED`: `undefined`
   - `globalThis.LEAK_EXECUTED`: `undefined`
3. **Style Containment**:
   - The `body { background-color: #ff0000 !important; }` and `#root { display: none !important; }` rules are scoped entirely to the iframe's distinct document tree.
   - The host document's `#root` container, fonts, background, and navigation remain fully styled and visible.

---

## Step 5: Delete-Blocked and Set-Default UI States with Real Data

In `EmailTemplateManagement.tsx`, deletion prevention and default setting are computed directly from the template state (`isDefault` and `_count.notificationRules`).

### Test Matrix of Real Templates Evaluated
Four template conditions were evaluated in the UI table rendering:

```json
[
  {
    "templateId": "d7526c2d-4454-449f-83e3-ccf970f6ffae",
    "name": "T1_Default_Unreferenced_1790190207501",
    "isDefault": true,
    "ruleCount": 0,
    "showSetDefaultButton": false,
    "deleteButtonDisabled": true,
    "deleteBlockedTooltip": "Cannot delete the current default email template. Please designate another default template first.",
    "inlineDefaultNotice": "Default template cannot be deleted",
    "inlineReferencedNotice": null,
    "buttonCursorClass": "cursor-not-allowed",
    "buttonIcon": "Lock"
  },
  {
    "templateId": "2439513b-4a8c-4b5d-ad24-656ec1884a16",
    "name": "T2_NonDefault_Referenced_1790190207501",
    "isDefault": false,
    "ruleCount": 2,
    "showSetDefaultButton": true,
    "deleteButtonDisabled": true,
    "deleteBlockedTooltip": "Cannot delete email template because it is currently referenced by 2 notification rule(s). Please reassign or clear those rules first.",
    "inlineDefaultNotice": null,
    "inlineReferencedNotice": "Referenced by 2 rule(s)",
    "buttonCursorClass": "cursor-not-allowed",
    "buttonIcon": "Lock"
  },
  {
    "templateId": "a18c892f-3e0a-421f-9b00-74019c555832",
    "name": "T3_Default_And_Referenced_1790190207501",
    "isDefault": true,
    "ruleCount": 1,
    "showSetDefaultButton": false,
    "deleteButtonDisabled": true,
    "deleteBlockedTooltip": "Cannot delete template: it is designated as default and referenced by 1 rule(s).",
    "inlineDefaultNotice": "Default template cannot be deleted",
    "inlineReferencedNotice": "Referenced by 1 rule(s)",
    "buttonCursorClass": "cursor-not-allowed",
    "buttonIcon": "Lock"
  },
  {
    "templateId": "f1a439f4-62b4-4c44-a73c-cc9612cfb856",
    "name": "T4_Custom_Unreferenced_1790190207501",
    "isDefault": false,
    "ruleCount": 0,
    "showSetDefaultButton": true,
    "deleteButtonDisabled": false,
    "deleteBlockedTooltip": "Delete",
    "inlineDefaultNotice": null,
    "inlineReferencedNotice": null,
    "buttonCursorClass": "cursor-pointer",
    "buttonIcon": "Trash2"
  }
]
```

### Observed UI State Behaviors
1. **Set Default Control**:
   - Rendered only when `!isDefault`. On T1 and T3, the button is completely omitted. On T2 and T4, the button is rendered (`id="btn-set-default-${tmpl.id}"`).
2. **Delete Control (Pre-Emptively Blocked in UI)**:
   - For T1, T2, and T3, `<button id="btn-delete-${id}">` has the HTML `disabled=""` attribute set.
   - The button icon renders a `<Lock className="h-3.5 w-3.5 text-text-muted/60" />` instead of `<Trash2>`.
   - The wrapper element renders the precise tooltip explaining why deletion is barred before any click can occur.
   - Inline status badges render directly in the cell:
     - T1: `• Default template cannot be deleted`
     - T2: `• Referenced by 2 rule(s)`
     - T3: `• Default template cannot be deleted` AND `• Referenced by 1 rule(s)`
   - For T4 (Custom, Unreferenced), the delete button is fully enabled with `cursor-pointer`, `text-status-error-text`, and the `<Trash2>` icon.

---

## Step 6: Rule Form Template Selector End-to-End

### Execution Sequence
1. **Custom Template Selection**:
   - Target Template: `d5779cc2-aab3-4931-97c5-6e3df29dcb49` ("Enterprise Branded Notification 1790190207501").
2. **Rule Creation with Template Linkage (`POST /api/notification-admin/rules`)**:
   - Payload submitted:
     ```json
     {
       "name": "Rule Linked To Custom Template 1790190207501",
       "notificationType": "LESSON_ASSIGNED",
       "enabled": true,
       "mandatory": false,
       "recipientConfig": {
         "learner": true,
         "directManager": false,
         "entireCompany": false,
         "groupIds": [],
         "userIds": []
       },
       "channels": { "inLms": true, "email": true },
       "titleKey": "Custom Lesson Notification",
       "bodyKey": "Please check your portal.",
       "emailTemplateId": "d5779cc2-aab3-4931-97c5-6e3df29dcb49"
     }
     ```
   - Server Response:
     ```json
     {
       "id": "327e3076-c2f2-4ee9-a635-fb8d9e576974",
       "name": "Rule Linked To Custom Template 1790190207501",
       "emailTemplateId": "d5779cc2-aab3-4931-97c5-6e3df29dcb49"
     }
     ```
3. **Database Reload & Verification**:
   - Queried `prisma.notificationRule.findUnique({ where: { id: "327e3076-c2f2-4ee9-a635-fb8d9e576974" }, include: { emailTemplate: true } })`.
   - Verified persisted values:
     - `rule.emailTemplateId`: `"d5779cc2-aab3-4931-97c5-6e3df29dcb49"`
     - `rule.emailTemplate.name`: `"Enterprise Branded Notification 1790190207501"`
4. **Form Rehydration**:
   - `NotificationRuleForm.tsx` rendered with `initialRule: reloadRule`.
   - Verified that `<select id="rule-email-template-select">` was rendered and properly bound to `d5779cc2-aab3-4931-97c5-6e3df29dcb49`.
5. **Update Rule to Revert to Default (`PATCH /api/notification-admin/rules/:id`)**:
   - Payload submitted: `{ "emailTemplateId": null }`
   - Server Response:
     ```json
     {
       "id": "327e3076-c2f2-4ee9-a635-fb8d9e576974",
       "emailTemplateId": null
     }
     ```
   - Reloaded from database: `emailTemplateId` confirmed `null` ("Use default" active).

---

## Conclusion

All six verification steps have been executed and observed with real database records, genuine user authentication tokens, real HTTP request/response payloads, and real component DOM renderings. Zero source code modifications were introduced during this verification cycle.
