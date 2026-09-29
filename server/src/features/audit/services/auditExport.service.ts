import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/db/prisma';
import {
  getUserDisplayName,
  sanitizeAuditPayload,
  sanitizeAuditChanges,
  AuditLogChange,
} from '../../../shared/audit/auditSanitizer';
import {
  buildAuditLogWhereClause,
  formatBooleanQuery,
} from './auditQuery.service';
import { AuditLogQueryFilters } from '../types/audit.types';

export const AUDIT_CSV_HEADERS = [
  'Date/Time (UTC)',
  'Actor',
  'Category',
  'Action',
  'Affected Object Type',
  'Affected Object Name',
  'Outcome',
  'Auth Failure Count',
  'Resolved At (UTC)',
  'Changes',
  'Details',
  'Audit Event ID',
  'Affected Object ID',
];

const AUDIT_EXPORT_SELECT = {
  id: true,
  createdAt: true,
  category: true,
  outcome: true,
  action: true,
  entityType: true,
  entityId: true,
  affectedObjectName: true,
  changes: true,
  details: true,
  authFailureCount: true,
  resolvedAt: true,
  actorId: true,
  actor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      email: true,
    },
  },
} as const;

export type AuditExportRow = Prisma.AuditLogGetPayload<{
  select: typeof AUDIT_EXPORT_SELECT;
}>;

/**
 * Escapes a single field value for RFC4180 CSV compliance.
 * Quotes fields containing comma, double-quote, carriage return, or newline.
 * Internal double quotes are escaped by doubling them ("").
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats an array of fields as an RFC4180 CRLF-terminated CSV row.
 */
export function formatCsvRow(fields: unknown[]): string {
  return fields.map(escapeCsvField).join(',') + '\r\n';
}

/**
 * Formats an AuditLog database row as a CSV string row according to spec columns.
 * Sanitizes details and changes on read as defense-in-depth.
 */
export function formatAuditLogRow(r: AuditExportRow): string {
  // 1. Date/Time (UTC) ISO 8601
  const dateTime = r.createdAt.toISOString();

  // 2. Actor label
  const actor = r.actorId ? getUserDisplayName(r.actor) : 'System';

  // 3. Category (nullable)
  const category = r.category || '';

  // 4. Action
  const action = r.action;

  // 5. Affected Object Type
  const affectedObjectType = r.entityType;

  // 6. Affected Object Name (nullable)
  const affectedObjectName = r.affectedObjectName || '';

  // 7. Outcome (nullable)
  const outcome = r.outcome || '';

  // 8. Auth Failure Count (nullable)
  const authFailureCount = r.authFailureCount != null ? String(r.authFailureCount) : '';

  // 9. Resolved At (UTC or blank)
  const resolvedAt = r.resolvedAt ? r.resolvedAt.toISOString() : '';

  // 10. Changes (formatted as "field: before → after" pairs joined by " | ", sanitized via sanitizeAuditChanges)
  let changesText = '';
  if (Array.isArray(r.changes)) {
    const sanitizedChanges = sanitizeAuditChanges(r.changes as unknown as AuditLogChange[]);
    changesText = sanitizedChanges
      .filter((c) => c && typeof c === 'object')
      .map((c) => `${c.field}: ${c.before ?? ''} → ${c.after ?? ''}`)
      .join(' | ');
  }

  // 11. Details (sanitized via sanitizeAuditPayload, then compact JSON)
  let detailsText = '';
  if (r.details && typeof r.details === 'object' && !Array.isArray(r.details)) {
    const sanitizedDetails = sanitizeAuditPayload(r.details as Record<string, unknown>);
    if (sanitizedDetails && Object.keys(sanitizedDetails).length > 0) {
      detailsText = JSON.stringify(sanitizedDetails);
    }
  }

  // 12. Audit Event ID (technical, the row's id)
  const auditEventId = r.id;

  // 13. Affected Object ID (technical, entityId)
  const affectedObjectId = r.entityId;

  return formatCsvRow([
    dateTime,
    actor,
    category,
    action,
    affectedObjectType,
    affectedObjectName,
    outcome,
    authFailureCount,
    resolvedAt,
    changesText,
    detailsText,
    auditEventId,
    affectedObjectId,
  ]);
}

