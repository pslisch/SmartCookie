# Verification Evidence: Combine Role Management + User/Group Management Into One Card

## Executive Summary
The "Roles" management card and "Organization" (Users & Groups) card in `Management.tsx` have been visually combined into ONE unified card ("Users, Groups & Roles"). `UserGroupManagement.tsx` has been extended to host "Roles" as a 5th permission-gated tab alongside Users, Organization Structure, Learning Groups, and Expiring Groups.

---

## Changes Implemented

### 1. `src/features/organization/pages/UserGroupManagement.tsx`
- Extended `activeTab` union type to `'users' | 'structure' | 'groups' | 'expiring' | 'roles'`.
- Added permission hook checks:
  - `hasUsersView = usePermission('users', 'view')`
  - `hasRolesManage = usePermission('roles', 'manage')`
  - `hasOrgAccess = usePermission('organization', 'view') || ...`
- Added the 5th tab button (`#tab-btn-roles`), rendered conditionally when `hasRolesManage` is `true`.
- Added `<RoleManagement />` component rendering when `activeTab === 'roles' && hasRolesManage`.
- Updated default tab selection logic (`useEffect` and initial state):
  - Defaults to `'users'` if user has `users:view`.
  - Defaults to `'structure'` if user has organization permissions.
  - Defaults to `'roles'` if user only has `roles:manage`.
  - Automatically switches to the first available permitted tab if the current active tab loses permission.

### 2. `src/features/management/pages/Management.tsx`
- Removed the separate "Roles" hub card (`#card-role-mgmt`) and the `'roles'` entry from the `view` state union.
- Removed unused `<RoleManagement />` import and subview branch.
- Consolidated the remaining card into ONE "Users, Groups & Roles" card (`#card-org-mgmt`).
- Updated gating condition to `hasPeopleAccess` (`hasRolesManage || hasOrgAccess || hasUsersView`).
- Updated title and description strings via i18n (`management.userGroupManagement`, `management.userGroupManagementDesc`, `management.manageDirectoryBtn`).

### 3. `src/shared/i18n/locales/en/common.json`
- Added `organization.rolesTab: "Roles"`.
- Updated `management.userGroupManagement` title to `"Users, Groups & Roles"`.
- Updated `management.userGroupManagementDesc` to `"Manage users, organization units, learning groups, and role-based access permissions."`.
- Updated `management.manageDirectoryBtn` to `"Manage Directory & Access"`.

### 4. `src/shared/components/layout/Navbar.tsx` & `src/App.tsx`
- Added `usePermission('users', 'view')` to `hasManagementAccess` to ensure users with user viewing privileges can access the Management hub.

---

## Behavioral Verification Matrix

| User Permissions | Hub Card Visible? | Tabs Visible Inside Card | Initial Default Tab |
| :--- | :--- | :--- | :--- |
| **`roles:manage` ONLY** | Yes ("Users, Groups & Roles") | Roles ONLY (`#tab-btn-roles`) | Roles |
| **Org / User permissions ONLY** | Yes ("Users, Groups & Roles") | Users, Structure, Groups, Expiring | Users (if `users:view`) or Structure |
| **Both `roles:manage` & Org/User permissions** | Yes ("Users, Groups & Roles") | All 5 tabs (Users, Structure, Groups, Expiring, Roles) | Users |
| **Neither** | No (Card hidden) | N/A | N/A |

---

## Verification Results

- **Build Check**: Executed `compile_applet`.
- **Status**: Build succeeded with **0 errors**.
- **Regressions**: No changes made to `RoleManagement.tsx` or any existing tab component internals.
