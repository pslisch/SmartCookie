# Assignments Feature Module

This feature module governs **Learning Assignments, Target Resolution, and Learner Instance Tracking** in the SmartCookie LMS. It provides a robust, enterprise-grade architecture for assigning individual lessons or entire courses to users, organization units (OUs), or learning groups, dynamically materializing those assignments into user-level states.

---

## 🏗️ Architectural Core

The assignments engine is designed with a strict physical separation of administrative intent and learner state:

### 1. `Assignment` vs. `UserAssignmentInstance`
* **`Assignment`**: An administrative record of intent (e.g., *"Assign Lesson X to Organization Unit Y, due in 30 days"*). This contains the targets, assignment parameters, and creator metadata.
* **`UserAssignmentInstance`**: The actual localized learner state (e.g., *"Learner Z must complete Lesson X"*). It tracks learner-specific progress, started/completed timestamps, and due date states.

### 2. Target Resolution Engine (`TargetResolutionService`)
Whenever an assignment is created, the target resolution engine resolves the potentially complex, nested targets into a flat list of individual user IDs:
* **User Targets**: Handled directly.
* **Organization Unit Targets**: Evaluates the target OU and recursively crawls its entire child subtree (`organization_units` and `memberships`) to retrieve all descendant members.
* **Learning Group Targets**: Resolves the direct memberships of the specified group.

### 3. Multi-Source Qualifying Links & De-duplication
A learner might qualify for an assignment from multiple independent sources (e.g., being a member of a targeted Group *and* a targeted OU). To prevent duplicate active assignments:
* The system uses `UserAssignmentInstanceSource` records to link a single active `UserAssignmentInstance` to multiple sources.
* **Membership Hook Syncing (`MembershipAssignmentHooksService`)**: When a user leaves a group or OU, the system deletes the associated source link. If other qualifying source links remain, the assignment instance remains `ACTIVE`. If the last qualifying source link is removed, the assignment instance is automatically `CANCELLED`.
* **Predictability Simplification**: Changing a user's primary OU does not retroactively add or remove previously materialized assignment instances. This ensures training records and historical logs remain auditable and predictable.

### 4. Course Assignment Fan-Out
Assigning a Course compiles all the constituent Lessons of that course, creates separate `Assignment` entries for each of those Lessons under a shared `courseAssignmentBatchId`, and materializes them in parallel.

### 5. Audit Logging (`AuditLogService`)
All administrative mutations (assignment creation, cancellation, user reactivation, group adjustments) are recorded inside the central `audit_logs` table with structured JSON metadata for enterprise compliance and auditability.

---

## 📂 Codebase & Services

The backend features are structured inside `server/src/features/assignments/`:

* **`services/assignment.service.ts`**: Coordinates transaction boundaries for establishing lesson or course assignments.
* **`services/targetResolution.service.ts`**: Handles hierarchical OU subtree searches and group resolution.
* **`services/materialization.service.ts`**: Handles creation/updating of individual user assignment instances and source linkages.
* **`services/selfAssignment.service.ts`**: Handles self-driven learning enrollments.
* **`services/completion.service.ts`**: Handles marking learner instances as completed.
* **`services/membershipAssignmentHooks.service.ts`**: Hooks triggered on membership modifications to dynamic-reconcile user instances.
* **`routes/assignments.routes.ts`**: Exposes secure express endpoints, gated strictly via permissions.

---

## 🔒 Permissions & Security

All operations are gated via standard module/action permissions, bypassable by Superusers:

* **`assignments:view`**: Allows viewing assignments and self-driven lesson completion.
* **`assignments:create`**: Allows scheduling non-mandatory assignments.
* **`assignments:create-mandatory`**: Gated specifically for mandatory regulatory assignments.
* **`assignments:delete`**: Restricts the soft-deletion (cancellation) of assignments.
* **`assignments:view-reports`**: Grants access to the progress breakdown reports.
* **`assignments:edit`**: Grants permission to reactivate archived users.

---

## ⏰ Background Scheduler (`ScheduledTasksService`)

An active daily background cron scheduler triggers tasks to:
1. **Purge Soft-Deletes**: Permanently deletes cancelled assignments, assignment instances, and memberships whose `permanentDeleteAt` window (14 days from deletion) has elapsed.
2. **Dispatch Reminders**: Scans active past-due assignments and sends single-tier overdue email notifications to learners, throttled to a maximum frequency of once every 14 days per instance using `lastReminderSentAt`.

---

## 🎒 Dependencies

* **Prisma ORM**: Interfaces with the relational database.
* **Express & Node.js**: Powers api routers.
* **Nodemailer / EmailService**: Delivers automated overdue alerts.
