import { AuditCategory, AuditOutcome, AuditLog, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { auditLogService } from './auditLog.service';

export class AuthFailureAggregationService {
  /**
   * In-memory counters tracking failures 1 and 2 before the 3rd-failure threshold is reached.
   * Key: `${companyId}:${actorId}:${action}`
   */
  private preFailureCounters = new Map<string, number>();

  /**
   * Records an authentication failure with 3-strikes aggregation per (companyId, actorId, action).
   * - Failures 1 and 2 for an identifiable user: recorded in memory, NO audit row created.
   * - 3rd failure: creates the initial AuditLog row with authFailureCount: 3, outcome: FAILURE.
   * - 4th+ failures: updates authFailureCount += 1 on the existing open row (maintaining original createdAt).
   * - If actorId is null (unresolvable identifier): NO aggregation is performed; an individual row is logged immediately.
   */
  async recordAuthFailure(
    companyId: string,
    actorId: string | null,
    action: string,
    affectedObjectName: string,
    details?: Record<string, unknown>
  ): Promise<AuditLog | null> {
    // 1. Unresolvable actor: do not aggregate, log an individual row immediately
    if (actorId === null) {
      return await auditLogService.log({
        companyId,
        category: AuditCategory.AUTHENTICATION_SECURITY,
        outcome: AuditOutcome.FAILURE,
        action,
        actorId: null,
        entityType: 'User',
        entityId: 'unresolved',
        affectedObjectName,
        details,
      });
    }

    const counterKey = `${companyId}:${actorId}:${action}`;

    // 2. Check if there is already an open aggregated failure row for this series
    const openRow = await prisma.auditLog.findFirst({
      where: {
        companyId,
        actorId,
        category: AuditCategory.AUTHENTICATION_SECURITY,
        outcome: AuditOutcome.FAILURE,
        action,
        resolvedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (openRow) {
      // 4th+ failure: increment authFailureCount on the existing row
      const currentCount = openRow.authFailureCount ?? 3;
      const newCount = currentCount + 1;

      // Ensure in-memory counter is cleared
      this.preFailureCounters.delete(counterKey);

      return await prisma.auditLog.update({
        where: { id: openRow.id },
        data: {
          authFailureCount: newCount,
          // Note: createdAt is preserved, updatedAt is updated
        },
      });
    }

    // 3. No open row yet: check in-memory counter for failures 1 and 2
    const currentCount = this.preFailureCounters.get(counterKey) || 0;
    const newCount = currentCount + 1;

    if (newCount < 3) {
      this.preFailureCounters.set(counterKey, newCount);
      return null;
    }

    // 4. Exactly the 3rd failure: clear in-memory counter and create the aggregated row
    this.preFailureCounters.delete(counterKey);

    return await auditLogService.log({
      companyId,
      category: AuditCategory.AUTHENTICATION_SECURITY,
      outcome: AuditOutcome.FAILURE,
      action,
      actorId,
      entityType: 'User',
      entityId: actorId,
      affectedObjectName,
      details,
      authFailureCount: 3,
    });
  }

  /**
   * Resolves ALL open AUTHENTICATION_SECURITY/FAILURE rows for an actor across all actions,
   * setting outcome: RESOLVED and resolvedAt: now, while retaining authFailureCount history.
   * Also clears any pre-3rd-failure in-memory counter for that actor.
   */
  async resolveOpenFailures(companyId: string, actorId: string): Promise<Prisma.BatchPayload> {
    // 1. Resolve open audit rows in database
    const result = await prisma.auditLog.updateMany({
      where: {
        companyId,
        actorId,
        category: AuditCategory.AUTHENTICATION_SECURITY,
        outcome: AuditOutcome.FAILURE,
        resolvedAt: null,
      },
      data: {
        outcome: AuditOutcome.RESOLVED,
        resolvedAt: new Date(),
      },
    });

    // 2. Clear any active in-memory counters for this actor
    const prefix = `${companyId}:${actorId}:`;
    for (const key of Array.from(this.preFailureCounters.keys())) {
      if (key.startsWith(prefix)) {
        this.preFailureCounters.delete(key);
      }
    }

    return result;
  }

  /**
   * Returns current in-memory pre-failure count for testing/inspection.
   */
  getPreFailureCount(companyId: string, actorId: string, action: string): number {
    return this.preFailureCounters.get(`${companyId}:${actorId}:${action}`) || 0;
  }

  /**
   * Clears all in-memory counters (for testing/cleanup).
   */
  clearAll(): void {
    this.preFailureCounters.clear();
  }
}

export const authFailureAggregationService = new AuthFailureAggregationService();
