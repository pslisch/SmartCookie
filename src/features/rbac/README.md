# Role-Based Access Control (RBAC) System

This directory houses the user interfaces and controllers for managing roles, parent-role configurations, and granular action permissions for the SmartCookie platform.

## Features

- **Role Management UI**: Complete list, creation, duplication, renaming, and removal of roles.
- **Hierarchical Inheritance**: Build permission chains by setting parent roles. Permissions flow down automatically when inheritance is toggled on at the company level.
- **Granular Permission Checkboxes**: Permissions are cleanly grouped by business module (e.g., `lessons`, `roles`, `users`) with full-featured toggling capability.
- **Protected Roles Safeguard**: Essential built-in roles like `Superuser` are protected against modifications and deletions both on the client UI and the API.

## APIs Used

- `GET /api/roles` — lists roles for current company.
- `POST /api/roles` — creates a new role with a custom name.
- `POST /api/roles/:id/duplicate` — duplicates an existing role and its permissions.
- `DELETE /api/roles/:id` — removes a custom role.
- `GET /api/roles/:id/permissions` — returns permission rules checklist grouped by module.
- `PATCH /api/roles/:id` — updates role name, parent role, or permission checklist.
- `PATCH /api/company/settings` — enables or disables global hierarchical role inheritance.
