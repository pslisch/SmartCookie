import { prisma } from '../../../shared/db/prisma';
import { UserAssignmentInstanceStatus, AssignmentSourceType, AssignmentStatus } from '@prisma/client';
import { auditLogService } from '../../../shared/audit/auditLog.service';

export class MandatoryAssignmentService {
  /**
   * Automatically materializes active mandatory assignments for a user upon activation.
   * Finds all assignments with isMandatory = true for the user's company,
   * creates/reactivates instances, calculates due date relative to activation date,
   * and creates a corresponding UserAssignmentInstanceSource.
   */
  async onUserActivated(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ACTIVE' || !user.companyId) {
      return;
    }

    const companyId = user.companyId;

    // Find all active, non-deleted, mandatory assignments for the company
    const mandatoryAssignments = await prisma.assignment.findMany({
      where: {
        companyId,
        isMandatory: true,
        status: AssignmentStatus.ACTIVE,
        deletedAt: null,
      },
    });

    for (const assignment of mandatoryAssignments) {
      let candidateDueDate: Date | null = null;

      if (assignment.dueDateDefaultDays !== null && assignment.dueDateDefaultDays !== undefined) {
        candidateDueDate = new Date();
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
          // Reactivate if cancelled or draft/scheduled, keeping the earliest of the due dates
          const currentDueDate = instance.dueDate;
          const finalDueDate = currentDueDate && candidateDueDate
            ? new Date(Math.min(currentDueDate.getTime(), candidateDueDate.getTime()))
            : candidateDueDate || currentDueDate;

          const statusesToReactivate: UserAssignmentInstanceStatus[] = [
            UserAssignmentInstanceStatus.CANCELLED,
            UserAssignmentInstanceStatus.DRAFT,
            UserAssignmentInstanceStatus.SCHEDULED,
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

        // Ensure UserAssignmentInstanceSource of type MANDATORY exists
        const existingSource = await tx.userAssignmentInstanceSource.findFirst({
          where: {
            userAssignmentInstanceId: instance.id,
            sourceType: AssignmentSourceType.MANDATORY,
          },
        });

        if (!existingSource) {
          await tx.userAssignmentInstanceSource.create({
            data: {
              userAssignmentInstanceId: instance.id,
              sourceType: AssignmentSourceType.MANDATORY,
            },
          });
        }
      });

      if (isCreated && instanceId) {
        await auditLogService.log(
          companyId,
          'UserAssignmentInstance',
          instanceId,
          'CREATED',
          assignment.createdById
        );
      }
    }
  }
}

export const mandatoryAssignmentService = new MandatoryAssignmentService();
