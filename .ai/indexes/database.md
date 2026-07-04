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
  - Has many `Session`s (via `sessions`)
  - Has many `Token`s (via `tokens`)

### Companies (`companies`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `name` (String)
  - `contactInfo` (String)
  - `setupCompletedAt` (DateTime, Nullable, set when setup wizard completes)
- **Relations**:
  - Has many `User`s (via `users`)

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

## 🟢 Schema Registry (v1.3.0)

- **v1.1.0**: Relational schema setup with Prisma and MariaDB (tables: `users`, `companies`, `sessions`), implementing superuser constraint and setup wizard persistence.
- **v1.2.0**: Nullable username, added `email` field to `users`, added SQL CHECK constraint `username IS NOT NULL OR email IS NOT NULL`, and added `tokens` table with SHA-256 token hash and enum purposes.
- **v1.3.0 (Current)**: Made `passwordHash` and `recoveryEmail` fields nullable for pending invited users and superuser-specific isolation respectively. Added raw SQL CHECK constraint enforcing `passwordHash` presence for active users.

