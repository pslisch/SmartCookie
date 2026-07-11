# Database Index

This index describes the data models, entity relationships, and schemas supporting the backend databases.

---

## 🗄️ Database Schema Specification

### Users (`users`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `username` (String, Nullable, Unique, Case-Insensitive)
  - `email` (String, Nullable, Unique)
  - `passwordHash` (String, Nullable — Nullable because PENDING invited users genuinely have no password yet)
  - `isSuperuser` (Boolean, Default: `false`)
  - `recoveryEmail` (String, Nullable — Nullable because this is a Superuser-specific field, regular users do not need it)
  - `companyId` (String, Nullable, Foreign Key to `companies.id`)
  - `roleId` (String, Nullable, Foreign Key to `roles.id` — Superuser bypasses this check)
  - `status` (Enum: `PENDING`, `ACTIVE`, `DISABLED`, `ARCHIVED`, `LOCKED`, Default: `ACTIVE`)
  - `createdAt` (DateTime, Default: `now()`)
  - `updatedAt` (DateTime, Auto-updated)
- **Indexes & Constraints**:
  - Unique constraint on `username` (nullable)
  - Unique constraint on `email` (nullable)
  - Raw SQL CHECK constraint: `username IS NOT NULL OR email IS NOT NULL` (guarantees every user has at least one identifier)
  - Raw SQL CHECK constraint: `status <> 'ACTIVE' OR passwordHash IS NOT NULL` (active users must have a password hash)
  - Unique index `users_is_superuser_unique_idx` on database-level virtual column `is_superuser_unique` (guarantees at most one superuser exists)
- **Relations**:
  - Belongs to `Company` (optional, via `companyId`)
  - Belongs to `Role` (optional, via `roleId`)
  - Has many `Session`s (via `sessions`)
  - Has many `Token`s (via `tokens`)

### Companies (`companies`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `name` (String)
  - `contactInfo` (String)
  - `setupCompletedAt` (DateTime, Nullable, set when setup wizard completes)
  - `roleInheritanceEnabled` (Boolean, Default: `false`, enables inheritance hierarchies)
  - `domain` (String, automatically populated from APP_URL on setup)
  - `settings` (Json, Nullable, placeholder for future customizations/integrations)
- **Relations**:
  - Has many `User`s (via `users`)
  - Has many `Role`s (via `roles`)
  - Has many `OrganizationUnit`s (via `organizationUnits`)
  - Has many `LearningGroup`s (via `learningGroups`)

### Organization Units (`organization_units`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `name` (String)
  - `parentId` (String, Nullable, Foreign Key self-relation)
  - `companyId` (String, Foreign Key to `companies.id`)
  - `deletedAt` (DateTime, Nullable, soft-deletion timestamp)
  - `permanentDeleteAt` (DateTime, Nullable, timestamp for permanent purging after 14 days)
  - `deletionBatchId` (String, UUID, Nullable, tracks multi-node batch soft-deletes)
  - `createdAt` (DateTime, Default: `now()`)
  - `updatedAt` (DateTime, Auto-updated)
- **Relations**:
  - Belongs to `Company` (via `companyId`)
  - Belongs to parent `OrganizationUnit` (optional, via `parentId`)
  - Has many child `OrganizationUnit`s (via self-relation)
  - Has many `Membership`s (via `memberships`)

### Learning Groups (`learning_groups`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `name` (String)
  - `parentGroupId` (String, Nullable, Foreign Key self-relation)
  - `companyId` (String, Foreign Key to `companies.id`)
  - `isTemporary` (Boolean, Default: `false`)
  - `expiresAt` (DateTime, Nullable)
  - `reminderSentAt` (DateTime, Nullable)
  - `deletedAt` (DateTime, Nullable, soft-deletion timestamp)
  - `permanentDeleteAt` (DateTime, Nullable, timestamp for permanent purging after 14 days)
  - `deletionBatchId` (String, UUID, Nullable)
  - `createdAt` (DateTime, Default: `now()`)
  - `updatedAt` (DateTime, Auto-updated)
