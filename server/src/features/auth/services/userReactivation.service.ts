import { prisma } from '../../../shared/db/prisma';
import { UserStatus, UserAssignmentInstanceStatus, MembershipStatus } from '@prisma/client';
import { auditLogService } from '../../../shared/audit/auditLog.service';
import { mandatoryAssignmentService } from '../../assignments/services/mandatoryAssignment.service';
import { membershipAssignmentHooksService } from '../../assignments/services/membershipAssignmentHooks.service';

export class UserReactivationService {
  /**
   * Reactivates an archived/suspended user with one of two options:
   * 
   * - RESTORE: sets user status back to ACTIVE, existing instances resume normal behavior.
   * 
   * - FRESH_START: sets user status to ACTIVE, archives all pre-archival instances,
   *   then re-runs mandatory-assignment logic (Task 11) plus re-evaluates current group/OU
   *   memberships as if newly joined (Task 10), generating fresh instances with fresh due dates.
   * 
   * Logs an audit entry for either path.
   */
  async reactivate(userId: string, option: 'RESTORE' | 'FRESH_START', actorId?: string | null) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    const companyId = user.companyId || 'SYSTEM';

    if (option === 'RESTORE') {
      // 1. Update user status back to ACTIVE
      await prisma.user.update({
        where: { id: userId },
        data: { status: UserStatus.ACTIVE },
      });

      // 2. Log an audit entry
      await auditLogService.log(
        companyId,
        'User',
        userId,
        'REACTIVATE_RESTORE',
        actorId || userId
      );

      return { success: true };
    } else if (option === 'FRESH_START') {
      await prisma.$transaction(async (tx) => {
        // 1. Update user status to ACTIVE
        await tx.user.update({
          where: { id: userId },
          data: { status: UserStatus.ACTIVE },
        });

        // 2. Archive all pre-archival instances
        await tx.userAssignmentInstance.updateMany({
          where: {
            userId,
            deletedAt: null,
          },
          data: {
            status: UserAssignmentInstanceStatus.ARCHIVED,
          },
        });
      });

      // 3. Re-run Task 11's mandatory-assignment logic
      await mandatoryAssignmentService.onUserActivated(userId);

      // 4. Re-evaluate current group/OU memberships as if newly joined
      const memberships = await prisma.membership.findMany({
        where: {
          userId,
          status: MembershipStatus.ACTIVE,
          deletedAt: null,
        },
      });

      for (const membership of memberships) {
        await membershipAssignmentHooksService.onMembershipCreated(membership.id, new Date());
      }

      // 5. Log an audit entry
      await auditLogService.log(
        companyId,
        'User',
        userId,
        'REACTIVATE_FRESH_START',
        actorId || userId
      );

      return { success: true };
    } else {
      throw new Error('Invalid reactivation option.');
    }
  }
}

export const userReactivationService = new UserReactivationService();
