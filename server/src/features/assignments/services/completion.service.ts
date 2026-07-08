import { prisma } from '../../../shared/db/prisma';
import { UserAssignmentInstanceStatus } from '@prisma/client';
import { permissionResolverService } from '../../rbac/services/permissionResolver.service';
import { auditLogService } from '../../../shared/audit/auditLog.service';

export class CompletionService {
  /**
   * Marks a specific assignment instance as complete.
   * - Validates that the instance exists.
   * - Ensures the requesting user either owns the instance or is an admin with the 'assignments:edit' permission.
   * - Sets status COMPLETED, completedAt = now, progressPercent = 100.
   * - Logs an audit log entry.
   */
  async markComplete(instanceId: string, userId: string) {
    const instance = await prisma.userAssignmentInstance.findUnique({
      where: { id: instanceId },
      include: {
        assignment: true,
      },
    });

    if (!instance || instance.deletedAt !== null) {
      throw new Error('Assignment instance not found.');
    }

    // Access control: belongs to requesting user, OR requestor has assignments:edit permission
    if (instance.userId !== userId) {
      const hasPermission = await permissionResolverService.hasPermission(userId, 'assignments', 'edit');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to mark this assignment as complete.');
      }
    }

    // Update assignment instance status
    const updatedInstance = await prisma.userAssignmentInstance.update({
      where: { id: instanceId },
      data: {
        status: UserAssignmentInstanceStatus.COMPLETED,
        completedAt: new Date(),
        progressPercent: 100,
      },
    });

    // Log the action in AuditLog
    await auditLogService.log(
      instance.assignment.companyId,
      'UserAssignmentInstance',
      instanceId,
      'COMPLETED',
      userId,
      {
        assignmentId: instance.assignmentId,
        learnerId: instance.userId,
      }
    );

    return updatedInstance;
  }
}

export const completionService = new CompletionService();
