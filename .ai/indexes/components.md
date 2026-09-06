# Component Index

This index logs all reusable UI, layout, and presentation components engineered within the SmartCookie repository.

---

## 🧩 Component Schema

Every registered component should include:
- **Location**: Relative path of the file.
- **Purpose**: Short, focused explanation of responsibilities.
- **Props**: Key parameters, interfaces, and expected triggers.
- **Used By**: Parent components or layouts invoking this block.
- **Dependencies**: Icons, libraries, or hooks needed.

---

## 📦 Active Component Registry

### 1. `Shell`
- **Location**: `src/shared/components/layout/Shell.tsx`
- **Purpose**: Global viewport layout skeleton. Migrated to theme tokens (`bg-bg-app`, `text-text-body`).
- **Props**:
  - `children`: `React.ReactNode` - Content inside the visual body.
- **Used By**: `src/App.tsx`
- **Dependencies**: React

### 2. `Navbar`
- **Location**: `src/shared/components/layout/Navbar.tsx`
- **Purpose**: Dynamic responsive navigation bar. Migrated to theme tokens (`border-card-border`, `bg-nav-bg`, `text-nav-text`, `text-nav-text-active`, `hover:bg-bg-subtle`).
- **Props**:
  - `currentTab`: `Tab` - Active enum identifier.
  - `onTabChange`: `(tab: Tab) => void` - Selection callback.
  - `appName`: `string` - Programmatically formatted application name.
- **Used By**: `src/App.tsx`
- **Dependencies**: Lucide React, Motion, React

### 3. `Footer`
- **Location**: `src/shared/components/layout/Footer.tsx`
- **Purpose**: Bottom structural footer displaying version tags and dynamic copyright hover states. Migrated to theme tokens (`border-card-border`, `bg-nav-bg`, `text-text-muted`, `hover:text-text-heading`).
- **Props**: None (Self-contained).
- **Used By**: `src/App.tsx`
- **Dependencies**: React, Motion, `package.json` metadata

### 4. `LanguageSwitcher`
- **Location**: `src/shared/components/layout/LanguageSwitcher.tsx`
- **Purpose**: Keyboard-accessible language selection drop-down with click-outside and escape-key dismissal. Migrated to theme tokens (`border-card-border`, `bg-card-bg`, `text-text-body`, `hover:bg-card-header-bg`).
- **Props**: None (Self-contained).
- **Used By**: `src/shared/components/layout/Navbar.tsx`
- **Dependencies**: React, Lucide React, `react-i18next`

### 5. `AppGate`
- **Location**: `src/shared/components/AppGate.tsx`
- **Purpose**: Main orchestrator and security state machine for app entry. Intercepts views, verifies setup status, validates sessions, and renders either setup wizard, login page, or primary workspace children. Loading/error states migrated to theme tokens (`bg-bg-app`, `text-text-heading`, `btn-primary-*`).
- **Props**:
  - `children`: `React.ReactNode` - Child layouts authorized to render after login.
- **Used By**: `src/App.tsx`
- **Dependencies**: React, `react-i18next`, `motion/react`, `SetupWizard`, `Login`, Lucide Icons

### 6. `SetupWizard`
- **Location**: `src/features/auth/pages/SetupWizard.tsx`
- **Purpose**: A localized, multi-step layout directing system administrators to register a primary superuser account, configure MFA, create primary company, set up email SMTP details, configure OIDC / Entra ID, seed divisions/OUs, and seed default roles.
- **Props**:
  - `step`: `'superuser' | 'superuser-mfa' | 'company' | 'mail-config' | 'identity-provider' | 'org-structure' | 'role-templates'` - Active step matching database setup status.
  - `onSuperuserSubmit`: `(username, password, recoveryEmail) => Promise<void>` - Superuser creation trigger.
  - `onCompanySubmit`: `(name, contactInfo) => Promise<void>` - Company registration trigger.
  - `onMfaSubmit`: `(secret, code) => Promise<{ recoveryCodes: string[] }>` - Verification and recovery code generation.
  - `onMailConfigSubmit`: `(config) => Promise<void>` - SMTP saving.
  - `onMailConfigSkip`: `() => Promise<void>` - SMTP bypass.
  - `onIdentityProviderSubmit`: `(config) => Promise<void>` - OIDC/Entra saving.
  - `onIdentityProviderSkip`: `() => Promise<void>` - OIDC/Entra bypass.
- **Used By**: `src/shared/components/AppGate.tsx`
- **Dependencies**: React, `react-i18next`, `motion/react`, `qrcode`, Lucide Icons

