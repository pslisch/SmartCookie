import { UserStatus } from '@prisma/client';
import { prisma } from '../../../shared/db/prisma';
import { NotificationEvent, RecipientConfig } from '../types/notificationEvent.types';

/**
 * Resolves recipient user IDs for a given notification rule and domain event.
 *
 * Current scope (Task 3):
 * - `learner`: the event subject user
 * - `userIds`: explicit list of user IDs in rule configuration
 *
 * Extension points for Task 4:
 * - `directManager`: resolved via OU manager membership
 * - `groupIds`: resolved via learning group memberships
 * - `entireCompany`: resolved to all active users within the company
 */
export async function resolveRecipients(
  recipientConfig: RecipientConfig,
  event: NotificationEvent
): Promise<string[]> {
  const candidateUserIds = new Set<string>();

  // 1. Learner resolution (subject user)
  if (recipientConfig.learner && event.subjectUserId) {
    candidateUserIds.add(event.subjectUserId);
  }

  // 2. Explicit user IDs resolution
  if (Array.isArray(recipientConfig.userIds) && recipientConfig.userIds.length > 0) {
    for (const userId of recipientConfig.userIds) {
      if (userId) {
        candidateUserIds.add(userId);
      }
    }
  }

  // 3. Direct manager resolution (Extension point - to be implemented in Task 4)
  // if (recipientConfig.directManager) { ... }

  // 4. Learning group resolution (Extension point - to be implemented in Task 4)
  // if (Array.isArray(recipientConfig.groupIds) && recipientConfig.groupIds.length > 0) { ... }

  // 5. Entire company resolution (Extension point - to be implemented in Task 4)
  // if (recipientConfig.entireCompany) { ... }

  if (candidateUserIds.size === 0) {
    return [];
  }

  // Filter out any users that are not currently ACTIVE
  const activeUsers = await prisma.user.findMany({
    where: {
      id: { in: Array.from(candidateUserIds) },
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
    },
  });

  return activeUsers.map((user) => user.id);
}
