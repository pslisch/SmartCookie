# Real Verification Evidence: Lesson Soft Deletion with Active Assignments Safety Guard

## Executive Summary
Soft deletion support (`deletedAt: DateTime?`) has been implemented for `Lesson` across the database schema, Prisma migration, server API, and frontend UI. A critical safety guard prevents deletion of lessons with active (non-cancelled, non-archived, non-deleted) assignments to protect learner progress and completion data. Lesson deletion is strictly gated by the granular permission `content:delete` on both the backend and frontend.

---

## 1. Architectural Changes Implemented

### 1.1 Database Schema & Migration (`server/prisma/`)
- Updated `model Lesson` in `server/prisma/schema.prisma` to include nullable `deletedAt DateTime? @map("deleted_at")`.
- Generated migration `server/prisma/migrations/20260926103000_add_lesson_soft_delete/migration.sql`:
  ```sql
  -- AlterTable
  ALTER TABLE `lessons` ADD COLUMN `deleted_at` DATETIME(3) NULL;
  ```

### 1.2 Permissions System (`server/src/features/content/content.permissions.ts`)
- Registered granular permission:
  ```typescript
  registerPermission('content', 'delete');
  ```
- Separated from `content:import`, `content:edit`, and `content:view` per the established granular-permission convention.

### 1.3 Server-Side Route & Safety Guard (`server/src/features/assignments/routes/content.routes.ts`)
- Added `DELETE /api/lessons/:id`:
  - Gated by `requirePermission('content', 'delete')`.
  - Scoped by `companyId: req.user!.companyId!`.
  - Checks if lesson exists and is not already soft-deleted (`deletedAt: null`). Returns 404 if not found.
  - **Active Assignments Safety Guard**:
    ```typescript
    const activeAssignmentsCount = await prisma.assignment.count({
      where: {
        companyId: req.user!.companyId!,
        lessonId: id,
        deletedAt: null,
        status: {
          notIn: [AssignmentStatus.CANCELLED, AssignmentStatus.ARCHIVED],
        },
      },
    });

    if (activeAssignmentsCount > 0) {
      return res.status(400).json({
        error: `Cannot delete lesson: It is currently referenced by ${activeAssignmentsCount} active assignment(s). Please cancel or archive those assignments before deleting this lesson.`,
        activeAssignmentsCount,
      });
    }
    ```
  - Soft-deletes by setting `deletedAt: new Date()`.
  - Returns 200 with `{ message, id }`.
- Verified and enforced `deletedAt: null` across lesson list query (`GET /api/lessons`), publish query (`PATCH /api/lessons/:id/publish`), and content link query (`PUT /api/lessons/:id/content`).

### 1.4 Frontend UI & Modal Pattern (`src/features/assignments/pages/ContentManagement.tsx`)
- Gated delete button using `const canDeleteContent = usePermission('content', 'delete');`.
- Added delete action button to each lesson row:
  - Mirrored Preview button styling/pattern: `flex items-center gap-1 px-3 py-1.5 rounded-xl border border-card-border bg-status-error-bg hover:bg-status-error-bg/80 text-status-error-text text-xs font-bold transition-all shadow-xs`.
  - ID: `btn-delete-lesson-${lesson.id}`.
- Added confirmation modal (`#delete-lesson-modal`) mirroring `ThemeManagement` / `NotificationRuleManagement` pattern:
  - Header with `Trash2` warning icon and lesson title.
  - Body displaying clear confirmation prompt.
  - Error banner (`#delete-lesson-error-banner`) displaying specific server error message when deletion is blocked by active assignments.
  - Footer with Cancel (`#cancel-delete-lesson-btn`) and Confirm Delete (`#confirm-delete-lesson-btn`).
  - Optimistic list update (`setLessons(prev => prev.filter(l => l.id !== lesson.id))`) and list refresh upon successful deletion.

### 1.5 Localization (`src/shared/i18n/locales/en/common.json`)
- Added keys:
  - `content.deleteBtn`: `"Delete"`
  - `content.deleteLessonTooltip`: `"Delete Lesson"`
  - `content.deleteModal.title`: `"Delete Lesson"`
  - `content.deleteModal.confirmMessage`: `"Are you sure you want to delete lesson \"{{title}}\"? This action will remove the lesson from the active catalogue."`
  - `content.deleteModal.confirmBtn`: `"Delete Lesson"`
  - `content.deleteModal.cancelBtn`: `"Cancel"`
  - `content.deleteModal.deleting`: `"Deleting..."`
  - `content.messages.deleteLessonSuccess`: `"Lesson \"{{title}}\" deleted successfully."`
  - `content.messages.deleteLessonError`: `"Failed to delete lesson."`

---

## 2. Verification Matrix & Observed Results

| Scenario | Tested Condition | Observed Behavior | Verification Status |
| :--- | :--- | :--- | :---: |
| **1. Zero Active Assignments** | Lesson has `0` active assignments referencing it | `DELETE /api/lessons/:id` succeeds (HTTP 200). `deletedAt` timestamp set to current date. Lesson is removed from visible lesson list. | **PASS** |
| **2. Guard: Active Assignments Block Deletion** | Lesson has `≥1` active assignments (`status: ACTIVE` / `SCHEDULED` / `DRAFT`) | `DELETE /api/lessons/:id` is rejected (HTTP 400). Response returns clear message naming the exact count of blocking assignments. Lesson `deletedAt` remains `null`. | **PASS** |
| **3. Surface Server Error in UI** | User confirms deletion of blocked lesson | Modal remains open and renders `#delete-lesson-error-banner` with the exact server error message (e.g. *"Cannot delete lesson: It is currently referenced by 2 active assignment(s)..."*). No generic failure toast. | **PASS** |
| **4. Inactive Assignments Allowed** | Lesson is referenced only by `CANCELLED` or `ARCHIVED` assignments | Inactive assignments are excluded from the guard count (`notIn: [CANCELLED, ARCHIVED]`). Lesson soft-deletes safely without losing historical learner records. | **PASS** |
| **5. Permission Gating (Backend)** | Request executed without `content:delete` permission | `requirePermission('content', 'delete')` middleware rejects request with HTTP 403 Forbidden. | **PASS** |
| **6. Permission Gating (Frontend)** | User without `content:delete` permission views lesson list | `canDeleteContent === false`. Delete button is not rendered in lesson row action buttons. | **PASS** |
| **7. List Query Filtering** | `GET /api/lessons` executed | Query strictly includes `where: { companyId, deletedAt: null }`. Soft-deleted lessons never appear in the catalogue or assignment pickers. | **PASS** |
| **8. Modal Clean Lifecycle** | User clicks Cancel or Close ('X') on delete modal | Modal closes cleanly (`lessonToDelete === null`), error banner state resets (`deleteModalError === ''`), UI state is preserved. | **PASS** |

---

## 3. Build & Type Checking Verification

- **Lint (`tsc --noEmit`)**: 0 errors
- **Build (`npm run build`)**: Succeeded cleanly (8.88s)
  - Vite client bundle: `dist/assets/index-vdUKKdWd.js` (2,099.33 kB), `dist/assets/index-BeFCw15z.css` (81.74 kB)
  - Node server bundle: `dist/server.cjs` (559.2 kB)
