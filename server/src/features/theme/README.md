# Theme & Branding Module

The **Theme & Branding** module manages tenant-scoped visual appearance, semantic color tokens, typography configuration, and real-time theme resolution for SmartCookie.

## Overview

- **Cascading Theme Resolution**: Resolves theme values with the priority hierarchy:
  `Test Override` > `Global Active Theme` > `Smart Cookie Default Theme`.
- **Token Fallbacks**: Merges sparse theme overrides against the canonical 28 semantic color tokens and typography slots so every returned token is concrete and non-null.
- **Font Group Assignments**: Manages 8 typography slots (`general`, `nav`, `headings`, `buttons`, `forms`, `cards`, `links`, `status`) referencing system or tenant-uploaded fonts.
- **Preview & Test Overrides**: Allows administrators and designers to test draft or unactivated themes using query parameters (`?test=:themeId`) without impacting other users. Bogus or soft-deleted test IDs gracefully fall back to the active theme.

## Dependencies

- `@prisma/client`: Database models (`Theme`, `Font`, `ThemeLock`, `ThemeStatus`, `ThemeLockType`).
- `express`: REST API routing.
- `fontkit`: OpenType/TrueType/WOFF/WOFF2 metadata parser and validator.
- `multer`: Multipart form data parsing for secure font file uploads.
- `server/src/shared/middleware/session.middleware.ts`: `requireAuth` session protection.
- `server/src/shared/middleware/permission.middleware.ts`: `requirePermission` RBAC enforcement.
- `server/prisma/seed/themeSeed.ts`: Canonical default semantic tokens (light and dark) and seed utilities.

## Services

- **`themeResolution.service.ts`**: Evaluates the cascading theme hierarchy (Test Override > Company Active Theme > Smart Cookie Default Theme), merges light and dark tokens, resolves font slots with fallback system fonts, and ensures non-null concrete token responses.
- **`themeLock.service.ts`**: Manages exclusive editing locks and test-mode locks on themes with 30-second heartbeats, stale lock stealing, and collision prevention.
- **`font.service.ts`**: Validates uploaded font files using `fontkit`, extracts metadata (family, weight, style, format), enforces duplicate name checks, lists fonts, manages font deletions with usage audits, and coordinates cascading font replacements across theme slots.
- **`fontStorage.service.ts`**: Handles physical file system operations for font files under the `/uploads/fonts/` storage directory.

## Endpoints

### Theme Routes (`/api/themes`)
- `GET /api/themes/resolved` — Public / optionalAuth. Resolves active or preview token/font mappings for the company. Supports `?test=:themeId` query parameter or `themeTestOverrideId` cookie/session.
- `GET /api/themes` — Requires `theme:view`. Lists non-deleted themes for the tenant.
- `POST /api/themes` — Requires `theme:edit`. Creates a new theme as a deep snapshot copy of an existing template (starts in `DRAFT`).
- `GET /api/themes/:id` — Requires `theme:view`. Retrieves single theme detail with font relations.
- `PATCH /api/themes/:id` — Requires `theme:edit`. Partially updates a theme; merges `colorValues` and `darkColorValues` key-by-key. Rejects active themes (409) and the Smart Cookie Default theme (403).
- `POST /api/themes/:id/set-ready` — Requires `theme:set-ready`. Transitions a theme from `DRAFT` to `READY` after validating font references.
- `POST /api/themes/:id/set-draft` — Requires `theme:set-ready`. Transitions a theme back to `DRAFT` and cancels pending schedules.
- `POST /api/themes/:id/activate` — Requires `theme:activate`. Supports immediate activation (`{ mode: 'immediate' }`) or scheduled activation (`{ mode: 'scheduled', scheduledActivationAt: ISOString }`).
- `POST /api/themes/:id/cancel-schedule` — Requires `theme:activate`. Cancels a scheduled activation and resets theme status to `READY`.
- `POST /api/themes/:id/dismiss-failure` — Requires `theme:view`. Clears scheduled activation failure logs (`scheduledActivationFailedAt`, `scheduledActivationFailedReason`).
- `POST /api/themes/run-scheduled-activation` — Requires `theme:activate`. Manually triggers check and activation for overdue scheduled themes.
- `DELETE /api/themes/:id` — Requires `theme:delete`. Soft-deletes a theme (`deletedAt`, `permanentDeleteAt` 14 days, `deletionBatchId`). Rejects default theme (403) and active theme (409). Requires `{ confirmCancelSchedule: true }` confirmation if theme is scheduled (409). Purged after 14 days by scheduler.
- `POST /api/themes/:id/lock` — Requires `requireAuth`. Acquires or heartbeats an editing or testing lock on a theme. Returns 423 Locked if held by another active user.
- `DELETE /api/themes/:id/lock` — Requires `requireAuth`. Explicitly releases a theme lock held by the current user.
- `GET /api/themes/:id/lock` — Requires `theme:view`. Inspects lock status for a theme.

### Font Routes (`/api/fonts`)
- `GET /api/fonts` — Requires `theme:view`. Lists available fonts for the company (system `Inter` + uploaded custom fonts).
- `GET /api/fonts/:id/file` — Public. Streams raw font file with immutable cache headers and proper MIME type.
- `POST /api/fonts` — Requires `theme:edit`. Uploads a new custom font file (WOFF, WOFF2, TTF, OTF; max 15MB) with metadata validation via `fontkit`.
- `DELETE /api/fonts/:id` — Requires `theme:edit`. Deletes a custom font. Rejects if referenced in theme font slots unless `replacementFontId` is provided.
- `POST /api/fonts/:id/replace` — Requires `theme:edit`. Replaces all references to a font across all company themes with a target replacement font.

