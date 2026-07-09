import { prisma } from '../../../shared/db/prisma';
import { UserAssignmentInstanceStatus, AssignmentSourceType, MembershipStatus } from '@prisma/client';
import { targetResolutionService } from './targetResolution.service';
import { organizationUnitService } from '../../organization/services/organizationUnit.service';
import { auditLogService } from '../../../shared/audit/auditLog.service';

export class MaterializationService {
  /**
   * Materializes user assignment instances and sources for a given assignment.
   * Resolves target users, creates/updates instances, sets earliest due date,
   * adds instance sources, and logs audit entries.
   */
  async materializeAssignment(assignmentId: string): Promise<void> {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.deletedAt !== null) {
      return;
    }

    // Call Task 7's resolution service to get resolved users and their sources
    const resolvedUsers = await targetResolutionService.resolveTargets(assignmentId);

    // Default instance status based on assignment's status
    let instanceStatus: UserAssignmentInstanceStatus = UserAssignmentInstanceStatus.ACTIVE;
    if (assignment.status === 'SCHEDULED') {
      instanceStatus = UserAssignmentInstanceStatus.SCHEDULED;
    } else if (assignment.status === 'CANCELLED') {
      instanceStatus = UserAssignmentInstanceStatus.CANCELLED;
    }

    for (const resolvedUser of resolvedUsers) {
      try {
        const { userId, sources } = resolvedUser;

        // Resolve candidate due dates across all sources for this single assignment's resolution.
        // "earliest due date wins" - within a single Assignment's resolution when a user matches multiple targets with different due-date implications.
        let resolvedDueDate: Date | null = null;

        if (assignment.dueDateDefaultDays !== null && assignment.dueDateDefaultDays !== undefined) {
          const defaultDays = assignment.dueDateDefaultDays;
          const candidateDates: Date[] = [];

          for (const src of sources) {
            if (src.sourceType === 'MANUAL') {
              const baseDate = assignment.createdAt || new Date();
              const date = new Date(baseDate.getTime());
              date.setDate(date.getDate() + defaultDays);
              candidateDates.push(date);
            } else if (src.sourceType === 'ORGANIZATION_UNIT' && src.organizationUnitId) {
              // Get user's active membership in this OU or descendant OUs
              const descendantOus = await organizationUnitService.getDescendantOUs(src.organizationUnitId);
              const membership = await prisma.membership.findFirst({
                where: {
                  userId,
                  organizationUnitId: { in: descendantOus },
                  status: MembershipStatus.ACTIVE,
                  deletedAt: null,
                },
                orderBy: { createdAt: 'asc' }, // earliest membership creation date
              });

              const baseDate = membership?.createdAt || assignment.createdAt || new Date();
              const date = new Date(baseDate.getTime());
              date.setDate(date.getDate() + defaultDays);
              candidateDates.push(date);
            } else if (src.sourceType === 'LEARNING_GROUP' && src.learningGroupId) {
              const membership = await prisma.membership.findFirst({
                where: {
                  userId,
                  learningGroupId: src.learningGroupId,
                  status: MembershipStatus.ACTIVE,
                  deletedAt: null,
                },
                orderBy: { createdAt: 'asc' },
              });

              const baseDate = membership?.createdAt || assignment.createdAt || new Date();
              const date = new Date(baseDate.getTime());
              date.setDate(date.getDate() + defaultDays);
              candidateDates.push(date);
            }
          }

          if (candidateDates.length > 0) {
            // Find the minimum/earliest date
            resolvedDueDate = new Date(Math.min(...candidateDates.map((d) => d.getTime())));
          }
        }

        let isCreated = false;
        let instanceId = '';

        await prisma.$transaction(async (tx) => {
          // Find-or-create UserAssignmentInstance (unique on assignmentId+userId)
          let instance = await tx.userAssignmentInstance.findUnique({
            where: {
              assignmentId_userId: {
                assignmentId,
                userId,
              },
            },
          });

          if (!instance) {
            instance = await tx.userAssignmentInstance.create({
              data: {
                assignmentId,
                userId,
                status: instanceStatus,
                dueDate: resolvedDueDate,
              },
            });
            isCreated = true;
          } else {
            // If it already exists because of a prior partial materialization, update the status and due date (taking the earliest)
            const finalDueDate = instance.dueDate && resolvedDueDate
              ? new Date(Math.min(instance.dueDate.getTime(), resolvedDueDate.getTime()))
              : resolvedDueDate || instance.dueDate;

            instance = await tx.userAssignmentInstance.update({
              where: { id: instance.id },
              data: {
                status: instanceStatus,
                dueDate: finalDueDate,
              },
            });
          }

          instanceId = instance.id;

          // For each resolved target source, find-or-create a UserAssignmentInstanceSource row
          for (const src of sources) {
            const mappedType = this.mapSourceType(src.sourceType);

            const existingSource = await tx.userAssignmentInstanceSource.findFirst({
              where: {
                userAssignmentInstanceId: instance.id,
                sourceType: mappedType,
                sourceOrganizationUnitId: src.organizationUnitId || null,
                sourceLearningGroupId: src.learningGroupId || null,
              },
            });

            if (!existingSource) {
              await tx.userAssignmentInstanceSource.create({
                data: {
                  userAssignmentInstanceId: instance.id,
                  sourceType: mappedType,
                  sourceOrganizationUnitId: src.organizationUnitId || null,
                  sourceLearningGroupId: src.learningGroupId || null,
                },
              });
            }
          }
        });

        // Logs one audit entry per instance created (entityType "UserAssignmentInstance", action "CREATED")
        if (isCreated && instanceId) {
          await auditLogService.log(
            assignment.companyId,
            'UserAssignmentInstance',
            instanceId,
            'CREATED',
            assignment.createdById
          );
        }
      } catch (err) {
        console.error(
          `[MaterializationService] Failed to materialize user ${resolvedUser.userId} for assignment ${assignmentId}:`,
          err
        );
      }
    }
  }

  private mapSourceType(type: 'MANUAL' | 'ORGANIZATION_UNIT' | 'LEARNING_GROUP'): AssignmentSourceType {
    switch (type) {
      case 'MANUAL':
        return AssignmentSourceType.MANUAL;
      case 'ORGANIZATION_UNIT':
        return AssignmentSourceType.ORGANIZATION_UNIT;
      case 'LEARNING_GROUP':
        return AssignmentSourceType.LEARNING_GROUP;
      default:
        return AssignmentSourceType.MANUAL;
    }
  }
}

export const materializationService = new MaterializationService();