- **Relations**:
  - Belongs to `Company` (via `companyId`)
  - Belongs to parent `LearningGroup` (optional, via `parentGroupId`)
  - Has many child `LearningGroup`s (via self-relation)
  - Has many `Membership`s (via `memberships`)

### Memberships (`memberships`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `userId` (String, Foreign Key to `users.id`)
  - `organizationUnitId` (String, Nullable, Foreign Key to `organization_units.id`)
  - `learningGroupId` (String, Nullable, Foreign Key to `learning_groups.id`)
  - `membershipType` (Enum: `MEMBER`, `MANAGER`)
  - `status` (Enum: `PENDING`, `ACTIVE`, `DISABLED`)
  - `source` (Enum: `MANUAL`, `SYSTEM`, `IMPORT`)
  - `createdById` (String, Foreign Key to `users.id`)
  - `deletedAt` (DateTime, Nullable, soft-deletion timestamp)
  - `deletionBatchId` (String, UUID, Nullable)
  - `createdAt` (DateTime, Default: `now()`)
  - `updatedAt` (DateTime, Auto-updated)
- **Indexes & Constraints**:
  - Unique index on `userId` + `organizationUnitId` where `deletedAt` is null
  - Unique index on `userId` + `learningGroupId` where `deletedAt` is null
  - Raw SQL CHECK constraint: `(organizationUnitId IS NOT NULL AND learningGroupId IS NULL) OR (organizationUnitId IS NULL AND learningGroupId IS NOT NULL)` (enforces exclusive FK pair)
- **Relations**:
  - Belongs to `User` as member (via `userId`)
  - Belongs to `User` as creator (via `createdById`)
  - Belongs to `OrganizationUnit` (optional, via `organizationUnitId`, cascade on delete)
  - Belongs to `LearningGroup` (optional, via `learningGroupId`, cascade on delete)

### Roles (`roles`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `name` (String)
  - `isProtected` (Boolean, Default: `false` — protected for Superuser row)
  - `parentRoleId` (String, Nullable, Foreign Key to `roles.id` self-relation)
  - `companyId` (String, Foreign Key to `companies.id`)
  - `createdAt` (DateTime, Default: `now()`)
  - `updatedAt` (DateTime, Auto-updated)
- **Relations**:
  - Belongs to `Company` (via `companyId`)
  - Belongs to `Role` (optional, parent role via `parentRoleId`)
  - Has many `Role`s (child roles via self-relation)
  - Has many `User`s (via `users`)
  - Has many `RolePermission`s (via `permissions`)

### Permissions (`permissions`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `module` (String)
  - `action` (String)
- **Indexes & Constraints**:
  - Unique composite index `permissions_module_action_idx` on `(module, action)`
- **Relations**:
  - Has many `RolePermission`s (via `roles`)

### Role Permissions (`role_permissions`)
- **Fields**:
  - `roleId` (String, Foreign Key to `roles.id`, Primary Key Part 1)
  - `permissionId` (String, Foreign Key to `permissions.id`, Primary Key Part 2)
- **Relations**:
  - Belongs to `Role` (via `roleId`)
  - Belongs to `Permission` (via `permissionId`)

### Sessions (`sessions`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `userId` (String, Foreign Key to `users.id`)
  - `createdAt` (DateTime, Default: `now()`)
  - `expiresAt` (DateTime)
  - `ipAddress` (String, Nullable)
  - `userAgent` (String, Nullable)
- **Relations**:
  - Belongs to `User` (via `userId`, cascade deletes on session)

### Tokens (`tokens`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `userId` (String, Foreign Key to `users.id`)
  - `tokenHash` (String, Unique, SHA-256 hash of raw token)
  - `purpose` (Enum: `INVITATION`, `PASSWORD_RESET`)
  - `expiresAt` (DateTime)
  - `usedAt` (DateTime, Nullable, null = unconsumed)
  - `createdAt` (DateTime, Default: `now()`)
- **Relations**:
  - Belongs to `User` (via `userId`, cascade deletes on token)

