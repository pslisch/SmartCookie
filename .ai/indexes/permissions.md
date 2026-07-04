# Permission Index

This index logs security roles, middleware checkpoints, and dynamic content visibilities within SmartCookie.

---

## 🔐 Permission Access Schema

Every permission profile should eventually list:
- **Permission**: Logical name of the lock.
- **Roles**: Authorized access levels.
- **Features using it**: Features checking this key prior to execution.

---

## 🟢 Access Profiles & Permission Layers (v1.5.0)

First-class Role, Permission, and RolePermission tables are fully established in the database schema. Access enforcement and middleware are active, gating all secure routes on the backend and controlling feature access on the frontend.

### 1. Permission Registry Schema
Every permission represents a logical action on a module:
- **`module`**: The business domain/system boundary (e.g., `users`, `lessons`, `roles`, `catalog`).
- **`action`**: The permitted operation on that module (e.g., `invite`, `manage`, `view`).
- **Format**: Referenced as `module:action` (e.g., `roles:manage`).

### 2. Hierarchical Single-Parent Inheritance Model
- If a role has a defined `parentRoleId` (points to another record in the `roles` table), and `Company.roleInheritanceEnabled` is active, the Permission Resolver dynamically crawls up the single-parent role tree.
- The user gains the union of permissions belonging directly to their assigned role, plus any permissions inherited from the parent role (and grandparent, recursively) up the tree.
- Inheritance loops/cycles are actively blocked during parent-role definition.

### 3. Superuser Bypass Rule
- Any user with `isSuperuser === true` bypasses all role and permission lookups completely.
- The `requirePermission` backend middleware and frontend `usePermission` hook immediately short-circuit to `true` for Superusers.

### 4. Active Permission Controls
| Module | Action | Purpose | Server Gate | Frontend Element |
| :--- | :--- | :--- | :--- | :--- |
| `users` | `invite` | Inviting new users to the organization | `POST /api/users/invite`, etc. | Invite user dialog controls |
| `users` | `reset-password` | Initiating passwords reset for others | `POST /api/users/:id/admin-reset-password` | Admin reset password trigger button |
| `roles` | `manage` | Full configuration of role registry, parent hierarchies, and system settings | `/api/roles/*`, `/api/company/settings` | **Settings** Navigation tab & Role Management editor |
