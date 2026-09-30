import { prisma } from '../db/prisma';
import { emailService } from '../email/email.service';
import { permissionResolverService } from '../../features/rbac/services/permissionResolver.service';
import { AuditLogFailureData } from '../email/templates/auditLogFailure';
import { AuditLogSystemProblemData } from '../email/templates/auditLogSystemProblem';

export interface AuditWriteFailureContext {
  companyId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  affectedObjectName: string;
  errorMessage: string;
}

export class AuditWriteFailureAlertService {
  /**
   * Resolves notification recipients for audit write failures:
   * (permission holders of 'audit:receive-failure-alerts' for that company)
   * UNION
   * (company.settings.auditLogFailureAlertRecipients, deduped by email).
   */
  async resolveRecipients(companyId: string): Promise<string[]> {
    const recipientEmails = new Set<string>();

    // 1. Resolve users belonging to that company who hold 'audit:receive-failure-alerts'
    try {
      const companyUsers = await prisma.user.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          email: true,
        },
      });

      const userIds = companyUsers.map((u) => u.id);
      if (userIds.length > 0) {
        const authorizedUserIds = await permissionResolverService.filterUsersWithPermission(
          userIds,
          'audit',
          'receive-failure-alerts'
        );

        for (const u of companyUsers) {
          if (authorizedUserIds.includes(u.id) && u.email && u.email.trim()) {
            recipientEmails.add(u.email.trim().toLowerCase());
          }
        }
      }
    } catch (err) {
      console.error(
        `[AuditWriteFailureAlert] Failed to resolve permission-based recipients for company ${companyId}:`,
        err
      );
    }

    // 2. Extra alert recipients from company.settings.auditLogFailureAlertRecipients
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { settings: true },
      });

      const settings =
        company?.settings && typeof company.settings === 'object' && !Array.isArray(company.settings)
          ? (company.settings as Record<string, unknown>)
          : {};

      const extraRecipients = settings.auditLogFailureAlertRecipients;
      if (Array.isArray(extraRecipients)) {
        for (const email of extraRecipients) {
          if (typeof email === 'string' && email.trim()) {
            recipientEmails.add(email.trim().toLowerCase());
          }
        }
      }
    } catch (err) {
      console.error(
        `[AuditWriteFailureAlert] Failed to resolve configured settings recipients for company ${companyId}:`,
        err
      );
    }

    return Array.from(recipientEmails);
  }

  /**
   * Sends the failure alert with retry and fallback logic:
   * 1. Send 'audit-log-failure' template.
   * 2. If send() throws, retry once.
   * 3. If retry also throws: send 'audit-log-system-problem' template instead (no payload details).
   * 4. If that also fails, log to console and stop (no further retries, no third template).
   */
  async sendAuditWriteFailureAlert(context: AuditWriteFailureContext): Promise<void> {
    try {
      const recipients = await this.resolveRecipients(context.companyId);
      if (recipients.length === 0) {
        console.warn(
          `[AuditWriteFailureAlert] No failure alert recipients resolved for company ${context.companyId}. Alert email not dispatched.`
        );
        return;
      }

      const timestamp = new Date().toISOString();
      const failureData: AuditLogFailureData = {
        failureDescription: 'An audit log entry could not be written to the database after retry.',
        action: context.action,
        affectedObjectName: context.affectedObjectName,
        entityType: context.entityType,
        entityId: context.entityId,
        timestamp,
        errorMessage: context.errorMessage,
      };

      for (const email of recipients) {
        let sent = false;

        // Attempt 1: primary template
        try {
          await emailService.send(email, 'audit-log-failure', failureData, context.companyId);
          sent = true;
        } catch (firstErr) {
          console.warn(
            `[AuditWriteFailureAlert] First attempt to send audit-log-failure email to ${email} failed, retrying once:`,
            firstErr
          );

          // Brief delay before retry
          await new Promise((resolve) => setTimeout(resolve, 200));

          // Attempt 2: retry primary template once
          try {
            await emailService.send(email, 'audit-log-failure', failureData, context.companyId);
            sent = true;
          } catch (retryErr) {
            console.error(
              `[AuditWriteFailureAlert] Retry failed to send audit-log-failure email to ${email}:`,
              retryErr
            );
          }
        }

        // If primary template failed both times, attempt fallback template
        if (!sent) {
          try {
            const systemProblemData: AuditLogSystemProblemData = {
              timestamp,
              message:
                'The Audit Log system has encountered a critical problem and cannot record audit events or deliver detailed failure reports.',
            };
            await emailService.send(
              email,
              'audit-log-system-problem',
              systemProblemData,
              context.companyId
            );
          } catch (fallbackErr) {
            console.error(
              `[AuditWriteFailureAlert] Fallback audit-log-system-problem email to ${email} also failed. Stopping further attempts:`,
              fallbackErr
            );
          }
        }
      }
    } catch (unhandledErr) {
      console.error(
        '[AuditWriteFailureAlert] Unhandled error during failure alert dispatch:',
        unhandledErr
      );
    }
  }
}

export const auditWriteFailureAlertService = new AuditWriteFailureAlertService();
