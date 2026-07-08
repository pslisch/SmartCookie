import { prisma } from '../../../shared/db/prisma';
import { UserAssignmentInstanceStatus, AssignmentSourceType, MembershipStatus, AssignmentStatus } from '@prisma/client';
import { auditLogService } from '../../../shared/audit/auditLog.service';

export class MembershipAssignmentHooksService {
  /**
   * Called immediately after a Membership is successfully created/activated.
   * Checks for any ACTIVE Assignment targeting this OU/group or its ancestor OUs,
   * materializes the instance for the user, calculates the due date relative to join date,
   * and creates the corresponding UserAssignmentInstanceSource.
   */
  async onMembershipCreated(membershipId: string, baseDate?: Date): Promise<void> {
    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership || membership.deletedAt !== null || membership.status !== MembershipStatus.ACTIVE) {
      return;
    }

    const { userId, organizationUnitId, learningGroupId, createdAt } = membership;
    const effectiveDate = baseDate || createdAt;

    if (organizationUnitId) {
      // Joining an OU (including a descendant OU)
      // Get all ancestor OUs of this OU (including itself)
      const ancestorOuIds = await this.getAncestorOUs(organizationUnitId);

      // Find any active assignments targeting any of these ancestor OUs
      const targets = await prisma.assignmentTarget.findMany({
        where: {
          organizationUnitId: { in: ancestorOuIds },
          assignment: {
            status: AssignmentStatus.ACTIVE,
            deletedAt: null,
          },
        },
        include: { assignment: true },
      });

      for (const target of targets) {
        const assignment = target.assignment;
        let candidateDueDate: Date | null = null;

        if (assignment.dueDateDefaultDays !== null && assignment.dueDateDefaultDays !== undefined) {
          candidateDueDate = new Date(effectiveDate.getTime());
          candidateDueDate.setDate(candidateDueDate.getDate() + assignment.dueDateDefaultDays);
        }

        let isCreated = false;
        let instanceId = '';

        await prisma.$transaction(async (tx) => {
          let instance = await tx.userAssignmentInstance.findUnique({
            where: {
              assignmentId_userId: {
                assignmentId: assignment.id,
                userId,
              },
            },
          });

          if (!instance) {
            instance = await tx.userAssignmentInstance.create({
              data: {
                assignmentId: assignment.id,
                userId,
                status: UserAssignmentInstanceStatus.ACTIVE,
                dueDate: candidateDueDate,
              },
            });
            isCreated = true;
          } else {
            // Reactivate if cancelled or archived, and take the earliest of current due date and candidate join-relative due date
            const currentDueDate = instance.dueDate;
            const finalDueDate = currentDueDate && candidateDueDate
              ? new Date(Math.min(currentDueDate.getTime(), candidateDueDate.getTime()))
              : candidateDueDate || currentDueDate;

            const statusesToReactivate: UserAssignmentInstanceStatus[] = [
              UserAssignmentInstanceStatus.CANCELLED,
              UserAssignmentInstanceStatus.ARCHIVED,
            ];

            const newStatus = statusesToReactivate.includes(instance.status)
              ? UserAssignmentInstanceStatus.ACTIVE
              : instance.status;

            instance = await tx.userAssignmentInstance.update({
              where: { id: instance.id },
              data: {
                status: newStatus,
                dueDate: finalDueDate,
              },
            });
          }

          instanceId = instance.id;

          // Find or create UserAssignmentInstanceSource for this ancestor OU trigger
          const existingSource = await tx.userAssignmentInstanceSource.findFirst({
            where: {
              userAssignmentInstanceId: instance.id,
              sourceType: AssignmentSourceType.ORGANIZATION_UNIT,
              sourceOrganizationUnitId: target.organizationUnitId,
            },
          });

          if (!existingSource) {
            await tx.userAssignmentInstanceSource.create({
              data: {
                userAssignmentInstanceId: instance.id,
                sourceType: AssignmentSourceType.ORGANIZATION_UNIT,
                sourceOrganizationUnitId: target.organizationUnitId,
              },
            });
          }
        });

        if (isCreated && instanceId) {
          await auditLogService.log(
            assignment.companyId,
            'UserAssignmentInstance',
            instanceId,
            'CREATED',
            assignment.createdById
          );
        }
      }
    } else if (learningGroupId) {
      // Joining a Learning Group
      // Find active assignments targeting this learning group
      const targets = await prisma.assignmentTarget.findMany({
        where: {
          learningGroupId,
          assignment: {
            status: AssignmentStatus.ACTIVE,
            deletedAt: null,
          },
        },
        include: { assignment: true },
      });

      for (const target of targets) {
        const assignment = target.assignment;
        let candidateDueDate: Date | null = null;

        if (assignment.dueDateDefaultDays !== null && assignment.dueDateDefaultDays !== undefined) {
          candidateDueDate = new Date(effectiveDate.getTime());
          candidateDueDate.setDate(candidateDueDate.getDate() + assignment.dueDateDefaultDays);
        }

        let isCreated = false;
        let instanceId = '';

        await prisma.$transaction(async (tx) => {
          let instance = await tx.userAssignmentInstance.findUnique({
            where: {
              assignmentId_userId: {
                assignmentId: assignment.id,
                userId,
              },
            },
          });

          if (!instance) {
            instance = await tx.userAssignmentInstance.create({
              data: {
                assignmentId: assignment.id,
                userId,
                status: UserAssignmentInstanceStatus.ACTIVE,
                dueDate: candidateDueDate,
              },
            });
            isCreated = true;
          } else {
            const currentDueDate = instance.dueDate;
            const finalDueDate = currentDueDate && candidateDueDate
              ? new Date(Math.min(currentDueDate.getTime(), candidateDueDate.getTime()))
              : candidateDueDate || currentDueDate;

            const statusesToReactivateGroups: UserAssignmentInstanceStatus[] = [
              UserAssignmentInstanceStatus.CANCELLED,
              UserAssignmentInstanceStatus.ARCHIVED,
            ];

            const newStatus = statusesToReactivateGroups.includes(instance.status)
              ? UserAssignmentInstanceStatus.ACTIVE
              : instance.status;

            instance = await tx.userAssignmentInstance.update({
              where: { id: instance.id },
              data: {
                status: newStatus,
                dueDate: finalDueDate,
              },
            });
          }

          instanceId = instance.id;

          // Find or create UserAssignmentInstanceSource for this group target trigger
          const existingSource = await tx.userAssignmentInstanceSource.findFirst({
            where: {
              userAssignmentInstanceId: instance.id,
              sourceType: AssignmentSourceType.LEARNING_GROUP,
              sourceLearningGroupId: target.learningGroupId,
            },
          });

          if (!existingSource) {
            await tx.userAssignmentInstanceSource.create({
              data: {
                userAssignmentInstanceId: instance.id,
                sourceType: AssignmentSourceType.LEARNING_GROUP,
                sourceLearningGroupId: target.learningGroupId,
              },
            });
          }
        });

        if (isCreated && instanceId) {
          await auditLogService.log(
            assignment.companyId,
            'UserAssignmentInstance',
            instanceId,
            'CREATED',
            assignment.createdById
          );
        }
      }
    }
  }

  /**
   * Called immediately when a Membership is soft-deleted (user leaves).
   * Finds any sources attributable to the membership, removes them, and
   * CANCELs the UserAssignmentInstance if no active sources remain.
   */
  async onMembershipDeleted(userId: string, orgUnitId: string | null, groupId: string | null): Promise<void> {
    // Find all active/scheduled instances for the user
    const instances = await prisma.userAssignmentInstance.findMany({
      where: {
        userId,
        status: { in: [UserAssignmentInstanceStatus.ACTIVE, UserAssignmentInstanceStatus.SCHEDULED] },
      },
      include: { sources: true },
    });

    for (const instance of instances) {
      const sourcesToDelete: string[] = [];

      for (const src of instance.sources) {
        if (orgUnitId && src.sourceType === AssignmentSourceType.ORGANIZATION_UNIT && src.sourceOrganizationUnitId) {
          // If they left orgUnitId, does this source (sourceOrganizationUnitId) depend on that membership?
          // It depends on it if orgUnitId is a descendant of (or equal to) sourceOrganizationUnitId,
          // because they qualified for sourceOrganizationUnitId's assignment via their membership in orgUnitId.
          const isDescendantOrEqual = await this.isOUMemberOf(orgUnitId, src.sourceOrganizationUnitId);
          if (isDescendantOrEqual) {
            // Check if they have ANY other active membership that would qualify them for sourceOrganizationUnitId
            const stillQualifies = await this.userStillQualifiesForOU(userId, src.sourceOrganizationUnitId, orgUnitId);
            if (!stillQualifies) {
              sourcesToDelete.push(src.id);
            }
          }
        } else if (groupId && src.sourceType === AssignmentSourceType.LEARNING_GROUP && src.sourceLearningGroupId === groupId) {
          // Leaving the group directly cancels the source since group membership does not cascade
          sourcesToDelete.push(src.id);
        }
      }

      if (sourcesToDelete.length > 0) {
        await prisma.$transaction(async (tx) => {
          // Delete the invalidated sources
          await tx.userAssignmentInstanceSource.deleteMany({
            where: { id: { in: sourcesToDelete } },
          });

          // Re-evaluate remaining sources count
          const remainingCount = await tx.userAssignmentInstanceSource.count({
            where: { userAssignmentInstanceId: instance.id },
          });

          if (remainingCount === 0) {
            // Apply policy: CANCEL the instance
            await tx.userAssignmentInstance.update({
              where: { id: instance.id },
              data: { status: UserAssignmentInstanceStatus.CANCELLED },
            });
          }
        });
      }
    }
  }

  /**
   * Helper to check if a user still qualifies for a target OU via other memberships.
   * Excluding the one in orgUnitIdToExclude.
   */
  private async userStillQualifiesForOU(userId: string, targetOuId: string, orgUnitIdToExclude: string): Promise<boolean> {
    const activeMemberships = await prisma.membership.findMany({
      where: {
        userId,
        status: MembershipStatus.ACTIVE,
        organizationUnitId: { not: null },
        deletedAt: null,
      },
    });

    for (const m of activeMemberships) {
      if (m.organizationUnitId && m.organizationUnitId !== orgUnitIdToExclude) {
        const isDescendantOrEqual = await this.isOUMemberOf(m.organizationUnitId, targetOuId);
        if (isDescendantOrEqual) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Helper to determine if childOuId is a descendant of (or equal to) parentOuId.
   */
  private async isOUMemberOf(childOuId: string, parentOuId: string): Promise<boolean> {
    if (childOuId === parentOuId) {
      return true;
    }

    let currentId: string | null = childOuId;
    const visited = new Set<string>([childOuId]);

    while (currentId) {
      const ou = await prisma.organizationUnit.findUnique({
        where: { id: currentId },
        select: { parentId: true, deletedAt: true },
      });

      if (!ou || ou.deletedAt !== null || !ou.parentId) {
        break;
      }

      if (ou.parentId === parentOuId) {
        return true;
      }

      if (visited.has(ou.parentId)) {
        break;
      }
      visited.add(ou.parentId);
      currentId = ou.parentId;
    }

    return false;
  }

  /**
   * Cycle-safe helper to fetch all ancestor OUs of a given OU (including itself).
   */
  private async getAncestorOUs(ouId: string): Promise<string[]> {
    const ancestors: string[] = [ouId];
    let currentId: string | null = ouId;
    const visited = new Set<string>([ouId]);

    while (currentId) {
      const ou = await prisma.organizationUnit.findUnique({
        where: { id: currentId },
        select: { parentId: true, deletedAt: true },
      });

      if (!ou || ou.deletedAt !== null || !ou.parentId) {
        break;
      }

      if (visited.has(ou.parentId)) {
        break;
      }
      visited.add(ou.parentId);
      ancestors.push(ou.parentId);
      currentId = ou.parentId;
    }

    return ancestors;
  }
}

export const membershipAssignmentHooksService = new MembershipAssignmentHooksService();
