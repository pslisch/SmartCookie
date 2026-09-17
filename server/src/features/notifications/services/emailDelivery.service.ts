import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from '@prisma/client';
import { prisma } from '../../../shared/db/prisma';
import { emailService } from '../../../shared/email/email.service';
import { notifyDeliveryFailure } from './deliveryFailureNotification.service';

/**
 * Interpolates parameter values into placeholder expressions (e.g. {{paramName}}).
 * If a placeholder key is missing from params, the placeholder text remains unchanged.
 * If template is null or undefined, returns an empty string.
 */
export function interpolate(
  template: string | null | undefined,
  params: Record<string, unknown> | null | undefined
): string {
  if (!template) {
    return '';
  }
  if (!params || typeof params !== 'object') {
    return template;
  }
  return template.replace(/\{\{([^}]+)\}\}/g, (match, rawKey: string) => {
    const key = rawKey.trim();
    if (key in params && params[key] !== undefined && params[key] !== null) {
      return String(params[key]);
    }
    return match;
  });
}

/**
 * Processes pending or eligible retry email deliveries as part of the periodic scheduler tick.
 *
 * Eligible states:
 * - First attempt: `status: PENDING` and `attemptCount: 0`
 * - Single retry:   `status: FAILED` and `attemptCount: 1`
 *
 * Lifecycle:
 * - If recipient has no valid email address: immediately set to `PERMANENTLY_FAILED` (never attempted via SMTP).
 * - On send success: set to `SENT` with `sentAt: now`.
 * - On first failure: increment attemptCount to 1, set to `FAILED` (eligible for retry on next scheduler run).
 * - On second failure: increment attemptCount to 2, set to `PERMANENTLY_FAILED` (never attempted again).
 */
export async function processPendingEmailDeliveries(): Promise<void> {
  const eligibleDeliveries = await prisma.notificationDelivery.findMany({
    where: {
      channel: NotificationChannel.EMAIL,
      OR: [
        {
          status: NotificationDeliveryStatus.PENDING,
          attemptCount: 0,
        },
        {
          status: NotificationDeliveryStatus.FAILED,
          attemptCount: 1,
        },
      ],
    },
    include: {
      notificationRecipient: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
            },
          },
          notificationInstance: {
            select: {
              id: true,
              companyId: true,
              titleKey: true,
              titleParams: true,
              bodyKey: true,
              bodyParams: true,
              actionUrl: true,
              actionEntityType: true,
              actionEntityId: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (eligibleDeliveries.length === 0) {
    return;
  }

  for (const delivery of eligibleDeliveries) {
    const now = new Date();
    const recipient = delivery.notificationRecipient;
    const user = recipient?.user;
    const instance = recipient?.notificationInstance;
    const recipientEmail = user?.email?.trim();

    // If the recipient user has no email address on file, permanently fail immediately without sending.
    if (!recipientEmail) {
      try {
        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: NotificationDeliveryStatus.PERMANENTLY_FAILED,
            attemptCount: { increment: 1 },
            lastAttemptAt: now,
            errorMessage: 'No valid email address on file for this user.',
          },
        });
      } catch (updateErr) {
        console.error(`[EmailDelivery] Failed to update delivery ${delivery.id} with missing email:`, updateErr);
      }

      try {
        await notifyDeliveryFailure({
          id: delivery.id,
          notificationRecipientId: delivery.notificationRecipientId,
        });
      } catch (notifyErr) {
        console.error(
          `[EmailDelivery] Failed to trigger delivery failure notification for delivery ${delivery.id}:`,
          notifyErr
        );
      }

      continue;
    }

    // Safely extract param objects
    const titleParams =
      instance?.titleParams && typeof instance.titleParams === 'object' && !Array.isArray(instance.titleParams)
        ? (instance.titleParams as Record<string, unknown>)
        : null;

    const bodyParams =
      instance?.bodyParams && typeof instance.bodyParams === 'object' && !Array.isArray(instance.bodyParams)
        ? (instance.bodyParams as Record<string, unknown>)
        : null;

    // Render title and body placeholders
    const title = interpolate(instance?.titleKey, titleParams);
    const body = interpolate(instance?.bodyKey, bodyParams);
    const actionUrl = instance?.actionUrl ?? undefined;

    try {
      await emailService.send(
        recipientEmail,
        'generic-notification',
        {
          title,
          body,
          actionUrl,
        },
        instance?.companyId
      );

      // On success: mark as SENT
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.SENT,
          sentAt: now,
          attemptCount: { increment: 1 },
          lastAttemptAt: now,
          errorMessage: null,
        },
      });
    } catch (sendError) {
      const errorMessage = sendError instanceof Error ? sendError.message : String(sendError);
      const newAttemptCount = delivery.attemptCount + 1;
      const newStatus =
        newAttemptCount >= 2
          ? NotificationDeliveryStatus.PERMANENTLY_FAILED
          : NotificationDeliveryStatus.FAILED;

      console.error(
        `[EmailDelivery] Failed sending email delivery ${delivery.id} to ${recipientEmail} (Attempt ${newAttemptCount}):`,
        sendError
      );

      try {
        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: newStatus,
            attemptCount: { increment: 1 },
            lastAttemptAt: now,
            errorMessage,
          },
        });
      } catch (updateErr) {
        console.error(`[EmailDelivery] Failed to record error state for delivery ${delivery.id}:`, updateErr);
      }

      if (newStatus === NotificationDeliveryStatus.PERMANENTLY_FAILED) {
        try {
          await notifyDeliveryFailure({
            id: delivery.id,
            notificationRecipientId: delivery.notificationRecipientId,
          });
        } catch (notifyErr) {
          console.error(
            `[EmailDelivery] Failed to trigger delivery failure notification for delivery ${delivery.id}:`,
            notifyErr
          );
        }
      }
    }
  }
}