### Assignments (`assignments`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `companyId` (String, Foreign Key to `companies.id`)
  - `lessonId` (String, Foreign Key to `lessons.id`)
  - `assignmentType` (Enum: `IMMEDIATE`, `SCHEDULED`)
  - `scheduledFor` (DateTime, Nullable)
  - `dueDateDefaultDays` (Int, Nullable)
  - `isMandatory` (Boolean, Default: `false`)
  - `createdById` (String, Foreign Key to `users.id`)
  - `ownerId` (String, Foreign Key to `users.id`)
  - `status` (Enum: `DRAFT`, `SCHEDULED`, `ACTIVE`, `CANCELLED`, `ARCHIVED`, Default: `DRAFT`)
  - `courseAssignmentBatchId` (String, Nullable, UUID grouping assignments made for a Course)
  - `deletedAt` (DateTime, Nullable, soft-deletion timestamp)
  - `permanentDeleteAt` (DateTime, Nullable, timestamp for permanent purging after 14 days)
  - `deletionBatchId` (String, Nullable, UUID of soft-deletion batch)
  - `createdAt` (DateTime, Default: `now()`)
  - `updatedAt` (DateTime, Auto-updated)
- **Relations**:
  - Belongs to `Company` (via `companyId`)
  - Belongs to `Lesson` (via `lessonId`)
  - Belongs to `User` as creator (via `createdById`)
  - Belongs to `User` as owner (via `ownerId`)
  - Has many `AssignmentTarget`s (via `targets`)
  - Has many `UserAssignmentInstance`s (via `userAssignmentInstances`)

### Assignment Targets (`assignment_targets`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `assignmentId` (String, Foreign Key to `assignments.id`)
  - `userId` (String, Nullable, Foreign Key to `users.id`)
  - `organizationUnitId` (String, Nullable, Foreign Key to `organization_units.id`)
  - `learningGroupId` (String, Nullable, Foreign Key to `learning_groups.id`)
  - `createdAt` (DateTime, Default: `now()`)
- **Relations**:
  - Belongs to `Assignment` (via `assignmentId`, cascade on delete)
  - Belongs to `User` (via `userId`, cascade on delete)
  - Belongs to `OrganizationUnit` (via `organizationUnitId`, cascade on delete)
  - Belongs to `LearningGroup` (via `learningGroupId`, cascade on delete)

### User Assignment Instances (`user_assignment_instances`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `assignmentId` (String, Foreign Key to `assignments.id`)
  - `userId` (String, Foreign Key to `users.id`)
  - `status` (Enum: `DRAFT`, `SCHEDULED`, `ACTIVE`, `COMPLETED`, `CANCELLED`, `ARCHIVED`, Default: `ACTIVE`)
  - `dueDate` (DateTime, Nullable)
  - `startedAt` (DateTime, Nullable)
  - `completedAt` (DateTime, Nullable)
  - `progressPercent` (Int, Default: 0)
  - `deletedAt` (DateTime, Nullable, soft-deletion timestamp)
  - `permanentDeleteAt` (DateTime, Nullable, timestamp for permanent purging after 14 days)
  - `deletionBatchId` (String, Nullable, UUID of soft-deletion batch)
  - `lastReminderSentAt` (DateTime, Nullable, timestamp of last overdue email)
  - `createdAt` (DateTime, Default: `now()`)
  - `updatedAt` (DateTime, Auto-updated)
- **Indexes & Constraints**:
  - Unique composite index on `(assignmentId, userId)`
- **Relations**:
  - Belongs to `Assignment` (via `assignmentId`, cascade on delete)
  - Belongs to `User` (via `userId`, cascade on delete)
  - Has many `UserAssignmentInstanceSource`s (via `sources`)
  - Has many `ContentAttempt`s (via `contentAttempts`)

### User Assignment Instance Sources (`user_assignment_instance_sources`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `userAssignmentInstanceId` (String, Foreign Key to `user_assignment_instances.id`)
  - `sourceType` (Enum: `MANUAL`, `ORGANIZATION_UNIT`, `LEARNING_GROUP`, `SELF_ASSIGNED`, `MANDATORY`, `API`)
  - `sourceOrganizationUnitId` (String, Nullable, Foreign Key to `organization_units.id`)
  - `sourceLearningGroupId` (String, Nullable, Foreign Key to `learning_groups.id`)
  - `createdAt` (DateTime, Default: `now()`)
