import { AuditOutcome, Prisma } from '@prisma/client';
import { prisma } from '../../../shared/db/prisma';
import {
  getUserDisplayName,
  sanitizeAuditPayload,
  sanitizeAuditChanges,
  AuditLogChange,
} from '../../../shared/audit/auditSanitizer';
import {
  AuditActor,
  AuditDetailResponse,
  AuditFilterOptionsResponse,
  AuditListItem,
  AuditListResponse,
  AuditLogQueryFilters,
  AuditSearchListItem,
  AuditSearchResponse,
} from '../types/audit.types';

const AUDIT_LOG_LIST_SELECT = {
  id: true,
  createdAt: true,
  updatedAt: true,
  category: true,
  outcome: true,
  action: true,
  entityType: true,
  affectedObjectName: true,
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

type AuditLogRowWithActor = Prisma.AuditLogGetPayload<{
  select: typeof AUDIT_LOG_LIST_SELECT;
}>;

function mapRowToListItem(r: AuditLogRowWithActor): AuditListItem {
  return {
    id: r.id,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    category: r.category,
    outcome: r.outcome,
    action: r.action,
    entityType: r.entityType,
    affectedObjectName: r.affectedObjectName,
    authFailureCount: r.authFailureCount,
    resolvedAt: r.resolvedAt,
    actor: r.actorId
      ? {
          id: r.actorId,
          displayName: getUserDisplayName(r.actor),
        }
      : null,
  };
}

/**
 * Shared filter builder for audit log list and search endpoints.
 */
export function buildAuditLogWhereClause(
  companyId: string,
  filters: AuditLogQueryFilters
): Prisma.AuditLogWhereInput {
  const whereClause: Prisma.AuditLogWhereInput = {
    companyId,
  };

  if (filters.dateFrom || filters.dateTo) {
    whereClause.createdAt = {};
    if (filters.dateFrom) {
      whereClause.createdAt.gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      whereClause.createdAt.lte = filters.dateTo;
    }
  }

  if (filters.actorId !== undefined && filters.actorId !== '') {
    if (filters.actorId.toLowerCase() === 'system') {
      whereClause.actorId = null;
    } else {
      whereClause.actorId = filters.actorId;
    }
  }

  if (filters.action !== undefined && filters.action !== '') {
    whereClause.action = filters.action;
  }

  if (filters.entityType !== undefined && filters.entityType !== '') {
    whereClause.entityType = filters.entityType;
  }

  if (filters.entityId !== undefined && filters.entityId !== '') {
    whereClause.entityId = filters.entityId;
  }

  if (filters.outcome !== undefined) {
    whereClause.outcome = filters.outcome;
  }

  return whereClause;
}

/**
 * Formats a user input string into a boolean-mode fulltext query.
 * Strips MariaDB fulltext boolean operators (+ - > < ( ) ~ * " @ & |) and appends a trailing wildcard per word.
 */
export function formatBooleanQuery(q: string): string {
  const clean = q.replace(/[+\-><()~*\"@&|]/g, ' ').trim();
  if (!clean) return '';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  return words.map((w) => `+${w}*`).join(' ');
}

export class AuditQueryService {
  /**
   * Retrieves a paginated list of audit logs for a company with optional filters.
   * Never loads full table; uses count() + findMany with skip/take and selected columns.
   */
  async getAuditLogs(
    companyId: string,
    filters: AuditLogQueryFilters
  ): Promise<AuditListResponse> {
    const page = Math.max(1, filters.page || 1);
    const rawPageSize = filters.pageSize || 30;
    const pageSize = Math.min(100, Math.max(1, rawPageSize));
    const skip = (page - 1) * pageSize;

    const whereClause = buildAuditLogWhereClause(companyId, filters);

    const [totalCount, rows] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        where: whereClause,
        select: AUDIT_LOG_LIST_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
      }),
    ]);

    const items: AuditListItem[] = rows.map((r) => mapRowToListItem(r));

    return {
      items,
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  /**
   * Performs fulltext and exact-ID search over audit logs for a company.
   * If `q` is a valid UUID, searches exact event ID and entityId first (marked with matchType: 'exact_id'),
   * while also running FULLTEXT search for anything else (marked with matchType: 'fulltext').
   * Otherwise runs boolean mode FULLTEXT with trailing wildcards per word.
   */
  async searchAuditLogs(
    companyId: string,
    q: string,
    filters: AuditLogQueryFilters
  ): Promise<AuditSearchResponse> {
    const term = q.trim();
    const page = Math.max(1, filters.page || 1);
    const rawPageSize = filters.pageSize || 30;
    const pageSize = Math.min(100, Math.max(1, rawPageSize));
    const skip = (page - 1) * pageSize;

    const baseWhere = buildAuditLogWhereClause(companyId, filters);

    const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const isUuid = UUID_REGEX.test(term);

    if (isUuid) {
      // 1. Exact ID query (Audit Event ID or entityId)
      const exactWhere: Prisma.AuditLogWhereInput = {
        ...baseWhere,
        OR: [{ id: term }, { entityId: term }],
      };

      const exactRows = await prisma.auditLog.findMany({
        where: exactWhere,
        select: AUDIT_LOG_LIST_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      const exactIds = new Set(exactRows.map((r) => r.id));

      // 2. Also run FULLTEXT search for anything else
      const booleanQuery = formatBooleanQuery(term);
      let ftCount = 0;
      let ftRows: AuditLogRowWithActor[] = [];

      if (booleanQuery) {
        const ftWhere: Prisma.AuditLogWhereInput = {
          ...baseWhere,
          searchText: {
            search: booleanQuery,
          },
          ...(exactIds.size > 0 ? { id: { notIn: Array.from(exactIds) } } : {}),
        };

        ftCount = await prisma.auditLog.count({ where: ftWhere });

        if (skip >= exactRows.length) {
          const ftSkip = skip - exactRows.length;
          ftRows = await prisma.auditLog.findMany({
            where: ftWhere,
            select: AUDIT_LOG_LIST_SELECT,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            skip: ftSkip,
            take: pageSize,
          });
        } else {
          const remainingTake = pageSize - (exactRows.length - skip);
          if (remainingTake > 0) {
            ftRows = await prisma.auditLog.findMany({
              where: ftWhere,
              select: AUDIT_LOG_LIST_SELECT,
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              skip: 0,
              take: remainingTake,
            });
          }
        }
      }

      const totalCount = exactRows.length + ftCount;
      const pageExactRows = exactRows.slice(skip, skip + pageSize);
      const combinedItems: AuditSearchListItem[] = [
        ...pageExactRows.map((r) => ({
          ...mapRowToListItem(r),
          matchType: 'exact_id' as const,
        })),
        ...ftRows.map((r) => ({
          ...mapRowToListItem(r),
          matchType: 'fulltext' as const,
        })),
      ];

      return {
        items: combinedItems,
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      };
    }

    // Non-UUID term: FULLTEXT boolean search with word-prefix trailing wildcards
    const booleanQuery = formatBooleanQuery(term);
    if (!booleanQuery) {
      return {
        items: [],
        page,
        pageSize,
        totalCount: 0,
        totalPages: 0,
      };
    }

    const whereClause: Prisma.AuditLogWhereInput = {
      ...baseWhere,
      searchText: {
        search: booleanQuery,
      },
    };

    const [totalCount, rows] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        where: whereClause,
        select: AUDIT_LOG_LIST_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
      }),
    ]);

    const items: AuditSearchListItem[] = rows.map((r) => ({
      ...mapRowToListItem(r),
      matchType: 'fulltext' as const,
    }));

    return {
      items,
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  /**
   * Retrieves full details for a single audit log entry by ID, scoped to company.
   * Returns null if not found or belongs to another company.
   * Runs details, changes, and additionalAffectedObjects through sanitizers as defense-in-depth.
   */
  async getAuditLogById(
    companyId: string,
    id: string
  ): Promise<AuditDetailResponse | null> {
    const record = await prisma.auditLog.findFirst({
      where: {
        id,
        companyId,
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        category: true,
        outcome: true,
        action: true,
        entityType: true,
        entityId: true,
        affectedObjectName: true,
        additionalAffectedObjects: true,
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
      },
    });

    if (!record) {
      return null;
    }

    const rawDetails =
      record.details &&
      typeof record.details === 'object' &&
      !Array.isArray(record.details)
        ? (record.details as Record<string, unknown>)
        : null;

    const sanitizedDetails = rawDetails
      ? sanitizeAuditPayload(rawDetails)
      : null;

    const sanitizedChanges = Array.isArray(record.changes)
      ? sanitizeAuditChanges(record.changes as unknown as AuditLogChange[])
      : record.changes && typeof record.changes === 'object'
        ? sanitizeAuditPayload(record.changes)
        : null;

    const sanitizedAdditionalAffectedObjects = record.additionalAffectedObjects
      ? sanitizeAuditPayload(record.additionalAffectedObjects)
      : null;

    let triggeredBy: AuditActor | null = null;
    if (
      rawDetails &&
      typeof rawDetails.triggeredByUserId === 'string' &&
      rawDetails.triggeredByUserId.trim()
    ) {
      const triggeredUser = await prisma.user.findUnique({
        where: { id: rawDetails.triggeredByUserId.trim() },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          email: true,
        },
      });
      if (triggeredUser) {
        triggeredBy = {
          id: triggeredUser.id,
          displayName: getUserDisplayName(triggeredUser),
        };
      }
    }

    return {
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      category: record.category,
      outcome: record.outcome,
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId,
      affectedObjectName: record.affectedObjectName,
      authFailureCount: record.authFailureCount,
      resolvedAt: record.resolvedAt,
      actor: record.actorId
        ? {
            id: record.actorId,
            displayName: getUserDisplayName(record.actor),
          }
        : null,
      additionalAffectedObjects: sanitizedAdditionalAffectedObjects,
      changes: sanitizedChanges,
      details: sanitizedDetails,
      triggeredBy,
    };
  }

  /**
   * Retrieves distinct filter options available for the company's audit logs.
   */
  async getFilterOptions(companyId: string): Promise<AuditFilterOptionsResponse> {
    const [actionRows, entityTypeRows, actorRows, systemRow] = await Promise.all([
      prisma.auditLog.findMany({
        where: { companyId },
        distinct: ['action'],
        select: { action: true },
        orderBy: { action: 'asc' },
      }),
      prisma.auditLog.findMany({
        where: { companyId },
        distinct: ['entityType'],
        select: { entityType: true },
        orderBy: { entityType: 'asc' },
      }),
      prisma.auditLog.findMany({
        where: {
          companyId,
          actorId: { not: null },
        },
        distinct: ['actorId'],
        select: {
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
        },
        take: 500,
      }),
      prisma.auditLog.findFirst({
        where: {
          companyId,
          actorId: null,
        },
        select: { id: true },
      }),
    ]);

    const actions = actionRows.map((r) => r.action).filter(Boolean);
    const entityTypes = entityTypeRows.map((r) => r.entityType).filter(Boolean);

    const actors: AuditActor[] = actorRows
      .filter((r): r is typeof r & { actorId: string } => typeof r.actorId === 'string')
      .map((r) => ({
        id: r.actorId,
        displayName: getUserDisplayName(r.actor),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    const hasSystemEvents = systemRow !== null;
    const outcomes: AuditOutcome[] = Object.values(AuditOutcome);

    return {
      actions,
      entityTypes,
      actors,
      hasSystemEvents,
      outcomes,
    };
  }
}

export const auditQueryService = new AuditQueryService();
