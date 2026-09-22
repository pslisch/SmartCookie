import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationType,
  Prisma,
  ScheduledNotification,
  ScheduledNotificationRecurrence,
  ScheduledNotificationStatus,
} from '@prisma/client';
import { prisma } from '../../../shared/db/prisma';
import {
  NotificationChannels,
  NotificationEvent,
  RecipientConfig,
} from '../types/notificationEvent.types';
import { resolveRecipients } from './recipientResolver.service';

/**
 * Computes the next scheduled execution date for recurring notifications.
 *
 * Supported recurrences:
 * - DAILY: +1 calendar day
 * - WEEKLY: +7 calendar days
 * - MONTHLY: +1 calendar month using plain Date month arithmetic.
 *   Note on plain Date month arithmetic:
 *   Using setMonth(getMonth() + 1) exhibits known JavaScript Date end-of-month rollover behavior
 *   (e.g., Jan 31 + 1 month rolls to Mar 3 in non-leap contexts). This is acceptable and expected,
 *   as this is explicitly a simple interval system without arbitrary cron syntax per the specification.
 * - NONE: returns the same Date (not recurring).
 */
export function computeNextExecution(
  current: Date,
  recurrence: ScheduledNotificationRecurrence
): Date {
  const next = new Date(current.getTime());
  switch (recurrence) {
    case ScheduledNotificationRecurrence.DAILY:
      next.setDate(next.getDate() + 1);
      break;
    case ScheduledNotificationRecurrence.WEEKLY:
      next.setDate(next.getDate() + 7);
      break;
    case ScheduledNotificationRecurrence.MONTHLY:
      next.setMonth(next.getMonth() + 1);
      break;
    case ScheduledNotificationRecurrence.NONE:
    default:
      break;
  }
  return next;
}

/**
 * Advances or marks a scheduled notification row after an execution attempt.
 * - For one-off (recurrence: NONE): sets lastExecutedAt = now, leaves nextExecutionAt untouched
 *   (it becomes permanently ineligible via the lastExecutedAt IS NULL check).
 * - For recurring (recurrence !== NONE): sets lastExecutedAt = now and advances nextExecutionAt
 *   by one period.
 */
async function advanceScheduledNotification(
  row: ScheduledNotification,
  now: Date
): Promise<void> {
  const updateData: {
    lastExecutedAt: Date;
    nextExecutionAt?: Date;
  } = {
    lastExecutedAt: now,
  };

  if (row.recurrence !== ScheduledNotificationRecurrence.NONE) {
    updateData.nextExecutionAt = computeNextExecution(row.nextExecutionAt, row.recurrence);
  }

  await prisma.scheduledNotification.update({
    where: { id: row.id },
    data: updateData,
  });
}

/**
 * Processes a single eligible ScheduledNotification row.
 */
