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
} from '../types/audit.types';

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

    const [totalCount, rows] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        where: whereClause,
        select: {
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
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
      }),
    ]);

    const items: AuditListItem[] = rows.map((r) => ({
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
