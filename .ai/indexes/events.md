# Event Index

This index catalogs custom events, webhooks, state broadcasts, and message payloads utilized in SmartCookie.

---

## 🔔 Event Registry Schema

Every documented event should eventually include:
- **Event Identifier**: Code-level topic name.
- **Producer**: Component or service emitting the message.
- **Consumer**: Components or services tracking the message.
- **Payload**: Standard structure of the serializable arguments.

---

## 🟢 Event Hub & Lifecycle Hooks (v1.11.0)

### 1. `scorm:cmi-commit`
- **Event Identifier**: `scorm:cmi-commit`
- **Producer**: `ScormApiBridge` (`src/features/content/services/scormApiBridge.ts`) inside the iframe
- **Consumer**: `ScormPlayer.tsx` -> `POST /api/content-attempts/:id/commit` -> `ContentAttemptService`
- **Payload**:
  ```typescript
  {
    lessonStatus: "PASSED" | "COMPLETED" | "FAILED" | "INCOMPLETE" | "BROWSED",
    scoreRaw?: number,
    scoreMin?: number,
    scoreMax?: number,
    sessionTimeSeconds?: number,
    lessonLocation?: string,
    suspendData?: string,
    objectives?: Array<{ id: string, score?: number, status?: string }>,
    interactions?: Array<{ id: string, type: string, response: string, result: string }>
  }
  ```

### 2. `scorm:cmi-finish`
- **Event Identifier**: `scorm:cmi-finish`
- **Producer**: `ScormApiBridge` (`LMSFinish` call from SCORM package)
- **Consumer**: `ScormPlayer.tsx` (triggers final completion save and updates player state)
- **Payload**: `{ attemptId: string, timestamp: string }`

### 3. `membership:assignment-reconcile`
- **Event Identifier**: `membership:assignment-reconcile`
- **Producer**: `OrganizationUnitService` (`assignMember`), `LearningGroupService` (`addMember`, `removeMember`)
- **Consumer**: `MembershipAssignmentHooksService`
- **Payload**:
  ```typescript
  {
    companyId: string,
    userId: string,
    targetType: "ORGANIZATION_UNIT" | "LEARNING_GROUP",
    targetId: string,
    action: "ADDED" | "REMOVED"
  }
  ```

### 4. `scheduler:nightly-soft-delete-purge`
- **Event Identifier**: `scheduler:nightly-soft-delete-purge`
- **Producer**: `ScheduledTasksService` (hourly/daily cron timer)
- **Consumer**: Prisma database client (permanently deletes records where `permanentDeleteAt <= now()`)
- **Payload**: `{ timestamp: Date, retentionDays: 14 }`

### 5. `scheduler:temporary-group-expiration`
- **Event Identifier**: `scheduler:temporary-group-expiration`
- **Producer**: `ScheduledTasksService` (hourly cron timer)
- **Consumer**: `LearningGroupService` (auto-expires groups where `expiresAt <= now()`)
- **Payload**: `{ timestamp: Date }`

### 6. `scheduler:overdue-assignment-reminders`
- **Event Identifier**: `scheduler:overdue-assignment-reminders`
- **Producer**: `ScheduledTasksService` (hourly cron timer)
- **Consumer**: `EmailService` (sends transactional overdue notification emails to users with matching notification preferences)
- **Payload**: `{ companyId: string, instanceId: string, userId: string, dueDate: Date }`

### 7. `identity:sync-failure-alert`
- **Event Identifier**: `identity:sync-failure-alert`
- **Producer**: `EntraSyncService` (on complete synchronization failure or critical API errors)
- **Consumer**: `EmailService` (dispatches urgent system alert email to users with `identity-providers:view-logs` permission)
- **Payload**:
  ```typescript
  {
    companyId: string,
    providerType: "MICROSOFT_ENTRA",
    status: "FAILED",
    errorSummary: string,
    syncLogId: string
  }
  ```

### 8. `auth:user-invitation`
- **Event Identifier**: `auth:user-invitation`
- **Producer**: `UserInvitationService` (`inviteUser`)
- **Consumer**: `EmailService` (dispatches account activation email containing secure single-use token link)
- **Payload**: `{ userId: string, email: string, activationUrl: string }`

### 9. `auth:password-reset`
- **Event Identifier**: `auth:password-reset`
- **Producer**: `UserInvitationService` (`requestPasswordReset`, `adminResetPassword`)
- **Consumer**: `EmailService` (dispatches password reset email containing secure single-use token link)
- **Payload**: `{ userId: string, email: string, resetUrl: string }`

### 10. `auth:email-change-verification`
- **Event Identifier**: `auth:email-change-verification`
- **Producer**: `ProfileRoutes` (`requestEmailChange`)
- **Consumer**: `EmailService` (dispatches verification link to new email address)
- **Payload**: `{ userId: string, newEmail: string, verificationUrl: string }`

