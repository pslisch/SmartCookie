# Service Index

This index acts as the central registry of all shared, stateful, or helper services.

---

## ⚙️ Service Specification Schema

Each reusable service should include:
- **Purpose**: Clear, modular responsibility description.
- **Consumers**: Visual elements or routines importing the instance.
- **Dependencies**: APIs, packages, or databases required.

---

## 🟢 Active Services (v1.6.0)

### 1. SetupWizardService
- **Purpose**: Governs company initialization steps and superuser creation.
- **Consumers**: `setup.routes.ts`
- **Dependencies**: Prisma, bcrypt

### 2. EmailPasswordAuthProvider
- **Purpose**: Authenticates credentials, initiates and terminates secure sessions.
- **Consumers**: `auth.routes.ts`
- **Dependencies**: Prisma, bcrypt

### 3. UserInvitationService
- **Purpose**: Enforces secure invitations, activations, and admin-led password resets.
- **Consumers**: `users.routes.ts`
- **Dependencies**: Prisma, TokenService, EmailService

### 4. RoleService
- **Purpose**: Core engine for roles administration, hierarchy movement, cycle prevention, and duplication.
- **Consumers**: `roles.routes.ts`
- **Dependencies**: Prisma

### 5. OrganizationUnitService
- **Purpose**: Handles formal hierarchical division with 14-day soft-delete/restore window, child OUs reassignments, and manager roles.
- **Consumers**: `organizationUnits.routes.ts`
- **Dependencies**: Prisma, crypto

### 6. LearningGroupService
- **Purpose**: Manages nestable student cohort groups, manual member assignments, and 14-day soft-deletes.
- **Consumers**: `learningGroups.routes.ts`
- **Dependencies**: Prisma

### 7. ScheduledTasksService
- **Purpose**: Runs background periodic jobs for purging expired units, expiring temporary groups, and sending approaching expiration reminder emails.
- **Consumers**: Express entrypoint (`index.ts`)
- **Dependencies**: Prisma, EmailService
