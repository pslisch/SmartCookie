import { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/db/prisma';
import { NotificationEvent, RecipientConfig } from '../types/notificationEvent.types';
import { resolveRecipients } from './recipientResolver.service';

/**
 * Processes a domain notification event through the core notification pipeline:
 *
 * Stage 1: Rule Resolution - Queries enabled NotificationRules matching companyId and notificationType.
 * Stage 2: Recipient Resolution - Resolves distinct candidate user IDs (learner, userIds, etc.).
 * Stage 3: Deduplication & Idempotency - Upserts NotificationInstance keyed by (ruleId, sourceEventType, sourceEventId)
 *          and persists NotificationRecipient rows with skipDuplicates: true.
 *
 * NOTE: Channel delivery (creating NotificationDelivery records and dispatching via IN_LMS / EMAIL)
 * is out of scope for this function and is handled by a later pipeline stage (Task 5). This function
 * intentionally does NOT create any NotificationDelivery records.
 *
 * @param event The domain notification event to process
 */
export async function processNotificationEvent(event: NotificationEvent): Promise<void> {
  // Step 1: Query all enabled NotificationRule rows matching companyId and notificationType (not deleted)
  const rules = await prisma.notificationRule.findMany({
    where: {
      companyId: event.companyId,
      notificationType: event.notificationType,
      enabled: true,
      deletedAt: null,
    },
  });

  // Step 2: If no rules match, return early (no-op, not an error)
  if (rules.length === 0) {
    return;
  }

  // Step 3-5: Process each matching rule
  for (const rule of rules) {
    // Cast rule.recipientConfig from Prisma.JsonValue to strongly-typed RecipientConfig.
    // This cast is required because Prisma represents database JSON columns as JsonValue.
    const recipientConfig = rule.recipientConfig as unknown as RecipientConfig;

    const resolvedUserIds = await resolveRecipients(recipientConfig, event);

    // If zero recipients resolve, skip creating an instance for this rule
    if (resolvedUserIds.length === 0) {
      continue;
    }

    // Step 4: Idempotently find or create the NotificationInstance
    const instance = await prisma.notificationInstance.upsert({
      where: {
        ruleId_sourceEventType_sourceEventId: {
          ruleId: rule.id,
          sourceEventType: event.sourceEventType,
          sourceEventId: event.sourceEventId,
        },
      },
      create: {
        companyId: event.companyId,
        ruleId: rule.id,
        sourceEventType: event.sourceEventType,
        sourceEventId: event.sourceEventId,
        titleKey: rule.titleKey ?? null,
        titleParams: event.titleParams
          ? (event.titleParams as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        bodyKey: rule.bodyKey ?? null,
        bodyParams: event.bodyParams
          ? (event.bodyParams as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        actionType: event.actionType ?? rule.actionType ?? null,
        actionEntityType: event.actionEntityType ?? null,
        actionEntityId: event.actionEntityId ?? null,
        actionUrl: event.actionUrl ?? rule.actionUrl ?? null,
      },
      update: {}, // Reprocessing the same source event is a true no-op
    });

    // Step 5: Create NotificationRecipient rows with skipDuplicates to ensure DB-level dedup
    await prisma.notificationRecipient.createMany({
      data: resolvedUserIds.map((userId) => ({
        notificationInstanceId: instance.id,
        userId,
      })),
      skipDuplicates: true,
    });
  }
}
