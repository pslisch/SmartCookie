# Dependency Index

This index catalogues dependencies mapped between visual pages, functional modules, and internal resources.

---

## 🔗 Dependency Map Schema

Each feature should eventually map:
- **Uses**: Internal components or helpers imported by this feature.
- **Used By**: Pages or blocks invoking this feature.
- **Database**: Schemas or tables utilized.
- **Services**: Services called.
- **Components**: Components rendered inside.
- **Routes**: Navigation pathways targeting this component.
- **Events**: Events dispatched.

---

## 🟢 Module Dependencies (v1.11.0)

### 1. Visual Navigation Bar
- **Uses**: `src/shared/types/index.ts`, `src/shared/hooks/usePermission.ts`, `src/shared/contexts/PreviewContext.tsx`, `LanguageSwitcher.tsx`, `QuickProfile.tsx`
- **Used By**: `src/App.tsx`, `src/shared/components/layout/Shell.tsx`
- **Database**: None
- **Services**: None
- **Components**: `LanguageSwitcher`, `QuickProfile`, `PreviewBanner`
- **Routes**: `my-lessons`, `catalog`, `management`, `settings`, `user-groups`, `profile`
- **Events**: None

### 2. MyLessons Student Hub
- **Uses**: React, Motion, Lucide icons, `src/shared/types/index.ts`, `ScormPlayer.tsx`
- **Used By**: `src/App.tsx`
- **Database**: `user_assignment_instances`, `assignments`, `lessons`, `courses`, `contents`, `content_attempts`
- **Services**: `AssignmentService`, `CompletionService`
- **Components**: `ScormPlayer`
- **Routes**: `my-lessons`
- **Events**: `scorm:cmi-commit`, `scorm:cmi-finish`

### 3. Curriculum Catalog
- **Uses**: React, Motion, Lucide icons, `src/shared/types/index.ts`
- **Used By**: `src/App.tsx`
- **Database**: `lessons`, `courses`, `assignments`, `user_assignment_instances`
- **Services**: `SelfAssignmentService`, `AssignmentService`
- **Components**: None
- **Routes**: `catalog`
- **Events**: None

### 4. Internationalization Engine (i18n)
- **Uses**: `i18next`, `react-i18next`, `i18next-browser-languagedetector`, `src/shared/i18n/locales/`
- **Used By**: App-wide UI components
- **Database**: None
- **Services**: Translation loading, detection, and persistence
- **Components**: `LanguageSwitcher`
- **Routes**: App-wide / global
- **Events**: `i18next.changeLanguage` triggers

### 5. Setup Wizard & System Initialization
- **Uses**: `src/shared/types/index.ts`, `src/features/identity/components/EntraSetupSteps.tsx`
- **Used By**: `src/shared/components/AppGate.tsx`
- **Database**: `companies`, `users`, `sessions`, `roles`, `permissions`, `organization_units`, `identity_provider_configs`
- **Services**: `SetupWizardService`, `RoleTemplatesService`, `OrganizationUnitService`, `MfaService`
- **Components**: `EntraSetupSteps`, `QRCode`
- **Routes**: `/setup` (via `AppGate`)
- **Events**: None

### 6. Authentication & Session Management
- **Uses**: `src/shared/types/index.ts`, `src/shared/hooks/usePermission.ts`
- **Used By**: `src/shared/components/AppGate.tsx`
- **Database**: `users`, `sessions`, `tokens`, `mfa_recovery_codes`, `companies`
- **Services**: `EmailPasswordAuthProvider`, `SessionHelper`, `MfaService`, `TokenService`, `UserInvitationService`
- **Components**: `Login.tsx`, `AcceptInvitation.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `ConfirmEmail.tsx`
- **Routes**: Public auth routes, `/activate`, `/reset-password`, `/accept-invitation`
- **Events**: `auth:user-invitation`, `auth:password-reset`

### 7. RBAC & Settings Area
- **Uses**: `src/shared/types/index.ts`, `src/shared/hooks/usePermission.ts`
- **Used By**: `src/App.tsx` (via `#settings` or `#role-management` tabs)
- **Database**: `roles`, `permissions`, `role_permissions`, `companies`
- **Services**: `RoleService`, `PermissionResolverService`, `RoleTemplatesService`
- **Components**: `RoleManagement.tsx`, `Settings.tsx`
- **Routes**: `settings`, `role-management`
- **Events**: Role modification audit logs

