import { prisma } from '../../../shared/db/prisma';
import { UserAssignmentInstanceStatus, AssignmentSourceType, AssignmentStatus, AssignmentType } from '@prisma/client';
import { materializationService } from './materialization.service';

export class SelfAssignmentService {
  /**
   * Validates the lesson is PUBLISHED, then creates an Assignment targeting
   * the requesting user (isMandatory: false), runs materialization,
   * and updates the resulting source type to SELF_ASSIGNED.
   */
  async selfAssign(userId: string, lessonId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ACTIVE' || !user.companyId) {
      throw new Error('User not found or is inactive.');
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new Error('Lesson not found.');
    }

    if (lesson.status !== 'PUBLISHED') {
      throw new Error('Unpublished content cannot be assigned.');
    }

    // Create the assignment specifically for this self-assignment
    const assignment = await prisma.$transaction(async (tx) => {
      const newAssignment = await tx.assignment.create({
        data: {
          companyId: user.companyId,
          lessonId,
          assignmentType: AssignmentType.IMMEDIATE,
          isMandatory: false,
          ownerId: userId,
          createdById: userId,
          status: AssignmentStatus.ACTIVE,
        },
      });

      await tx.assignmentTarget.create({
        data: {
          assignmentId: newAssignment.id,
          userId,
        },
      });

      return newAssignment;
    });

    // Materialize the assignment synchronously
    await materializationService.materializeAssignment(assignment.id);

    // Update the mapped MANUAL source type to SELF_ASSIGNED
    const instance = await prisma.userAssignmentInstance.findUnique({
      where: {
        assignmentId_userId: {
          assignmentId: assignment.id,
          userId,
        },
      },
    });

    if (instance) {
      await prisma.userAssignmentInstanceSource.updateMany({
        where: {
          userAssignmentInstanceId: instance.id,
          sourceType: AssignmentSourceType.MANUAL,
        },
        data: {
          sourceType: AssignmentSourceType.SELF_ASSIGNED,
        },
      });
    }

    return instance;
  }

  /**
   * Removes a self-assigned assignment instance.
   * Only permitted if EVERY source on that instance is SELF_ASSIGNED.
   * If any other source exists (e.g. MANDATORY, ORGANIZATION_UNIT, etc.), rejects with a clear message.
   */
  async removeSelfAssignment(userId: string, instanceId: string) {
    const instance = await prisma.userAssignmentInstance.findFirst({
      where: {
        id: instanceId,
        userId,
        deletedAt: null,
      },
      include: {
        sources: true,
      },
    });

    if (!instance) {
      throw new Error('Assignment instance not found.');
    }

    if (instance.sources.length === 0) {
      throw new Error('cannot remove - no self-assigned source found');
    }

    const nonSelfAssignedSources = instance.sources.filter(
      (s) => s.sourceType !== AssignmentSourceType.SELF_ASSIGNED
    );

    if (nonSelfAssignedSources.length > 0) {
      const sourceNames = nonSelfAssignedSources.map((s) => s.sourceType).join(', ');
      throw new Error(`cannot remove - also assigned by ${sourceNames}`);
    }

    // Perform removal of the self-assignment instance and its sources
    await prisma.$transaction(async (tx) => {
      // Delete the sources
      await tx.userAssignmentInstanceSource.deleteMany({
        where: { userAssignmentInstanceId: instanceId },
      });

      // Soft-delete the instance
      await tx.userAssignmentInstance.update({
        where: { id: instanceId },
        data: {
          deletedAt: new Date(),
          status: UserAssignmentInstanceStatus.CANCELLED,
        },
      });

      // Also soft-delete the assignment itself, since it was created solely for this self-assignment
      await tx.assignment.update({
        where: { id: instance.assignmentId },
        data: {
          deletedAt: new Date(),
          status: AssignmentStatus.CANCELLED,
        },
      });
    });

    return { success: true };
  }
}

export const selfAssignmentService = new SelfAssignmentService();