- **Relations**:
  - Belongs to `UserAssignmentInstance` (via `userAssignmentInstanceId`, cascade on delete)
  - Belongs to `OrganizationUnit` (via `sourceOrganizationUnitId`, cascade on delete)
  - Belongs to `LearningGroup` (via `sourceLearningGroupId`, cascade on delete)

### Lessons (`lessons`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `companyId` (String, Foreign Key to `companies.id`)
  - `title` (String)
  - `status` (Enum: `DRAFT`, `PUBLISHED`, `ARCHIVED`, Default: `DRAFT`)
  - `version` (Int, Default: 1)
  - `prerequisiteLessonId` (String, Nullable, Foreign Key self-relation)
  - `completionRule` (Enum: `MARKED_COMPLETE`, `SCORM_CRITERIA`)
  - `contentId` (String, Nullable, Foreign Key to `contents.id`)
  - `createdAt` (DateTime, Default: `now()`)
  - `updatedAt` (DateTime, Auto-updated)
- **Relations**:
  - Belongs to `Company` (via `companyId`)
  - Belongs to prerequisite `Lesson` (optional, via `prerequisiteLessonId`)
  - Belongs to `Content` package (optional, via `contentId`)
  - Has many `CourseLesson` associations (via `courseLessons`)
  - Has many `Assignment`s (via `assignments`)

### Courses (`courses`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `companyId` (String, Foreign Key to `companies.id`)
  - `title` (String)
  - `status` (Enum: `DRAFT`, `PUBLISHED`, Default: `DRAFT`)
  - `createdAt` (DateTime, Default: `now()`)
  - `updatedAt` (DateTime, Auto-updated)
- **Relations**:
  - Belongs to `Company` (via `companyId`)
  - Has many `CourseLesson` associations (via `courseLessons`)

### Course Lessons (`course_lessons`)
- **Fields**:
  - `courseId` (String, Foreign Key to `courses.id`, Primary Key Part 1)
  - `lessonId` (String, Foreign Key to `lessons.id`, Primary Key Part 2)
  - `order` (Int, sequence order)
- **Relations**:
  - Belongs to `Course` (via `courseId`, cascade on delete)
  - Belongs to `Lesson` (via `lessonId`, cascade on delete)

### Contents (`contents`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `companyId` (String, Foreign Key to `companies.id`)
  - `providerType` (Enum: `SCORM_1_2`)
  - `title` (String)
  - `description` (String, Nullable, Text)
  - `categoryId` (String, Nullable, Foreign Key to `content_categories.id`)
  - `author` (String, Nullable)
  - `language` (String, Nullable)
  - `version` (Int, Default: 1)
  - `contentGroupId` (String, grouping multiple versions of the same package)
  - `status` (Enum: `DRAFT`, `PUBLISHED`, `ARCHIVED`, Default: `DRAFT`)
  - `storagePathZip` (String, location of the zipped package)
  - `storagePathExtracted` (String, location of the extracted package files)
  - `launchFile` (String, file path to load in iframe)
  - `manifestData` (Json, metadata extracted from imsmanifest.xml)
  - `thumbnailPath` (String, Nullable)
  - `createdById` (String, Foreign Key to `users.id`)
  - `createdAt` (DateTime, Default: `now()`)
  - `updatedAt` (DateTime, Auto-updated)
- **Relations**:
  - Belongs to `Company` (via `companyId`)
  - Belongs to `ContentCategory` (optional, via `categoryId`)
  - Belongs to `User` as creator (via `createdById`)
  - Has many `ContentTag`s (via `tags`)
  - Has many `Lesson`s (via `lessons`)

### Content Tags (`content_tags`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `contentId` (String, Foreign Key to `contents.id`)
  - `tag` (String)
- **Relations**:
  - Belongs to `Content` (via `contentId`, cascade on delete)

