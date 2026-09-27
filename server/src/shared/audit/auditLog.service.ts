import { AuditCategory, AuditOutcome, AuditLog, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { sanitizeAuditPayload } from './auditSanitizer';

export interface AuditLogChange {
  field: string;
  before: string;
  after: string;
}

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

export class AuditLogService {
  /**
   * Logs a single event to the audit log.
   */
  async log(input: AuditLogInput): Promise<AuditLog> {
    const sanitizedDetails = input.details !== undefined ? sanitizeAuditPayload(input.details) : undefined;
    const sanitizedChanges = input.changes !== undefined ? sanitizeAuditPayload(input.changes) : undefined;
    const sanitizedAdditionalObjects = input.additionalAffectedObjects !== undefined
      ? sanitizeAuditPayload(input.additionalAffectedObjects)
      : undefined;

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
