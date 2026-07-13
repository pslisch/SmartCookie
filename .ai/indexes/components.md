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
- **Purpose**: Global viewport layout skeleton.
- **Props**:
  - `children`: `React.ReactNode` - Content inside the visual body.
- **Used By**: `src/App.tsx`
- **Dependencies**: React

### 2. `Navbar`
- **Location**: `src/shared/components/layout/Navbar.tsx`
- **Purpose**: Dynamic responsive navigation bar.
- **Props**:
  - `currentTab`: `Tab` - Active enum identifier.
  - `onTabChange`: `(tab: Tab) => void` - Selection callback.
  - `appName`: `string` - Programmatically formatted application name.
- **Used By**: `src/App.tsx`
- **Dependencies**: Lucide React, Motion, React

### 3. `Footer`
- **Location**: `src/shared/components/layout/Footer.tsx`
- **Purpose**: Bottom structural footer displaying version tags and dynamic copyright hover states.
- **Props**: None (Self-contained).
- **Used By**: `src/App.tsx`
- **Dependencies**: React, Motion, `package.json` metadata

### 4. `LanguageSwitcher`
- **Location**: `src/shared/components/layout/LanguageSwitcher.tsx`
- **Purpose**: Keyboard-accessible language selection drop-down with click-outside and escape-key dismissal.
- **Props**: None (Self-contained).
- **Used By**: `src/shared/components/layout/Navbar.tsx`
- **Dependencies**: React, Lucide React, `react-i18next`

### 5. `AppGate`
- **Location**: `src/shared/components/AppGate.tsx`
- **Purpose**: Main orchestrator and security state machine for app entry. Intercepts views, verifies setup status, validates sessions, and renders either setup wizard, login page, or primary workspace children.
- **Props**:
  - `children`: `React.ReactNode` - Child layouts authorized to render after login.
- **Used By**: `src/App.tsx`
- **Dependencies**: React, `react-i18next`, `motion/react`, `SetupWizard`, `Login`, Lucide Icons

### 6. `SetupWizard`
- **Location**: `src/features/auth/pages/SetupWizard.tsx`
- **Purpose**: A localized, multi-step layout directing system administrators to register a primary superuser account and root company entity.
- **Props**:
  - `step`: `'superuser' | 'company'` - Active step matching database setup status.
  - `onSuperuserSubmit`: `(username, password, recoveryEmail) => Promise<void>` - Superuser creation trigger.
  - `onCompanySubmit`: `(name, contactInfo) => Promise<void>` - Company registration trigger.
- **Used By**: `src/shared/components/AppGate.tsx`
- **Dependencies**: React, `react-i18next`, `motion/react`, Lucide Icons

### 7. `Login`
- **Location**: `src/features/auth/pages/Login.tsx`
- **Purpose**: Secure administrator and user credentials form. Integrates with attempted-page storage for automatic redirect-back behavior.
- **Props**:
  - `onLoginSuccess`: `() => Promise<void>` - Refresh trigger on session creation.
- **Used By**: `src/shared/components/AppGate.tsx`
- **Dependencies**: React, `react-i18next`, `motion/react`, Lucide Icons

### 8. `Settings`
- **Location**: `src/features/rbac/pages/Settings.tsx`
- **Purpose**: Superuser-only settings and configuration panel showing an empty state until further configurable system features are added.
- **Props**: None (Self-contained).
- **Used By**: `src/App.tsx`
- **Dependencies**: React, `react-i18next`, `motion/react`, `useAuth`, Lucide Icons

### 9. `RoleManagement`
- **Location**: `src/features/rbac/pages/RoleManagement.tsx`
- **Purpose**: Full-featured interactive administrator interface to view roles, create/duplicate/delete custom roles, map parent inheritance options, and configure modular permission grids.
- **Props**: None (Self-contained).
- **Used By**: `src/features/management/pages/Management.tsx`
- **Dependencies**: React, `react-i18next`, Lucide Icons, Fetch API, CSRF Token helper

