# Audit Log Documentation Sync

The following files were updated to synchronize `.ai/indexes/*`, `.ai/project-map.md`, and `docs/architecture.md` with the shipped Enterprise Audit Log feature:

1. `.ai/indexes/database.md`: Updated the `AuditLog` (`audit_logs`) schema specification with all extended columns, composite indexes, and fulltext index, and bumped the Schema Registry to `v1.15.0 (Current)` with a dedicated Audit Log entry.
2. `.ai/indexes/permissions.md`: Added table rows for `audit:view`, `audit:manage-retention`, and `audit:receive-failure-alerts` with exact backend route gates and frontend UI triggers.
3. `.ai/indexes/apis.md`: Added entries 130 through 137 documenting the eight Audit Log endpoints (`GET /settings`, `PATCH /settings`, `GET /`, `GET /search`, `GET /export/all`, `GET /export`, `GET /filter-options`, `GET /:id`) with exact parameters, response shapes, permissions, and validation rules.
4. `.ai/indexes/components.md`: Added entries 47 through 50 for `AuditLog`, `AuditLogView`, `AuditLogSettings`, and `CopyableIdTooltip` detailing locations, responsibilities, props, and dependencies.
5. `.ai/indexes/routes.md`: Updated Management Hub (entry 8) with Audit Log permissions and card reference, and added entry 13 documenting the Audit Log Management Sub-view.
6. `.ai/indexes/dependencies.md`: Added module entry 16 for the Audit Log Subsystem detailing component, service, route, and database linkages.
7. `.ai/indexes/features.md`: Added feature entry 18 under `v1.15.0 Audit Log` documenting the complete specification of the Enterprise Audit Log Subsystem.
8. `.ai/project-map.md`: Added `src/features/audit/`, `CopyableIdTooltip`, and backend `audit` routes/services to the project directory map.
9. `docs/architecture.md`: Documented environment-aware cookie security attributes and added subsections 5 and 6 detailing resilient audit write alerting and the query/search/streamed export pipeline.
10. `SCRATCH.md`: Overwritten to document the full index synchronization changelog across the codebase.