### 7. `Login`
- **Location**: `src/features/auth/pages/Login.tsx`
- **Purpose**: Secure administrator and user credentials form. Integrates with attempted-page storage for automatic redirect-back behavior.
- **Props**:
  - `onLoginSuccess`: `() => Promise<void>` - Refresh trigger on session creation.
- **Used By**: `src/shared/components/AppGate.tsx`
- **Dependencies**: React, `react-i18next`, `motion/react`, Lucide Icons

### 8. `Settings`
- **Location**: `src/features/rbac/pages/Settings.tsx`
- **Purpose**: Superuser-only settings and configuration panel showing an empty state until further configurable system features are added. Migrated to theme tokens (`bg-card-bg`, `border-card-border`, `text-text-heading`, `text-text-muted`).
- **Props**: None (Self-contained).
- **Used By**: `src/App.tsx`
- **Dependencies**: React, `react-i18next`, `motion/react`, `useAuth`, Lucide Icons

### 9. `RoleManagement`
- **Location**: `src/features/rbac/pages/RoleManagement.tsx`
- **Purpose**: Full-featured interactive administrator interface to view roles, create/duplicate/delete custom roles, map parent inheritance options, and configure modular permission grids. Migrated to theme tokens (`bg-card-bg`, `border-card-border`, `card-header-bg`, `btn-primary-*`, `status-*`, `text-*`).
- **Props**: None (Self-contained).
- **Used By**: `src/features/management/pages/Management.tsx`
- **Dependencies**: React, `react-i18next`, Lucide Icons, Fetch API, CSRF Token helper

### 10. `Management`
- **Location**: `src/features/management/pages/Management.tsx`
- **Purpose**: Centralized administration and oversight hub presenting gated cards for Role Management, User & Group Management, and Lesson Assignments. Migrated to theme tokens (`bg-card-bg`, `border-card-border`, `text-text-heading`, `text-text-muted`).
- **Props**: None (Self-contained).
- **Used By**: `src/App.tsx`
- **Dependencies**: React, `react-i18next`, `motion/react`, `useAuth`, `usePermission`, `RoleManagement`, `UserGroupManagement`, `AssignmentManagement`, `ContentManagement`, Lucide Icons

### 11. `AssignmentManagement`
- **Location**: `src/features/assignments/pages/AssignmentManagement.tsx`
- **Purpose**: Manage, dispatch, list, and cancel assignments with full role-based permissions gating, targets pickers (departments, cohorts, individual users), due dates, and mandatory indicators.
- **Props**: None (Self-contained).
- **Used By**: `src/features/management/pages/Management.tsx`
- **Dependencies**: React, `react-i18next`, `motion/react`, `usePermission`, Lucide Icons

### 12. `ContentManagement`
- **Location**: `src/features/assignments/pages/ContentManagement.tsx`
- **Purpose**: Unified Lessons and Course curriculum management page. Provides creation of Lesson and Course stub drafts, SCORM package upload integration via wizard, expandable lesson detail panels for SCORM-linked packages (supporting tagging, categories, publish/archive/restore status lifecycle, version history modal, and ZIP download), plus non-tracked SCORM preview tab launching and placeholder Edit actions.
- **Props**: None (Self-contained).
- **Used By**: `src/features/management/pages/Management.tsx`
- **Dependencies**: React, `react-i18next`, `motion/react`, `ContentImportWizard`, Lucide Icons

### 13. `ScormPreviewPlayer`
- **Location**: `src/features/content/components/ScormPreviewPlayer.tsx`
- **Purpose**: Full-screen SCORM 1.2 package preview player running in a separate tab without attempt tracking or database side effects. Injects an in-memory SCORM 1.2 `window.API` bridge into the preview iframe to support package interactivity cleanly.
- **Props**: None (extracts `contentId` parameter directly from URL path `/preview/content/:contentId`).
- **Used By**: `src/App.tsx` (intercepted via URL path)
- **Dependencies**: React, Lucide Icons, Fetch API

### 14. `MyLessons`
- **Location**: `src/features/lessons/pages/MyLessons.tsx`
- **Purpose**: Comprehensive dashboard for learners to track and complete assigned studies, view due dates, and manage their self-assigned courses/lessons list.
- **Props**: None (Self-contained).
- **Used By**: `src/App.tsx` (via hash navigation)
- **Dependencies**: React, `motion/react`, Lucide Icons, Fetch API

