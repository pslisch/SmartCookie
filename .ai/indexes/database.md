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
- **Relations**:
  - Has many `User`s (via `users`)
  - Has many `Role`s (via `roles`)

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

---

## 🟢 Schema Registry (v1.5.0)

- **v1.1.0**: Relational schema setup with Prisma and MariaDB (tables: `users`, `companies`, `sessions`), implementing superuser constraint and setup wizard persistence.
- **v1.2.0**: Nullable username, added `email` field to `users`, added SQL CHECK constraint `username IS NOT NULL OR email IS NOT NULL`, and added `tokens` table with SHA-256 token hash and enum purposes.
- **v1.3.0**: Made `passwordHash` and `recoveryEmail` fields nullable for pending invited users and superuser-specific isolation respectively. Added raw SQL CHECK constraint enforcing `passwordHash` presence for active users.
- **v1.4.0**: Added Role, Permission, and RolePermission tables to establish first-class role-based access control (RBAC). Linked Users to Roles and added inheritance control to Companies.
- **v1.5.0 (Current)**: Synchronized company-level settings toggles (`roleInheritanceEnabled`) and mapped permission relationships across all session and page lifecycles.