const BATCH_SIZE = 1000;

export class AuditExportService {
  /**
   * Streams audit log rows matching whereClause to an HTTP response using cursor pagination.
   * Keeps memory bounded regardless of total row count.
   */
  async streamRowsToResponse(
    res: Response,
    whereClause: Prisma.AuditLogWhereInput
  ): Promise<void> {
    // Write CSV header first
    res.write(formatCsvRow(AUDIT_CSV_HEADERS));

    let lastId: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      if (res.writableEnded || res.destroyed) {
        break;
      }

      const rows: AuditExportRow[] = await prisma.auditLog.findMany({
        where: whereClause,
        select: AUDIT_EXPORT_SELECT,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        take: BATCH_SIZE,
        ...(lastId ? { skip: 1, cursor: { id: lastId } } : {}),
      });

      for (const row of rows) {
        res.write(formatAuditLogRow(row));
      }

      if (rows.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        lastId = rows[rows.length - 1].id;
      }
    }

    res.end();
  }

  /**
   * Exports the entire available audit log for a company, streamed in cursor batches.
   */
  async exportAll(companyId: string, res: Response): Promise<void> {
    await this.streamRowsToResponse(res, { companyId });
  }

  /**
   * Exports filtered audit log rows for a company, matching list/search filters.
   * If `q` is provided, applies exact-ID and/or FULLTEXT matching.
   */
  async exportFiltered(
    companyId: string,
    filters: AuditLogQueryFilters,
    q: string | undefined,
    res: Response
  ): Promise<void> {
    const baseWhere = buildAuditLogWhereClause(companyId, filters);

    if (q && q.trim()) {
      const term = q.trim();
      const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = UUID_REGEX.test(term);

      if (isUuid) {
        // First stream exact ID matches
        const exactWhere: Prisma.AuditLogWhereInput = {
          ...baseWhere,
          OR: [{ id: term }, { entityId: term }],
        };

        const exactRows = await prisma.auditLog.findMany({
          where: exactWhere,
          select: AUDIT_EXPORT_SELECT,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });

        // Write header
        res.write(formatCsvRow(AUDIT_CSV_HEADERS));

        for (const row of exactRows) {
          res.write(formatAuditLogRow(row));
        }

        const exactIds = exactRows.map((r) => r.id);

        // Then stream any other rows matching FULLTEXT
        const booleanQuery = formatBooleanQuery(term);
        if (booleanQuery) {
          const ftWhere: Prisma.AuditLogWhereInput = {
            ...baseWhere,
            searchText: {
              search: booleanQuery,
            },
            ...(exactIds.length > 0 ? { id: { notIn: exactIds } } : {}),
          };

          let lastId: string | undefined = undefined;
          let hasMore = true;

          while (hasMore) {
            if (res.writableEnded || res.destroyed) break;

            const ftRows: AuditExportRow[] = await prisma.auditLog.findMany({
              where: ftWhere,
              select: AUDIT_EXPORT_SELECT,
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              take: BATCH_SIZE,
              ...(lastId ? { skip: 1, cursor: { id: lastId } } : {}),
            });

            for (const row of ftRows) {
              res.write(formatAuditLogRow(row));
            }

            if (ftRows.length < BATCH_SIZE) {
              hasMore = false;
            } else {
              lastId = ftRows[ftRows.length - 1].id;
            }
          }
        }

        res.end();
        return;
      }

      // Non-UUID search term
      const booleanQuery = formatBooleanQuery(term);
      if (!booleanQuery) {
        // Zero matches if all characters stripped
        res.write(formatCsvRow(AUDIT_CSV_HEADERS));
        res.end();
        return;
      }

      const searchWhere: Prisma.AuditLogWhereInput = {
        ...baseWhere,
        searchText: {
          search: booleanQuery,
        },
      };

      await this.streamRowsToResponse(res, searchWhere);
      return;
    }

    // Filtered list without search query `q`
    await this.streamRowsToResponse(res, baseWhere);
  }
}

export const auditExportService = new AuditExportService();