### 15. `Catalog`
- **Location**: `src/features/catalog/pages/Catalog.tsx`
- **Purpose**: Interactive course and lesson curriculum catalog for users to discover and self-assign new learning content.
- **Props**: None (Self-contained).
- **Used By**: `src/App.tsx` (via hash navigation)
- **Dependencies**: React, `motion/react`, Lucide Icons, Fetch API

### 16. `AssignmentInstanceReport`
- **Location**: `src/features/assignments/components/AssignmentInstanceReport.tsx`
- **Purpose**: Rich reporting interface and data visualizer displaying progress, completion statistics, overdue tracking, and member completion records for a specific assignment.
- **Props**:
  - `assignmentId`: `string` - ID of the assignment to view reports for.
  - `assignmentTitle`: `string` - Title of the assignment.
  - `onClose`: `() => void` - Close handler callback.
- **Used By**: `src/features/assignments/pages/AssignmentManagement.tsx`
- **Dependencies**: React, `motion/react`, Lucide Icons, Recharts (for analytics visualization)

### 17. `ProfileFieldInput`
- **Location**: `src/shared/components/ProfileFieldInput.tsx`
- **Purpose**: Dynamic shared input component that renders form controls per profile field type with automatic permission checks, client-side validations, and lock warnings.
- **Props**:
  - `field`: `ProfileFieldDefinition` - Metadata defining the profile field rules and types.
  - `value`: `string` - The current string representation of the value.
  - `onChange`: `(val: string) => void` - Callback to persist field changes.
  - `isOwner`: `boolean` (Optional) - Indicates if user is updating their own profile.
  - `userRoles`: `string[]` (Optional) - Viewing user's role identifiers.
  - `isSuperuser`: `boolean` (Optional) - Administrator bypass flag.
  - `disabled`: `boolean` (Optional) - Override force-disabled flag.
  - `onError`: `(error: string | null) => void` (Optional) - Notifies parent forms of dynamic validation state updates.
- **Used By**: Full Profile tab, User Management detail views
- **Dependencies**: React, Lucide Icons, `react-i18next`

### 18. `UsersTab`
- **Location**: `src/features/organization/components/UsersTab.tsx`
- **Purpose**: A comprehensive user administration panel providing robust search, multi-faceted filtering (status, roles, organization units), side-sheet detail editing, single-user password reset, and archive/restore operations. Migrated to theme tokens (`bg-card-bg`, `border-card-border`, `card-header-bg`, `text-*`, `status-*`, `btn-primary-*`).
- **Props**: None (Self-contained tab).
- **Used By**: `src/features/organization/pages/UserGroupManagement.tsx`
- **Dependencies**: React, `lucide-react`, `react-i18next`, `ProfileFieldInput`, `BulkImportWizard`

### 19. `BulkImportWizard`
- **Location**: `src/features/organization/components/BulkImportWizard.tsx`
- **Purpose**: Multi-step wizard layout for uploading a CSV file to bulk import user accounts. Provides a download template button, a beautiful drag-and-drop file selector, per-row validation reporting, and an all-or-nothing confirmation step. Migrated to theme tokens (`bg-card-bg`, `border-card-border`, `status-*`, `text-*`, `btn-primary-*`).
- **Props**:
  - `onClose`: `() => void` - Triggers closing the wizard modal.
  - `onSuccess`: `() => void` - Callback triggered upon successful database persistence of the batch import.
- **Used By**: `src/features/organization/components/UsersTab.tsx`
- **Dependencies**: React, `lucide-react`, `react-i18next`

### 20. `FieldBuilder`
- **Location**: `src/features/profiles/pages/FieldBuilder.tsx`
- **Purpose**: Dynamic category and custom field management interface allowing administrator configuration of profile attribute mappings, orderings, types, regex validation rules, default values, and role-based editing authorizations.
- **Props**: None (Self-contained panel).
- **Used By**: `src/features/rbac/pages/Settings.tsx`
- **Dependencies**: React, Lucide Icons, `motion/react`, `react-i18next`

### 21. `RequiredFieldReminder`
- **Location**: `src/shared/components/RequiredFieldReminder.tsx`
- **Purpose**: Dismissible amber layout banner reminding logged-in end-users of missing mandatory fields, calculating completion percentages live and redirecting users directly to the profile view.
- **Props**:
  - `onNavigateToProfile`: `() => void` - Callback trigger when redirection is clicked.
- **Used By**: `src/App.tsx`
- **Dependencies**: React, Lucide Icons, `motion/react`, `react-i18next`

