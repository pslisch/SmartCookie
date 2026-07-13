# Permission Index

This index logs security roles, middleware checkpoints, and dynamic content visibilities within SmartCookie.

---

## 🔐 Permission Access Schema

Every permission profile should eventually list:
- **Permission**: Logical name of the lock.
- **Roles**: Authorized access levels.
- **Features using it**: Features checking this key prior to execution.

---

## 🟢 Access Profiles & Permission Layers (v1.7.0)

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
| `users` | `view` | View user list, paginated directories, and user detail profiles | `GET /api/users`, `GET /api/users/:id` | User Management list, user profile dialog |
| `users` | `create` | Inviting new users, bulk importing, generating templates, and validating csv files | `POST /api/users/invite`, `POST /api/users/bulk-import/validate`, `POST /api/users/bulk-import/confirm`, `GET /api/users/bulk-import/template` | Invite user controls, Bulk Import wizards |
| `users` | `edit` | Updating user accounts, resending invitations, or admin-resetting passwords | `PUT /api/users/:id`, `POST /api/users/:id/resend-invitation`, `POST /api/users/:id/admin-reset-password` | Edit User dialog, Admin reset password trigger, Resend invite button |
| `users` | `delete` | Archiving/soft-deleting and restoring users | `DELETE /api/users/:id`, `POST /api/users/:id/restore` | Archive user button, restore user controls |
| `roles` | `manage` | Full configuration of role registry, parent hierarchies, and system settings | `/api/roles/*`, `/api/company/settings` | **Settings** Navigation tab & Role Management editor |
| `organization` | `view` | View organization units, learning groups, and memberships | `GET /api/organization-units`, `GET /api/learning-groups` | Org tree, Learning group selectors |
| `organization` | `create` | Create organization units and learning groups | `POST /api/organization-units`, `POST /api/learning-groups` | Create unit/group dialogs |
| `organization` | `edit` | Rename and move organization units and learning groups | `PUT /api/organization-units/:id`, `POST /api/organization-units/:id/move`, `PUT /api/learning-groups/:id`, `POST /api/learning-groups/:id/move` | Move/rename selectors/handlers |
| `organization` | `delete` | Soft-delete and restore organization units and learning groups | `DELETE /api/organization-units/:id`, `POST /api/organization-units/:id/restore`, `DELETE /api/learning-groups/:id`, `POST /api/learning-groups/:id/restore` | Delete and Restore actions |
| `organization` | `manage-members` | Manage organization unit managers and group members | `POST /api/organization-units/:id/managers`, `DELETE /api/organization-units/:id/managers/:userId`, `POST /api/learning-groups/:id/members`, `DELETE /api/learning-groups/:id/members/:userId` | Member/manager list managers |
| `organization` | `manage-groups` | Advanced management and configuration of temporary/permanent learning groups | - | Email reminder notification list recipient |
| `assignments` | `view` | View personal and admin assignments, self-assign and complete assignments | `GET /api/assignments`, `POST /api/assignments/self-assign`, `DELETE /api/assignments/self-assign/:instanceId`, `POST /api/assignment-instances/:id/complete` | Course catalog, My Lessons list |
| `assignments` | `create` | Schedule optional learning assignments for lessons or courses | `POST /api/assignments`, `POST /api/assignments/course` | Lesson/Course details panels |
| `assignments` | `create-mandatory` | Schedule mandatory learning assignments for lessons or courses | `POST /api/assignments`, `POST /api/assignments/course` | Mandatory checkbox toggle |
| `assignments` | `delete` | Cancel and soft-delete administrative learning assignments | `DELETE /api/assignments/:id` | Assignments management list |
| `assignments` | `view-reports` | View individual learner progress reports for assignments | `GET /api/assignments/:id/instances` | Admin dashboard reports |
| `assignments` | `edit` | Reactivate archived/suspended users and resolve dynamic memberships | `POST /api/users/:id/reactivate` | User profile list controls |
| `content` | `view` | View SCORM content library packages and version lists | `GET /api/content`, `GET /api/content/:contentGroupId/versions` | SCORM Content Library, Version history |
| `content` | `import` | Import, validate, and unpack SCORM package ZIP files | `POST /api/content/import` | SCORM Import Wizard button and dropzones |
| `content` | `publish` | Transition SCORM draft packages to published status | `POST /api/content/:id/publish` | Publish buttons inside SCORM library |
| `content` | `archive` | Soft-delete/Archive SCORM packages | `POST /api/content/:id/archive` | Archive buttons inside SCORM library |
| `content` | `restore` | Restore archived SCORM packages back to draft status | `POST /api/content/:id/restore` | Restore action in archived content views |
| `content` | `download-zip` | Download original uploaded ZIP package binary streams | `GET /api/content/:id/download` | Download buttons across library and histories |
| `preview` | `use` | Use the cosmetic visual preview system to view app as a lower-privileged role | `GET /api/preview/eligible-roles` | Preview banner exit, role selectors in Navbar and Content engines |
| `profile-fields` | `manage-categories` | Manage custom profile field categories | - | Category editor interfaces |
| `profile-fields` | `manage-fields` | Configure and register custom profile field definitions | - | Custom field configuration panel |

