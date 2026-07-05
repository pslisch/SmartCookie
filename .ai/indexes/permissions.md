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
| `users` | `create` | Inviting new users/creating accounts | `POST /api/users/invite` | Invite user dialog controls |
| `users` | `edit` | Resending invitations or admin-resetting passwords | `POST /api/users/:id/resend-invitation`, `POST /api/users/:id/admin-reset-password` | Admin reset password trigger, Resend invite button |
| `roles` | `manage` | Full configuration of role registry, parent hierarchies, and system settings | `/api/roles/*`, `/api/company/settings` | **Settings** Navigation tab & Role Management editor |
| `organization` | `view` | View organization units, learning groups, and memberships | `GET /api/organization-units`, `GET /api/learning-groups` | Org tree, Learning group selectors |
| `organization` | `create` | Create organization units and learning groups | `POST /api/organization-units`, `POST /api/learning-groups` | Create unit/group dialogs |
| `organization` | `edit` | Rename and move organization units and learning groups | `PUT /api/organization-units/:id`, `POST /api/organization-units/:id/move`, `PUT /api/learning-groups/:id`, `POST /api/learning-groups/:id/move` | Move/rename selectors/handlers |
| `organization` | `delete` | Soft-delete and restore organization units and learning groups | `DELETE /api/organization-units/:id`, `POST /api/organization-units/:id/restore`, `DELETE /api/learning-groups/:id`, `POST /api/learning-groups/:id/restore` | Delete and Restore actions |
| `organization` | `manage-members` | Manage organization unit managers and group members | `POST /api/organization-units/:id/managers`, `DELETE /api/organization-units/:id/managers/:userId`, `POST /api/learning-groups/:id/members`, `DELETE /api/learning-groups/:id/members/:userId` | Member/manager list managers |
| `organization` | `manage-groups` | Advanced management and configuration of temporary/permanent learning groups | - | Email reminder notification list recipient |
