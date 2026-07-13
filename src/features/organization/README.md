# User & Group Management (Hierarchical Organization Model)

This directory contains the client-side user interface components and layouts for managing the company's organizational units, nested learning groups, and active user list.

## Structure

- **`pages/UserGroupManagement.tsx`**: The main parent view coordinates administrative navigation across distinct functional workspace tabs:
  - **`UsersTab`** (New): A comprehensive user administration panel providing robust search, multi-faceted filtering (status, roles, organization units), side-sheet detail editing, single-user password reset, and archive/restore operations.
  - **`OrganizationStructureTab`**: Manage hierarchical divisions (OUs) using an interactive tree structure, support soft-delete/restore lifecycles, and assign unit managers and members.
  - **`LearningGroupsTab`**: Manage nested cohort groupings for learning assignments, with custom expiration bounds and automatic extension settings.
  - **`ExpiringGroupsTab`**: Specialized alert list highlighting groups nearing expiration for proactive extensions.

## Sub-components

- **`components/UsersTab.tsx`**: Displays the registered user list with full-featured filtering, status badges, action sheets, and administrative actions (password reset, archive, restore).
- **`components/BulkImportWizard.tsx`**: A multi-step transaction-safe workflow to upload, dry-run validate, and confirm bulk user imports from CSV templates.
- **`components/OrganizationStructureTab.tsx`**: Implements the hierarchical division manager.
- **`components/LearningGroupsTab.tsx`**: Manages learning groups and temporary student cohorts.
- **`components/ExpiringGroupsTab.tsx`**: Lists active groups nearing expiration with extension capabilities.

## Features & Mechanics

- **Advanced Search & Multi-Faceted Filters**: Real-time searching and cascading filters across users (by active/inactive/archived status, associated roles, or parent organizational units).
- **Transaction-Safe Bulk Import**: Supports full CSV file processing with per-row validations. Visualizes errors in-app and enforces all-or-nothing confirmation before database persistence.
- **Hierarchical Tree Traversal**: Fully-interactive division trees allowing direct management of nested structures and member enrollments.
- **Temporary Cohort Expirations**: Tracks cohort expiration dates and automates reminder tasks to preserve organization cleanliness.
- **Active Soft-Delete & Restore Lifecycle**: Users and OUs can be archived, and subsequently restored with standard audit choices (FRESH_START vs. RESTORE).
- **i18n Translation Binding**: 100% of user-facing components, labels, and interaction prompts are fully wrapped in structured translation keys.