### 22. `EntraSetupSteps`
- **Location**: `src/features/identity/components/EntraSetupSteps.tsx`
- **Purpose**: Multi-part sub-flow for OIDC / Microsoft Entra ID connection, displaying app registration guidance, copyable redirect callbacks, live test handshakes, API permission checking, sync strategy config, and attribute mappings. Migrated to theme tokens (`border-card-border`, `bg-card-bg`, `card-header-bg`, `text-*`, `status-*`, `btn-primary-*`).
- **Props**:
  - `onSave`: `(config) => Promise<void>` - Configuration submit trigger.
  - `onSkip`: `() => Promise<void>` - Skip action trigger.
- **Used By**: `src/features/auth/pages/SetupWizard.tsx`
- **Dependencies**: React, Lucide Icons, `motion/react`

### 23. `UserGroupManagement`
- **Location**: `src/features/organization/pages/UserGroupManagement.tsx`
- **Purpose**: Primary administration container page organizing Users, Learning Groups, Expiring Groups, and Organization Hierarchy tabs. Migrated to theme tokens (`bg-card-bg`, `border-card-border`, `text-*`, `link-primary`).
- **Props**: None.
- **Used By**: `src/features/management/pages/Management.tsx`
- **Dependencies**: React, `lucide-react`, `react-i18next`

### 24. `LearningGroupsTab`
- **Location**: `src/features/organization/components/LearningGroupsTab.tsx`
- **Purpose**: Administration view to manage permanent cohorts/learning groups, view membership counts, add new groups, edit names, and delete groups. Migrated to theme tokens (`bg-card-bg`, `border-card-border`, `card-header-bg`, `text-*`, `status-*`, `btn-primary-*`).
- **Props**: None.
- **Used By**: `src/features/organization/pages/UserGroupManagement.tsx`
- **Dependencies**: React, `lucide-react`, `react-i18next`

### 25. `ExpiringGroupsTab`
- **Location**: `src/features/organization/components/ExpiringGroupsTab.tsx`
- **Purpose**: Administration view to create time-bound groups with start and expiry dates, inspect membership status, and purge or extend expirations. Migrated to theme tokens (`bg-card-bg`, `border-card-border`, `card-header-bg`, `text-*`, `status-*`, `btn-primary-*`).
- **Props**: None.
- **Used By**: `src/features/organization/pages/UserGroupManagement.tsx`
- **Dependencies**: React, `lucide-react`, `react-i18next`

### 26. `OrganizationStructureTab`
- **Location**: `src/features/organization/components/OrganizationStructureTab.tsx`
- **Purpose**: Tree hierarchy visualization and management for company divisions, departments, and organizational units (OUs). Migrated to theme tokens (`bg-card-bg`, `border-card-border`, `card-header-bg`, `text-*`, `status-*`, `btn-primary-*`).
- **Props**: None.
- **Used By**: `src/features/organization/pages/UserGroupManagement.tsx`
- **Dependencies**: React, `lucide-react`, `react-i18next`

---

## 🎨 Theme & Branding Subsystem Components (v1.12.0)

> **System-Wide Design Token Migration (Task 8)**: Every existing component across all feature domains (`auth`, `lessons`, `catalog`, `management`, `organization`, `rbac`, `assignments`, `content`, `profiles`, `identity`, and shared layout components `Navbar`, `Footer`, `Shell`) was systematically refactored from hardcoded Tailwind color utilities (e.g., `bg-blue-600`, `text-slate-900`, `border-gray-200`) to semantic design tokens (`bg-btn-primary-bg`, `text-text-heading`, `border-card-border`, `bg-card-bg`, `text-link-primary`, etc.) generated via the Tailwind v4 `@theme` directive in `src/index.css`.

### 27. `ThemeManagement`
- **Location**: `src/features/theme/pages/ThemeManagement.tsx`
- **Purpose**: Administration dashboard listing tenant themes categorized by status (`ACTIVE`, `SCHEDULED`, `READY`, `DRAFT`), presenting status chips, template cloning modal, test mode launch/exit, lock collision warnings, deletion modals, and activation failure alert banners with dismiss actions.
- **Props**: None.
- **Used By**: `src/features/rbac/pages/Settings.tsx` (Theme tab)
- **Dependencies**: React, `lucide-react`, `motion/react`, `useThemeRuntime`, `usePermission`

