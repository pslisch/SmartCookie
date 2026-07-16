# Microsoft Entra ID Integration Feature

This feature module implements the backend synchronization and validation services for connecting a company's SmartCookie LMS with Microsoft Entra ID (formerly Azure AD).

## 🚀 Capabilities
- **Connection Diagnostics**: Validates Entra tenant ID, client ID, and client secret credentials, inspecting scopes and verifying the presence of `User.Read.All` and `Group.Read.All` application roles inside JWT tokens.
- **Directory Synchronization**: Pulls users and organizational groups from Microsoft Entra ID and reconciles them with local user profiles and organization units.
- **Selective Overwrite Engine**: Respects local overrides! Sync handles profile fields with `externalSyncLocked = true` differently than user-overridden ones, keeping manually customized profile pictures (`profilePictureManuallySet`) secure.
- **Automated Sync Failures Notification**: Emails LMS Managers holding the `identity-providers:view-logs` permission upon completely failed sync runs.

## 🔑 Permissions & Security
- `identity-providers:configure`: Allows configuring Entra credentials (Superusers only).
- `identity-providers:view-config`: Read-only access to connection metadata, masking the client secret.
- `identity-providers:view-logs`: Read and download sync logs history.
- `identity-providers:manual-sync`: Instantly trigger a background directory synchronization.

## 🛠️ Design Decisions
- **Settings, Not Setup Wizard**: To prevent high-friction setup, Entra setup is kept in the Settings panel rather than forcing it during the initial Setup Wizard.
- **Dual-Permission-Type OAuth Validation**: Tests connection credentials by fetching a token directly from Azure's token endpoint and evaluating decoded JWT application permissions.
- **Organization Units Reconciliation**: Automatically maps Entra security groups as `OrganizationUnit` entities with a `syncSource` of `ENTRA_SYNC`, while preserving manual groups with `syncSource = MANUAL`.

## 📦 Dependencies
- `@prisma/client`
- `@google/genai` (platform)
- `node-fetch` / standard HTTPS
- `nodemailer`
