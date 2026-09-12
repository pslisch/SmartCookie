import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationType,
} from '@prisma/client';
import { prisma } from '../../../shared/db/prisma';
import { NotificationChannels } from '../types/notificationEvent.types';

/**
 * Creates per-channel NotificationDelivery records for all resolved recipients of a notification instance.
 *
 * Mandatory vs. Preference rules:
 * 1. A channel disabled in `rule.channels` is NEVER delivered under any circumstances.
 * 2. If `rule.mandatory` is `true`, deliveries are created for every channel enabled in `rule.channels`,
 *    bypassing the recipient's personal `NotificationPreference`.
 * 3. If `rule.mandatory` is `false`, deliveries are created only if the recipient's `NotificationPreference`
 *    for this `notificationType` has that channel enabled (`inLmsEnabled` / `emailEnabled`).
 *    If no preference record exists for the user, it defaults to enabled (opt-out model).
 *
 * Delivery status:
 * - `IN_LMS`: Created with `status: SENT` and `sentAt: new Date()` (immediately active for the in-LMS Hub).
 * - `EMAIL`: Created with `status: PENDING` and `sentAt: null` (actual sending is handled asynchronously).
 *
 * Idempotency:
 * - Before creating deliveries, existing deliveries for the recipient rows are queried.
 * - Any `(recipientId, channel)` combination already present is skipped, guaranteeing safe re-processing.
 *
 * @param instance The notification instance record (id, ruleId)
 * @param rule The notification rule configuration (mandatory, channels, notificationType)
 * @param recipientUserIds List of resolved active user IDs to deliver to
 */
export async function createDeliveriesForInstance(
  instance: { id: string; ruleId?: string | null },
  rule: { mandatory: boolean; channels: unknown; notificationType: NotificationType },
  recipientUserIds: string[]
): Promise<void> {
  if (recipientUserIds.length === 0) {
    return;
  }

  // Cast rule.channels from Prisma.JsonValue to strongly-typed NotificationChannels.
  // Prisma types JSON columns as JsonValue; unknown cast ensures strict type safety.
  const channels = rule.channels as unknown as NotificationChannels;
  const ruleInLms = Boolean(channels?.inLms);
  const ruleEmail = Boolean(channels?.email);

  // If neither channel is enabled on the rule itself, no deliveries can be created
  if (!ruleInLms && !ruleEmail) {
    return;
  }

  // Fetch the NotificationRecipient records for this instance to obtain their IDs
  const recipientRows = await prisma.notificationRecipient.findMany({
    where: {
      notificationInstanceId: instance.id,
      userId: { in: recipientUserIds },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (recipientRows.length === 0) {
    return;
  }

  // Query existing deliveries for these recipients to protect against duplicate rows on re-runs.
  // We check existing deliveries by (notificationRecipientId, channel) because NotificationDelivery
  // does not have a compound unique constraint on those two columns in the schema.
  const existingDeliveries = await prisma.notificationDelivery.findMany({
    where: {
      notificationRecipientId: { in: recipientRows.map((r) => r.id) },
    },
    select: {
      notificationRecipientId: true,
      channel: true,
    },
  });

  const existingDeliverySet = new Set<string>(
    existingDeliveries.map((d) => `${d.notificationRecipientId}:${d.channel}`)
  );

  // If rule is not mandatory, load user preferences in a single batch query
  const prefByUser = new Map<string, { inLmsEnabled: boolean; emailEnabled: boolean }>();
  if (!rule.mandatory) {
    const preferences = await prisma.notificationPreference.findMany({
      where: {
        userId: { in: recipientRows.map((r) => r.userId) },
        notificationType: rule.notificationType,
      },
      select: {
        userId: true,
        inLmsEnabled: true,
        emailEnabled: true,
      },
    });

    for (const pref of preferences) {
      prefByUser.set(pref.userId, {
        inLmsEnabled: pref.inLmsEnabled,
        emailEnabled: pref.emailEnabled,
      });
    }
  }

  const now = new Date();
  const deliveriesToCreate: Array<{
    notificationRecipientId: string;
    channel: NotificationChannel;
    status: NotificationDeliveryStatus;
    sentAt: Date | null;
  }> = [];

  for (const recipient of recipientRows) {
    let userInLms = true;
    let userEmail = true;

    if (!rule.mandatory) {
      const userPref = prefByUser.get(recipient.userId);
      if (userPref) {
        userInLms = userPref.inLmsEnabled;
        userEmail = userPref.emailEnabled;
      }
      // If no preference record exists, defaults to true (opt-out model)
    }

    // Determine IN_LMS delivery
    if (ruleInLms && userInLms) {
      const key = `${recipient.id}:${NotificationChannel.IN_LMS}`;
      if (!existingDeliverySet.has(key)) {
        deliveriesToCreate.push({
          notificationRecipientId: recipient.id,
          channel: NotificationChannel.IN_LMS,
          status: NotificationDeliveryStatus.SENT,
          sentAt: now,
        });
        existingDeliverySet.add(key);
      }
    }

    // Determine EMAIL delivery
    if (ruleEmail && userEmail) {
      const key = `${recipient.id}:${NotificationChannel.EMAIL}`;
      if (!existingDeliverySet.has(key)) {
        deliveriesToCreate.push({
          notificationRecipientId: recipient.id,
          channel: NotificationChannel.EMAIL,
          status: NotificationDeliveryStatus.PENDING,
          sentAt: null,
        });
        existingDeliverySet.add(key);
      }
    }
  }

  if (deliveriesToCreate.length > 0) {
    await prisma.notificationDelivery.createMany({
      data: deliveriesToCreate,
    });
  }
}
