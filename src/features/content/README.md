# SCORM Content Module (SCORM 1.2 MVP)

This module provides support for importing, validating, cataloging, and playing SCORM 1.2 compliant learning packages. It connects standard SCORM packages seamlessly with the Learning Assignment Engine.

---

## 🎨 System Architecture & Decisions

### 1. Unified Lesson-to-Content Extension
To adhere to the core design philosophy of "never treating SCORM as a special case," we implement a **Content-extends-Lesson** model:
- The standard `Lesson` table is extended with an optional `content_id` field referencing the `Content` record.
- Learning assignments are dispatched exactly the same way regardless of whether a lesson has a SCORM course package or plain text/file content attached.
- When a user launches a SCORM lesson, the LMS reads the associated SCORM metadata, initializes the frontend SCORM 1.2 API Player Bridge, and launches the SCORM index file.

### 2. Multi-Version Isolation (Content Grouping)
Content updates use a **version-as-separate-rows** schema sharing a common `contentGroupId` UUID:
- Each import of a package either creates a new version under the same `contentGroupId` or completely replaces the current draft version (depending on choice).
- Version histories are stored as clean separate rows, allowing past course tracking and historic logs to remain stable without breaking relationships.

### 3. ZIP-Slip & Path-Traversal Mitigation
To protect the server filesystem from malicious or malformed zip structures:
- Filename sanitization is executed on extracting zip contents.
- Absolute or parent-relative path checks are enforced on extraction.
- A runtime boundary check is performed on the static server routing files: any path-traversal patterns (e.g. `../` or `%2f..%2f`) are immediately caught and rejected.

### 4. Interactive SCORM 1.2 Runtime API Bridge
- A fully compliant SCORM 1.2 Client API Adapter (`window.API`) is injected into the player sandbox.
- State is buffered locally during interactions and synchronized periodically to the server via `/api/content-attempts/:id/commit` JSON commits.
- Rollup scoring and completions are computed on commit and rolled up to the parent `UserAssignmentInstance` record.

---

## 📋 MVP Scope Limitations

- **SCORM 1.2 Only**: Standard SCORM 2004, AICC, xAPI (Tincan), and cmi5 engines are reserved for future modules and are not supported.
- **Certificate Automation**: Formally bypassed or inert beyond the "Ignore" option.
- **No differential version comparators**: Visual comparison or diffing between package file trees is deferred.
- **No repacked exports**: Allows downloading the original uploaded package ZIP only.
- **Synchronous Import Pipeline**: Package validation and zip extraction are processed synchronously in-request for simplicity during MVP deployment.

---

## 🔌 API & Routing Endpoint Mappings

### Content Management Core
- `GET /api/content`: Lists all active SCORM packages (supports search, category, and tag filters).
- `GET /api/content/:contentGroupId/versions`: Lists all historic versions of a package.
- `POST /api/content/import`: Imports, validates, and extracts a zip package.
- `POST /api/content/:id/publish`: Marks a package draft as Published.
- `POST /api/content/:id/archive`: Soft-deletes/archives a package.
- `POST /api/content/:id/restore`: Restores an archived package back to Draft.
- `GET /api/content/:id/download`: Downloads the original unmodified `.zip` file of the package.

### SCORM State Runtime Tracking
- `POST /api/content-attempts/start`: Starts a new attempt for a `UserAssignmentInstance`.
- `POST /api/content-attempts/:id/commit`: Save-points the runtime CMI dictionary states and runs completion/score rollups.
- `GET /api/content-attempts/:instanceId`: Fetches full attempt history and logs for an assignment.
