import { prisma } from '../db/prisma';

export class AuditLogService {
  /**
   * Logs a single event to the audit log.
   */
  async log(
    companyId: string,
    entityType: string,
    entityId: string,
    action: string,
    actorId: string | null = null,
    metadata?: any
  ) {
    return await prisma.auditLog.create({
      data: {
        companyId,
        entityType,
        entityId,
        action,
        actorId,
        metadata: metadata || null,
      },
    });
  }

  /**
   * Retrieves the history of audit logs for a specific entity, ordered by creation time.
   */
  async getHistory(entityType: string, entityId: string) {
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
