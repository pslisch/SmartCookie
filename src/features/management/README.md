# Management Feature Module

This module consolidates system administration, organizational unit management, and lesson assignments into a unified interface under the **Management** hub.

## Components & Structure

- `pages/Management.tsx`: The primary dashboard page of the Management Hub, listing navigation cards for allowed sub-modules depending on user roles/permissions:
  - **Role Management**: Control fine-grained role capabilities (RBAC).
  - **User & Group Management**: Organize structural corporate units and learning group cohorts.
  - **Assignment Management**: Assign courses/lessons and monitor completion compliance.
