# Database Index

This index describes the data models, entity relationships, and schemas supporting the backend databases.

---

## 🗄️ Database Schema Specification

### Users (`users`)
- **Fields**:
  - `id` (String, UUID, Primary Key)
  - `username` (String, Unique, Case-Insensitive)
  - `passwordHash` (String)
  - `isSuperuser` (Boolean, Default: `false`)
  - `recoveryEmail` (String)
  - `companyId` (String, Nullable, Foreign Key to `companies.id`)
  - `status` (Enum: `PENDING`, `ACTIVE`, `DISABLED`, `ARCHIVED`, `LOCKED`, Default: `ACTIVE`)
  - `createdAt` (DateTime, Default: `now()`)
  - `updatedAt` (DateTime, Auto-updated)
- **Indexes & Constraints**:
  - Unique constraint on `username`
  - Unique index `users_is_superuser_unique_idx` on database-level virtual column `is_superuser_unique` (guarantees at most one superuser exists)
- **Relations**:
  - Belongs to `Company` (optional, via `companyId`)
  - Has many `Session`s (via `sessions`)

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

---

## 🟢 Schema Registry (v1.1.0)

- **v1.1.0 (Current)**: Relational schema setup with Prisma and MariaDB (tables: `users`, `companies`, `sessions`), implementing superuser constraint and setup wizard persistence.