async function processSingleScheduledNotification(
  row: ScheduledNotification,
  now: Date
): Promise<void> {
  const sourceEventId = `${row.id}:${row.nextExecutionAt.toISOString()}`;

  // 1. Idempotency check:
  // Mirrors deliveryFailureNotification application-level idempotency pattern.
  // Because ruleId is null, the DB unique constraint on [ruleId, sourceEventType, sourceEventId]
  // does not prevent duplicate rows (MySQL allows multiple rows with NULL in unique indexes).
  const existingInstance = await prisma.notificationInstance.findFirst({
    where: {
      sourceEventType: 'SCHEDULED_NOTIFICATION',
      sourceEventId,
    },
  });

  if (existingInstance) {
    console.log(
      `[ScheduledNotificationFiring] Notification instance already exists for scheduled notification ${row.id} (${sourceEventId}). Skipping instance creation.`
    );
    await advanceScheduledNotification(row, now);
    return;
  }

  // 2. Resolve recipients via resolveRecipients
  const recipientConfig = row.recipientConfig as unknown as RecipientConfig;
  const event: NotificationEvent = {
    companyId: row.companyId,
    notificationType: NotificationType.SYSTEM_ANNOUNCEMENTS, // Placeholder NotificationType to satisfy interface
    sourceEventType: 'SCHEDULED_NOTIFICATION',
    sourceEventId,
    // subjectUserId is required by the NotificationEvent signature, but is never accessed
    // by resolveRecipients when learner and directManager are both false (which is strictly enforced
    // by validation for scheduled notifications). Using createdById (or row.id) satisfies the type.
    subjectUserId: row.createdById || row.id,
  };

  const recipientUserIds = await resolveRecipients(recipientConfig, event);

  // If zero recipients resolve, skip creating anything for this row (same "no point creating an empty
  // notification" principle as the main pipeline) but still advance/mark it as executed so it doesn't get stuck.
  if (recipientUserIds.length > 0) {
    // 3. Create one NotificationInstance
    const instance = await prisma.notificationInstance.create({
      data: {
        ruleId: null,
        companyId: row.companyId,
        sourceEventType: 'SCHEDULED_NOTIFICATION',
        sourceEventId,
        titleKey: row.title,
        bodyKey: row.message,
        titleParams: Prisma.JsonNull,
        bodyParams: Prisma.JsonNull,
        actionEntityType: null,
        actionEntityId: null,
        actionUrl: row.actionUrl,
      },
    });

    // 4. Create NotificationRecipient rows for all resolved users
    await prisma.notificationRecipient.createMany({
      data: recipientUserIds.map((userId) => ({
        notificationInstanceId: instance.id,
        userId,
      })),
      skipDuplicates: true,
    });

    const recipients = await prisma.notificationRecipient.findMany({
      where: {
        notificationInstanceId: instance.id,
        userId: { in: recipientUserIds },
      },
      select: { id: true, userId: true },
    });

    // 5. Create NotificationDelivery rows for enabled channels.
    // IN_LMS as SENT immediately, EMAIL as PENDING (picked up by processPendingEmailDeliveries).
    // Note: Deliberately bypasses per-type NotificationPreference checks per architectural specification.
    const channels = row.channels as unknown as NotificationChannels;
    const deliveries: Array<{
      notificationRecipientId: string;
      channel: NotificationChannel;
      status: NotificationDeliveryStatus;
      sentAt: Date | null;
    }> = [];

    for (const recipient of recipients) {
      if (channels?.inLms) {
        deliveries.push({
          notificationRecipientId: recipient.id,
          channel: NotificationChannel.IN_LMS,
          status: NotificationDeliveryStatus.SENT,
          sentAt: now,
        });
      }
      if (channels?.email) {
        deliveries.push({
          notificationRecipientId: recipient.id,
          channel: NotificationChannel.EMAIL,
          status: NotificationDeliveryStatus.PENDING,
          sentAt: null,
        });
      }
    }

    if (deliveries.length > 0) {
      await prisma.notificationDelivery.createMany({
        data: deliveries,
      });
    }

    console.log(
      `[ScheduledNotificationFiring] Fired scheduled notification ${row.id} for ${recipients.length} recipient(s) on enabled channels.`
    );
  } else {
    console.log(
      `[ScheduledNotificationFiring] Scheduled notification ${row.id} resolved 0 recipients. Skipping instance creation.`
    );
  }

  // 6. After processing (whether or not recipients resolved), update the row:
  await advanceScheduledNotification(row, now);
}

/**
 * Background worker task to find due ScheduledNotification rows and trigger their execution.
 *
 * Termination is handled entirely through the selection query:
 * - One-off (recurrence: NONE) rows are only eligible when lastExecutedAt IS NULL.
 * - Recurring rows are only eligible when nextExecutionAt <= endAt.
 *   Once nextExecutionAt advances past endAt, the row naturally stops being selected.
 *   Its status stays ACTIVE forever (there is no "expired" enum value in the schema).
 *   Note: A future frontend can derive an "Expired" display state client-side
 *   (nextExecutionAt > endAt) without needing a stored database column or enum value.
 */
export async function processScheduledNotifications(): Promise<void> {
  const now = new Date();

  // Query candidate rows due for execution.
  // Note: comparing nextExecutionAt <= endAt directly in SQL across two columns cannot be expressed
  // as a single simple Prisma filter alongside the one-off check, so candidates due at or before 'now'
  // are fetched first, and recurring endAt bounds are evaluated in application logic below.
  const candidates = await prisma.scheduledNotification.findMany({
    where: {
      status: ScheduledNotificationStatus.ACTIVE,
      deletedAt: null,
      nextExecutionAt: { lte: now },
    },
    orderBy: {
      nextExecutionAt: 'asc',
    },
  });

  if (candidates.length === 0) {
    return;
  }

  // Filter candidates based on termination rules
  const eligibleRows = candidates.filter((row) => {
    // One-off: only eligible if never executed yet
    if (row.recurrence === ScheduledNotificationRecurrence.NONE) {
      return row.lastExecutedAt === null;
    }

    // Recurring: only eligible if nextExecutionAt is within endAt bounds
    if (row.endAt && row.nextExecutionAt > row.endAt) {
      return false;
    }

    return true;
  });

  if (eligibleRows.length === 0) {
    return;
  }

  console.log(
    `[ScheduledNotificationFiring] Found ${eligibleRows.length} due scheduled notification(s) to process.`
  );

  for (const row of eligibleRows) {
    try {
      await processSingleScheduledNotification(row, now);
    } catch (error) {
      console.error(
        `[ScheduledNotificationFiring] Error processing scheduled notification ${row.id}:`,
        error
      );
    }
  }
}
