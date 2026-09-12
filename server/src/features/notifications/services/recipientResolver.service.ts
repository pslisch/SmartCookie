import { MembershipStatus, MembershipType, UserStatus } from '@prisma/client';
import { prisma } from '../../../shared/db/prisma';
import { NotificationEvent, RecipientConfig } from '../types/notificationEvent.types';

/**
 * Resolves recipient user IDs for a given notification rule and domain event.
 *
 * Supported recipient types (Phase 1):
 * - `learner`: the event subject user
 * - `userIds`: explicit list of user IDs in rule configuration
 * - `directManager`: resolved via OU manager membership (single active OU, first active manager by createdAt asc)
 * - `groupIds`: resolved via learning group memberships (direct members only, no cascading)
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

  // 3. Direct manager resolution
  if (recipientConfig.directManager && event.subjectUserId) {
    const memberMembership = await prisma.membership.findFirst({
      where: {
        userId: event.subjectUserId,
        membershipType: MembershipType.MEMBER,
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
        organizationUnitId: { not: null },
      },
      select: {
        organizationUnitId: true,
      },
    });

    if (memberMembership?.organizationUnitId) {
      const managerMembership = await prisma.membership.findFirst({
        where: {
          organizationUnitId: memberMembership.organizationUnitId,
          membershipType: MembershipType.MANAGER,
          status: MembershipStatus.ACTIVE,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          userId: true,
        },
      });

      if (managerMembership?.userId) {
        candidateUserIds.add(managerMembership.userId);
      }
    }
  }

  // 4. Learning group resolution (direct members only)
  if (Array.isArray(recipientConfig.groupIds) && recipientConfig.groupIds.length > 0) {
    const validGroupIds = recipientConfig.groupIds.filter(Boolean);
    if (validGroupIds.length > 0) {
      const groupMemberships = await prisma.membership.findMany({
        where: {
          learningGroupId: { in: validGroupIds },
          status: MembershipStatus.ACTIVE,
          deletedAt: null,
        },
        select: {
          userId: true,
        },
      });

      for (const membership of groupMemberships) {
        if (membership.userId) {
          candidateUserIds.add(membership.userId);
        }
      }
    }
  }

  // 5. Entire company resolution
  if (recipientConfig.entireCompany && event.companyId) {
    const companyUsers = await prisma.user.findMany({
      where: {
        companyId: event.companyId,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    for (const user of companyUsers) {
      candidateUserIds.add(user.id);
    }
  }

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
