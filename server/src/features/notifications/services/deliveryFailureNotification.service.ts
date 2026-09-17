import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from '@prisma/client';
import { prisma } from '../../../shared/db/prisma';
import { permissionResolverService } from '../../rbac/services/permissionResolver.service';
import { interpolate } from './emailDelivery.service';

/**
 * Notifies all users in the company who hold the 'notifications:view-delivery-failures'
 * permission when an email delivery reaches PERMANENTLY_FAILED.
 *
 * This path is direct and non-rule-driven: recipients are dynamically resolved at failure
 * time based on current RBAC permission holdings.
 *
 * An in-LMS notification is created for each permission holder. Deliberately, no EMAIL channel
 * is generated to prevent a failure-notifying-about-a-failure infinite loop.
 */
export async function notifyDeliveryFailure(delivery: {
  id: string;
  notificationRecipientId: string;
}): Promise<void> {
  try {
    // 1. Application-level idempotency check:
    // MySQL considers NULL distinct in unique constraints, so [ruleId, sourceEventType, sourceEventId]
    // where ruleId is null will not block duplicate rows at the database level.
    const existingInstance = await prisma.notificationInstance.findFirst({
      where: {
        sourceEventType: 'EMAIL_DELIVERY_PERMANENTLY_FAILED',
        sourceEventId: delivery.id,
      },
    });

    if (existingInstance) {
      console.log(
        `[DeliveryFailureNotification] Notification instance already exists for failed delivery ${delivery.id}. Skipping.`
      );
      return;
    }

    // 2. Look up the failed delivery's context
    const failedDelivery = await prisma.notificationDelivery.findUnique({
      where: { id: delivery.id },
      include: {
        notificationRecipient: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                companyId: true,
              },
            },
            notificationInstance: {
              select: {
                id: true,
                companyId: true,
                titleKey: true,
                titleParams: true,
              },
            },
          },
        },
      },
    });

    if (!failedDelivery || !failedDelivery.notificationRecipient) {
      console.warn(
        `[DeliveryFailureNotification] Failed delivery ${delivery.id} or its recipient could not be found.`
      );
      return;
    }

    const recipientUser = failedDelivery.notificationRecipient.user;
    const origInstance = failedDelivery.notificationRecipient.notificationInstance;
    const companyId = recipientUser?.companyId || origInstance?.companyId;

    if (!companyId) {
      console.warn(
        `[DeliveryFailureNotification] Unable to resolve companyId for failed delivery ${delivery.id}. Skipping.`
      );
      return;
    }

    const recipientEmail = recipientUser?.email?.trim() || 'unknown';

    // Interpolate original notification's human-readable title
    const titleParams =
      origInstance?.titleParams &&
      typeof origInstance.titleParams === 'object' &&
      !Array.isArray(origInstance.titleParams)
        ? (origInstance.titleParams as Record<string, unknown>)
        : null;

    const originalTitle = interpolate(origInstance?.titleKey, titleParams);

    // 3. Query all users in that company to find who holds 'notifications:view-delivery-failures'
    const companyUsers = await prisma.user.findMany({
      where: { companyId },
      select: { id: true },
    });

    const allUserIds = companyUsers.map((u) => u.id);
    if (allUserIds.length === 0) {
      console.log(
        `[DeliveryFailureNotification] No users found in company ${companyId}. Skipping notification.`
      );
      return;
    }

    const recipientUserIds = await permissionResolverService.filterUsersWithPermission(
      allUserIds,
      'notifications',
      'view-delivery-failures'
    );

    if (recipientUserIds.length === 0) {
      console.log(
        `[DeliveryFailureNotification] No users in company ${companyId} hold the 'notifications:view-delivery-failures' permission. Skipping notification.`
      );
      return;
    }

    // 4. Create one shared NotificationInstance
    const instance = await prisma.notificationInstance.create({
      data: {
        ruleId: null,
        companyId,
        sourceEventType: 'EMAIL_DELIVERY_PERMANENTLY_FAILED',
        sourceEventId: delivery.id,
        titleKey: 'Email Delivery Failed',
        bodyKey:
          'Failed to deliver a notification email to {{recipientEmail}} after retry. Original notification: "{{originalTitle}}".',
        bodyParams: {
          recipientEmail,
          originalTitle,
        },
        actionEntityType: null,
        actionEntityId: null,
        actionUrl: null,
      },
    });

    // 5. Create NotificationRecipient rows for all resolved permission holders
    await prisma.notificationRecipient.createMany({
      data: recipientUserIds.map((userId) => ({
        notificationInstanceId: instance.id,
        userId,
      })),
      skipDuplicates: true,
    });

    // Retrieve recipient records with IDs to create deliveries
    const recipients = await prisma.notificationRecipient.findMany({
      where: {
        notificationInstanceId: instance.id,
        userId: { in: recipientUserIds },
      },
      select: { id: true },
    });

    // 6. Create IN_LMS deliveries for each recipient.
    // NOTE: Deliberately IN_LMS only — no EMAIL channel is created to prevent
    // an email delivery failure alert from triggering an email failure loop.
    const now = new Date();
    await prisma.notificationDelivery.createMany({
      data: recipients.map((r) => ({
        notificationRecipientId: r.id,
        channel: NotificationChannel.IN_LMS,
        status: NotificationDeliveryStatus.SENT,
        sentAt: now,
      })),
    });

    console.log(
      `[DeliveryFailureNotification] Notified ${recipients.length} permission holder(s) in company ${companyId} for delivery failure ${delivery.id}.`
    );
  } catch (error) {
    // Errors are logged and swallowed so failure notifications never disrupt the scheduler poller
    console.error(
      `[DeliveryFailureNotification] Failed to notify delivery failure for delivery ${delivery.id}:`,
      error
    );
  }
}
