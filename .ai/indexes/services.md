# Service Index

This index acts as the central registry of all shared, stateful, or helper services.

---

## ⚙️ Service Specification Schema

Each reusable service should include:
- **Purpose**: Clear, modular responsibility description.
- **Consumers**: Visual elements or routines importing the instance.
- **Dependencies**: APIs, packages, or databases required.

---

## 🟢 Active Services (v1.7.0)

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

### 8. MfaService
- **Purpose**: Governs local multi-factor authentication setup, verification, recovery code administration, and disabling.
- **Consumers**: `auth.routes.ts`, `profile.routes.ts`
- **Dependencies**: Prisma, otplib, encryption

### 9. EntraGraphClient
- **Purpose**: Communicates with Microsoft Graph API, handles token exchanges (delegated & application), implements paginated response traversal, and rate limit retries with exponential backoff.
- **Consumers**: Microsoft Entra ID integration backend services, sync routines, and verification routes
- **Dependencies**: global fetch, Node.js buffer utilities

### 10. EmailService
- **Purpose**: Handles rendering and transmission of transaction notification emails, using database-defined company-specific SMTP settings first with secure decryption, falling back to process.env config if not defined.
- **Consumers**: Auth routes, user invitation service, user management service, profile service, scheduled tasks service
- **Dependencies**: Prisma, nodemailer, encryption



