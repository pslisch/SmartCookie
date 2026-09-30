import { AuditCategory, AuditOutcome, AuditLog, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import {
  sanitizeAuditPayload,
  sanitizeAuditChanges,
  getUserDisplayName,
  AuditLogChange,
} from './auditSanitizer';
import { auditWriteFailureAlertService } from './auditWriteFailureAlert.service';

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
  authFailureCount?: number | null;
  resolvedAt?: Date | null;
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
   *
   * Resilient execution contract:
   * - Tries the database create.
   * - On failure, waits briefly and retries ONCE.
   * - If retry succeeds, returns the row normally (no alert).
   * - If retry also fails, dispatches an alert email via auditWriteFailureAlertService
   *   with sanitized context and returns null.
   * - NEVER throws an error past this method.
   */
  async log(input: AuditLogInput): Promise<AuditLog | null> {
    try {
      return await this.executeCreateWithRetry(input);
    } catch (unhandledErr) {
      console.error('[AuditLogService] Catastrophic failure in log():', unhandledErr);
      return null;
    }
  }

  private async executeCreateWithRetry(input: AuditLogInput): Promise<AuditLog | null> {
    let sanitizedDetails: Record<string, unknown> | undefined;
    let sanitizedChanges: AuditLogChange[] | undefined;
    let sanitizedAdditionalObjects: AdditionalAffectedObject[] | undefined;

    try {
      sanitizedDetails = input.details !== undefined ? sanitizeAuditPayload(input.details) : undefined;
      sanitizedChanges = input.changes !== undefined ? sanitizeAuditChanges(input.changes) : undefined;
      sanitizedAdditionalObjects = input.additionalAffectedObjects !== undefined
        ? sanitizeAuditPayload(input.additionalAffectedObjects)
        : undefined;
    } catch (sanitizeErr) {
      console.error('[AuditLogService] Error during payload sanitization, continuing with omitted details:', sanitizeErr);
    }

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

    const createData = {
      companyId: input.companyId,
      category: input.category,
      outcome: input.outcome,
      action: input.action,
      actorId: input.actorId,
      entityType: input.entityType,
      entityId: input.entityId,
      affectedObjectName: input.affectedObjectName,
      searchText,
      authFailureCount: input.authFailureCount !== undefined ? input.authFailureCount : null,
      resolvedAt: input.resolvedAt !== undefined ? input.resolvedAt : null,
      additionalAffectedObjects: sanitizedAdditionalObjects !== undefined
        ? (sanitizedAdditionalObjects as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      changes: sanitizedChanges !== undefined
        ? (sanitizedChanges as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      details: sanitizedDetails !== undefined
        ? (sanitizedDetails as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    };

    // Attempt 1
    try {
      return await prisma.auditLog.create({
        data: createData,
      });
    } catch (firstErr: any) {
      console.warn(
        `[AuditLogService] Audit log write failed on attempt 1 for action "${input.action}". Retrying once...`,
        firstErr?.message
      );

      // Brief delay before single retry
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Attempt 2 (retry once)
      try {
        const result = await prisma.auditLog.create({
          data: createData,
        });
        console.log(`[AuditLogService] Audit log write succeeded on retry attempt 2 for action "${input.action}".`);
        return result;
      } catch (secondErr: any) {
        console.error(
          `[AuditLogService] Audit log write failed on retry attempt 2 for action "${input.action}":`,
          secondErr?.message
        );

        // Sanitize error message to ensure no secrets or tokens leak in alert
        const rawMsg = secondErr instanceof Error ? secondErr.message : String(secondErr);
        const cleanMsg = rawMsg.replace(
          /(password|token|secret|key|hash)=[^&;\s]+/gi,
          '$1=[REDACTED]'
        );

        try {
          await auditWriteFailureAlertService.sendAuditWriteFailureAlert({
            companyId: input.companyId,
            action: input.action,
            entityType: input.entityType,
            entityId: input.entityId,
            affectedObjectName: input.affectedObjectName,
            errorMessage: cleanMsg,
          });
        } catch (alertErr) {
          console.error('[AuditLogService] Failed to dispatch write failure alert email:', alertErr);
        }

        // Return null and NEVER rethrow past this point
        return null;
      }
    }
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