### 8. Organization & User Management Suite
- **Uses**: `src/shared/types/index.ts`, `src/shared/components/ProfileFieldInput.tsx`, `BulkImportWizard.tsx`
- **Used By**: `src/App.tsx` (via `#user-groups` tab)
- **Database**: `organization_units`, `learning_groups`, `memberships`, `users`, `profile_field_values`
- **Services**: `OrganizationUnitService`, `LearningGroupService`, `UserManagementService`, `BulkImportService`, `MembershipAssignmentHooksService`
- **Components**: `OrganizationStructureTab.tsx`, `LearningGroupsTab.tsx`, `ExpiringGroupsTab.tsx`, `UsersTab.tsx`, `BulkImportWizard.tsx`, `ProfileFieldInput.tsx`
- **Routes**: `user-groups`
- **Events**: `membership:assignment-reconcile`, `scheduler:temporary-group-expiration`

### 9. Learning Assignment Engine
- **Uses**: `src/shared/types/index.ts`, `src/shared/hooks/usePermission.ts`
- **Used By**: `src/features/management/pages/Management.tsx`, `AssignmentManagement.tsx`
- **Database**: `assignments`, `assignment_targets`, `user_assignment_instances`, `user_assignment_instance_sources`, `audit_logs`
- **Services**: `AssignmentService`, `TargetResolutionService`, `MaterializationService`, `CompletionService`, `MandatoryAssignmentService`
- **Components**: `CreateAssignmentModal.tsx`, `LessonSelectionList.tsx`, `AssignmentInstanceReport.tsx`
- **Routes**: `management` (Assignments sub-view), `assignment-management`
- **Events**: `scheduler:overdue-assignment-reminders`

### 10. SCORM Content Engine & Player
- **Uses**: `src/shared/types/index.ts`, `src/features/content/services/scormApiBridge.ts`
- **Used By**: `src/features/management/pages/Management.tsx`, `src/features/lessons/pages/MyLessons.tsx`
- **Database**: `contents`, `content_tags`, `content_categories`, `content_attempts`, `user_assignment_instances`
- **Services**: `ContentService`, `ContentAttemptService`, `ContentStorageService`, `ScormApiBridge`
- **Components**: `ContentLibrary.tsx`, `ContentImportWizard.tsx`, `ScormPlayer.tsx`
- **Routes**: `management` (Content sub-view), `content-library`
- **Events**: `scorm:cmi-commit`, `scorm:cmi-finish`

### 11. Profiles, Field Builder & Preferences
- **Uses**: `src/shared/types/index.ts`, `src/shared/components/ProfileFieldInput.tsx`, `src/shared/components/RequiredFieldReminder.tsx`
- **Used By**: `src/App.tsx`, `src/features/rbac/pages/Settings.tsx`
- **Database**: `profile_field_categories`, `profile_field_definitions`, `field_editable_by_roles`, `profile_field_values`, `notification_preferences`, `mfa_recovery_codes`
- **Services**: `ProfileFieldService`, `ProfileFieldValueService`, `MfaService`, `ImageUploadService`
- **Components**: `FieldBuilder.tsx`, `Profile.tsx`, `RequiredFieldReminder.tsx`, `ProfileFieldInput.tsx`
- **Routes**: `profile`, `field-builder`
- **Events**: `auth:email-change-verification`

### 12. Microsoft Entra ID Integration
- **Uses**: `src/shared/types/index.ts`
- **Used By**: `src/features/auth/pages/SetupWizard.tsx`, `src/features/rbac/pages/Settings.tsx`
- **Database**: `identity_provider_configs`, `entra_group_selections`, `sync_logs`, `users`, `organization_units`
- **Services**: `EntraSyncService`, `EntraGraphClient`, `EntraIdAuthProvider`, `EntraTokenValidator`
- **Components**: `EntraSetupSteps.tsx`
- **Routes**: Setup Wizard Step 4, Identity Settings tab
- **Events**: `identity:sync-failure-alert`

### 13. Preview as Role
- **Uses**: `src/shared/contexts/PreviewContext.tsx`, `src/shared/components/PreviewBanner.tsx`
- **Used By**: `src/shared/components/layout/Shell.tsx`, `src/shared/components/layout/Navbar.tsx`
- **Database**: `roles`, `role_permissions`
- **Services**: Permission resolver (backend `/api/preview/eligible-roles`)
- **Components**: `PreviewBanner.tsx`
- **Routes**: Layout-wide wrapper
- **Events**: In-memory React state toggle

---

## 🟡 Unused / Reserved Dependencies
- **Packages**: `@google/genai` (Platform-injected default, currently unused pending explicit AI feature requests).