### 10. `Management`
- **Location**: `src/features/management/pages/Management.tsx`
- **Purpose**: Centralized administration and oversight hub presenting gated cards for Role Management, User & Group Management, and Lesson Assignments.
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
- **Purpose**: Create minimal Lesson and Course stub drafts, toggle publication status, and order lessons inside courses.
- **Props**: None (Self-contained).
- **Used By**: `src/features/management/pages/Management.tsx`
- **Dependencies**: React, `react-i18next`, `motion/react`, Lucide Icons

### 13. `MyLessons`
- **Location**: `src/features/lessons/pages/MyLessons.tsx`
- **Purpose**: Comprehensive dashboard for learners to track and complete assigned studies, view due dates, and manage their self-assigned courses/lessons list.
- **Props**: None (Self-contained).
- **Used By**: `src/App.tsx` (via hash navigation)
- **Dependencies**: React, `motion/react`, Lucide Icons, Fetch API

### 14. `Catalog`
- **Location**: `src/features/catalog/pages/Catalog.tsx`
- **Purpose**: Interactive course and lesson curriculum catalog for users to discover and self-assign new learning content.
- **Props**: None (Self-contained).
- **Used By**: `src/App.tsx` (via hash navigation)
- **Dependencies**: React, `motion/react`, Lucide Icons, Fetch API

### 15. `AssignmentInstanceReport`
- **Location**: `src/features/assignments/components/AssignmentInstanceReport.tsx`
- **Purpose**: Rich reporting interface and data visualizer displaying progress, completion statistics, overdue tracking, and member completion records for a specific assignment.
- **Props**:
  - `assignmentId`: `string` - ID of the assignment to view reports for.
  - `assignmentTitle`: `string` - Title of the assignment.
  - `onClose`: `() => void` - Close handler callback.
- **Used By**: `src/features/assignments/pages/AssignmentManagement.tsx`
- **Dependencies**: React, `motion/react`, Lucide Icons, Recharts (for analytics visualization)

### 16. `ProfileFieldInput`
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

### 17. `UsersTab`
- **Location**: `src/features/organization/components/UsersTab.tsx`
- **Purpose**: A comprehensive user administration panel providing robust search, multi-faceted filtering (status, roles, organization units), side-sheet detail editing, single-user password reset, and archive/restore operations.
- **Props**: None (Self-contained tab).
- **Used By**: `src/features/organization/pages/UserGroupManagement.tsx`
- **Dependencies**: React, `lucide-react`, `react-i18next`, `ProfileFieldInput`, `BulkImportWizard`

### 18. `BulkImportWizard`
- **Location**: `src/features/organization/components/BulkImportWizard.tsx`
- **Purpose**: Multi-step wizard layout for uploading a CSV file to bulk import user accounts. Provides a download template button, a beautiful drag-and-drop file selector, per-row validation reporting, and an all-or-nothing confirmation step.
- **Props**:
  - `onClose`: `() => void` - Triggers closing the wizard modal.
  - `onSuccess`: `() => void` - Callback triggered upon successful database persistence of the batch import.
- **Used By**: `src/features/organization/components/UsersTab.tsx`
- **Dependencies**: React, `lucide-react`, `react-i18next`

### 19. `FieldBuilder`
- **Location**: `src/features/profiles/pages/FieldBuilder.tsx`
- **Purpose**: Dynamic category and custom field management interface allowing administrator configuration of profile attribute mappings, orderings, types, regex validation rules, default values, and role-based editing authorizations.
- **Props**: None (Self-contained panel).
- **Used By**: `src/features/rbac/pages/Settings.tsx`
- **Dependencies**: React, Lucide Icons, `motion/react`, `react-i18next`

### 20. `RequiredFieldReminder`
- **Location**: `src/shared/components/RequiredFieldReminder.tsx`
- **Purpose**: Dismissible amber layout banner reminding logged-in end-users of missing mandatory fields, calculating completion percentages live and redirecting users directly to the profile view.
- **Props**:
  - `onNavigateToProfile`: `() => void` - Callback trigger when redirection is clicked.
- **Used By**: `src/App.tsx`
- **Dependencies**: React, Lucide Icons, `motion/react`, `react-i18next`