### Content Categories (`content_categories`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `companyId` (String, Foreign Key to `companies.id`)
  - `name` (String)
  - `parentCategoryId` (String, Nullable, Foreign Key self-relation)
  - `createdAt` (DateTime, Default: `now()`)
  - `updatedAt` (DateTime, Auto-updated)
- **Relations**:
  - Belongs to `Company` (via `companyId`)
  - Belongs to parent `ContentCategory` (optional, via `parentCategoryId`)
  - Has many child `ContentCategory`s (via self-relation, restrict delete if children exist)
  - Has many `Content`s (via `contents`)

### Content Attempts (`content_attempts`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `userAssignmentInstanceId` (String, Foreign Key to `user_assignment_instances.id`)
  - `attemptNumber` (Int)
  - `lessonStatus` (Enum: `PASSED`, `COMPLETED`, `FAILED`, `INCOMPLETE`, `BROWSED`, `NOT_ATTEMPTED`)
  - `scoreRaw` (Decimal, Nullable)
  - `scoreMin` (Decimal, Nullable)
  - `scoreMax` (Decimal, Nullable)
  - `sessionTimeSeconds` (Int, Nullable)
  - `lessonLocation` (String, Nullable)
  - `suspendData` (String, Nullable, Text)
  - `objectives` (Json, Nullable)
  - `interactions` (Json, Nullable)
  - `startedAt` (DateTime, Nullable)
  - `finishedAt` (DateTime, Nullable)
  - `createdAt` (DateTime, Default: `now()`)
  - `updatedAt` (DateTime, Auto-updated)
- **Relations**:
  - Belongs to `UserAssignmentInstance` (via `userAssignmentInstanceId`, cascade on delete)

### Audit Logs (`audit_logs`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `companyId` (String, Foreign Key to `companies.id`)
  - `entityType` (String)
  - `entityId` (String)
  - `action` (String)
  - `actorId` (String, Nullable, Foreign Key to `users.id`)
  - `metadata` (Json, Nullable)
  - `createdAt` (DateTime, Default: `now()`)
- **Relations**:
  - Belongs to `Company` (via `companyId`, cascade on delete)
  - Belongs to `User` as actor (via `actorId`, set null on delete)


---

## 🟢 Schema Registry (v1.8.0)

- **v1.1.0**: Relational schema setup with Prisma and MariaDB (tables: `users`, `companies`, `sessions`), implementing superuser constraint and setup wizard persistence.
- **v1.2.0**: Nullable username, added `email` field to `users`, added SQL CHECK constraint `username IS NOT NULL OR email IS NOT NULL`, and added `tokens` table with SHA-256 token hash and enum purposes.
- **v1.3.0**: Made `passwordHash` and `recoveryEmail` fields nullable for pending invited users and superuser-specific isolation respectively. Added raw SQL CHECK constraint enforcing `passwordHash` presence for active users.
- **v1.4.0**: Added Role, Permission, and RolePermission tables to establish first-class role-based access control (RBAC). Linked Users to Roles and added inheritance control to Companies.
- **v1.5.0**: Synchronized company-level settings toggles (`roleInheritanceEnabled`) and mapped permission relationships across all session and page lifecycles.
- **v1.6.0**: Multi-Tenant Organization Model MVP. Added `OrganizationUnit`, `LearningGroup`, and `Membership` models. Extended `Company` with `domain` and `settings`. Included strict CHECK constraints and cascading soft-delete triggers.
- **v1.7.0**: Learning Assignments & Target Resolution Engine. Added `Assignment`, `AssignmentTarget`, `UserAssignmentInstance`, `UserAssignmentInstanceSource`, and `AuditLog` models. Enhanced `UserAssignmentInstance` with `last_reminder_sent_at` column for automated notification tracking. Added cascading soft-deletes and scheduled cleanup tasks.
- **v1.8.0 (Current)**: Content Engine SCORM 1.2 MVP. Added `Content`, `ContentTag`, `ContentCategory`, and `ContentAttempt` models. Associated `Lesson` model with optional SCORM `Content`. Mapped attempts directly to existing `UserAssignmentInstance`. Added `course_lessons`, `courses`, and `lessons` schemas documentation to Database index.

