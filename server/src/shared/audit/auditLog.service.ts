import { AuditCategory, AuditOutcome, AuditLog, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import {
  sanitizeAuditPayload,
  sanitizeAuditChanges,
  getUserDisplayName,
  AuditLogChange,
} from './auditSanitizer';

export type { AuditLogChange };

export interface AdditionalAffectedObject {
  type: string;
  id: string;
  name: string;
}

export interface AuditLogInput {
  companyId: string;
  category: AuditCategory;
  outcome: AuditOutcome;
  action: string;
  actorId: string | null; // null = System actor
  entityType: string;
  entityId: string;
  affectedObjectName: string; // human-readable snapshot, always required on new writes
  additionalAffectedObjects?: AdditionalAffectedObject[];
  changes?: AuditLogChange[];
  details?: Record<string, unknown>;
}

/**
 * Recursively extracts primitive values from an object or array.
 * Joins primitive values; skips keys and structural wrappers.
 */
function extractPrimitiveValues(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractPrimitiveValues(item));
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((val) =>
      extractPrimitiveValues(val)
    );
  }
  return [];
}

export class AuditLogService {
  /**
   * Logs a single event to the audit log.
   */
  async log(input: AuditLogInput): Promise<AuditLog> {
    const sanitizedDetails = input.details !== undefined ? sanitizeAuditPayload(input.details) : undefined;
    const sanitizedChanges = input.changes !== undefined ? sanitizeAuditChanges(input.changes) : undefined;
    const sanitizedAdditionalObjects = input.additionalAffectedObjects !== undefined
      ? sanitizeAuditPayload(input.additionalAffectedObjects)
      : undefined;

    // Resolve actor display name for search text denormalization
    let actorLabel = 'System';
    if (input.actorId) {
      try {
        const actor = await prisma.user.findUnique({
          where: { id: input.actorId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true,
          },
        });
        actorLabel = getUserDisplayName(actor);
      } catch {
        actorLabel = 'Unknown User';
      }
    }

    // Extract primitive values from sanitizedDetails (never from raw input.details)
    const detailValues = sanitizedDetails ? extractPrimitiveValues(sanitizedDetails) : [];

    const searchParts: string[] = [
      input.category,
      input.outcome,
      input.action,
      input.affectedObjectName,
      input.entityType,
      actorLabel,
      ...detailValues,
    ].filter((val): val is string => typeof val === 'string' && val.trim().length > 0);

    const searchText = searchParts.length > 0 ? searchParts.join(' ').trim() : null;

    return await prisma.auditLog.create({
      data: {
        companyId: input.companyId,
        category: input.category,
        outcome: input.outcome,
        action: input.action,
        actorId: input.actorId,
        entityType: input.entityType,
        entityId: input.entityId,
        affectedObjectName: input.affectedObjectName,
        searchText,
        additionalAffectedObjects: sanitizedAdditionalObjects !== undefined
          ? (sanitizedAdditionalObjects as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        changes: sanitizedChanges !== undefined
          ? (sanitizedChanges as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        details: sanitizedDetails !== undefined
          ? (sanitizedDetails as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  }

  /**
   * Retrieves the history of audit logs for a specific entity, ordered by creation time.
   */
  async getHistory(entityType: string, entityId: string): Promise<AuditLog[]> {
    return await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}

export const auditLogService = new AuditLogService();