### 28. `ThemeEditor`
- **Location**: `src/features/theme/pages/ThemeEditor.tsx`
- **Purpose**: Visual theme customizer with tabbed interface (`general`, `colors`, `fonts`), real-time split-screen preview, concurrent lock heartbeat engine, light/dark submode editing, per-token reset, and auto-saving drafts.
- **Props**: `themeId: string`, `onClose: () => void`
- **Used By**: `src/features/theme/pages/ThemeManagement.tsx`
- **Dependencies**: React, `lucide-react`, `motion/react`, `useThemeRuntime`

### 29. `ThemeTestBanner`
- **Location**: `src/features/theme/components/ThemeTestBanner.tsx`
- **Purpose**: Top sticky notification bar rendered when session-scoped test mode is active, showing the active test theme name and an instantaneous "Exit Test Mode" trigger.
- **Props**: None.
- **Used By**: `src/shared/components/layout/Shell.tsx`
- **Dependencies**: React, `lucide-react`, `useThemeRuntime`

### 30. `ColorEditorTab`
- **Location**: `src/features/theme/components/ColorEditorTab.tsx`
- **Purpose**: Semantic color manager presenting the 28 tokens grouped by domain (Navigation, Text, Buttons, Forms, Cards, Links, Status, Backgrounds), with quick search filtering, inline color pickers, hex & opacity inputs, light/dark mode editing, and reset-to-default actions.
- **Props**: `draft: ThemeDraft`, `mode: 'light' | 'dark'`, `onChange: (updates) => void`, `isReadOnly?: boolean`
- **Used By**: `src/features/theme/pages/ThemeEditor.tsx`
- **Dependencies**: React, `lucide-react`

### 31. `FontEditorTab`
- **Location**: `src/features/theme/components/FontEditorTab.tsx`
- **Purpose**: Typography slot mapper for 8 UI domains (`general`, `nav`, `headings`, `buttons`, `forms`, `cards`, `links`, `status`), displaying font selection dropdowns, specimen previews, and a button to open the `FontLibrary`.
- **Props**: `draft: ThemeDraft`, `onChange: (updates) => void`, `fonts: Font[]`, `onOpenFontLibrary: () => void`, `isReadOnly?: boolean`
- **Used By**: `src/features/theme/pages/ThemeEditor.tsx`
- **Dependencies**: React, `lucide-react`

### 32. `LivePreviewPane`
- **Location**: `src/features/theme/components/LivePreviewPane.tsx`
- **Purpose**: Realistic split-screen application mockup dynamically styled with current draft colors, typography, and base font size, with light/dark preview toggling and viewport controls.
- **Props**: `draft: ThemeDraft`, `mode: 'light' | 'dark'`, `baseFontSize: number`
- **Used By**: `src/features/theme/pages/ThemeEditor.tsx`
- **Dependencies**: React, `lucide-react`

### 33. `FontLibrary`
- **Location**: `src/features/theme/components/FontLibrary.tsx`
- **Purpose**: Modal dialog for managing uploaded custom fonts, featuring file drag-and-drop dropzone, font format validation (WOFF, WOFF2, TTF, OTF), fontkit metadata display (family, weight, style, format), specimen preview, and deletion with reference protection.
- **Props**: `isOpen: boolean`, `onClose: () => void`, `onFontUploaded: () => void`
- **Used By**: `src/features/theme/pages/ThemeEditor.tsx`, `src/features/theme/components/FontEditorTab.tsx`
- **Dependencies**: React, `lucide-react`, `motion/react`

### 34. `FontReplacementModal`
- **Location**: `src/features/theme/components/FontReplacementModal.tsx`
- **Purpose**: Confirmation dialog shown when deleting a font that is currently referenced by one or more themes, allowing administrators to select a replacement font before completing the deletion.
- **Props**: `fontToDelete: Font`, `affectedThemes: Array<{ id: string, name: string, groups: string[] }>`, `availableFonts: Font[]`, `onConfirm: (replacementFontId: string) => Promise<void>`, `onClose: () => void`
- **Used By**: `src/features/theme/components/FontLibrary.tsx`
- **Dependencies**: React, `lucide-react`

### 35. `ActivateScheduleModal`
- **Location**: `src/features/theme/components/ActivateScheduleModal.tsx`
- **Purpose**: Modal dialog enabling administrators to either activate a READY theme immediately or schedule future activation with a datetime picker and collision confirmation if another theme is scheduled.
- **Props**: `theme: Theme`, `isOpen: boolean`, `onClose: () => void`, `onActivated: () => void`
- **Used By**: `src/features/theme/pages/ThemeManagement.tsx`
- **Dependencies**: React, `lucide-react`



