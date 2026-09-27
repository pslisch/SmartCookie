import { prisma } from '../../../shared/db/prisma';
import {
  AssignmentType,
  AssignmentStatus,
  Assignment,
  LessonStatus,
  CourseStatus,
  UserAssignmentInstanceStatus,
  AuditCategory,
  AuditOutcome,
} from '@prisma/client';
import crypto from 'crypto';
import { auditLogService } from '../../../shared/audit/auditLog.service';
import { materializationService } from './materialization.service';

export interface AssignmentTargetInput {
  userId?: string | null;
  organizationUnitId?: string | null;
  learningGroupId?: string | null;
}

export class AssignmentService {
  /**
   * Creates an assignment for a single lesson.
   * Validates that the lesson is PUBLISHED, inserts Assignment and AssignmentTargets,
   * then triggers async materialization. Logs to AuditLogService.
   */
  async createLessonAssignment(
    lessonId: string,
    targets: AssignmentTargetInput[],
    type: AssignmentType,
    scheduledFor?: Date | string | null,
    dueDateDefaultDays?: number | null,
    isMandatory: boolean = false,
    ownerId?: string,
    createdById?: string,
    courseAssignmentBatchId?: string | null
  ): Promise<Assignment> {
    if (!ownerId) {
      throw new Error('Owner ID is required to create a lesson assignment.');
    }
    if (!createdById) {
      throw new Error('Creator ID is required to create a lesson assignment.');
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new Error(`Lesson with ID ${lessonId} not found.`);
    }

    if (lesson.status !== LessonStatus.PUBLISHED) {
      throw new Error('Unpublished content cannot be assigned.');
    }

    // Determine initial status
    let status: AssignmentStatus = AssignmentStatus.ACTIVE;
    if (type === AssignmentType.SCHEDULED || (scheduledFor && new Date(scheduledFor) > new Date())) {
      status = AssignmentStatus.SCHEDULED;
    }

    const assignment = await prisma.$transaction(async (tx) => {
      const newAssignment = await tx.assignment.create({
        data: {
          companyId: lesson.companyId,
          lessonId,
          assignmentType: type,
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          dueDateDefaultDays: dueDateDefaultDays ?? null,
          isMandatory,
          ownerId,
          createdById,
          status,
          courseAssignmentBatchId: courseAssignmentBatchId ?? null,
        },
      });

      if (targets && targets.length > 0) {
        await tx.assignmentTarget.createMany({
          data: targets.map((t) => ({
            assignmentId: newAssignment.id,
            userId: t.userId || null,
            organizationUnitId: t.organizationUnitId || null,
            learningGroupId: t.learningGroupId || null,
          })),
        });
      }

      return newAssignment;
    });

    // Log the mutation to AuditLog
    await auditLogService.log({
      companyId: lesson.companyId,
      category: AuditCategory.LEARNING_CONTENT_ASSIGNMENTS,
      outcome: AuditOutcome.SUCCESS,
      action: 'CREATE_LESSON_ASSIGNMENT',
      actorId: createdById,
      entityType: 'Assignment',
      entityId: assignment.id,
      affectedObjectName: lesson.title,
      details: {
        lessonId,
        type,
        isMandatory,
        targetsCount: targets?.length ?? 0,
        courseAssignmentBatchId,
      },
    });

    // Trigger async materialization (does not block caller)
    setTimeout(() => {
      materializationService.materializeAssignment(assignment.id).catch((err) => {
        console.error(`[AssignmentService] Asynchronous materialization failed for assignment ${assignment.id}:`, err);
      });
    }, 0);

    return assignment;
  }

  /**
   * Creates assignments for all lessons in a course.
   * Validates that both the course and each of its lessons are PUBLISHED.
   * Generates a shared courseAssignmentBatchId and creates assignments in order.
   */
  async createCourseAssignment(
    courseId: string,
    targets: AssignmentTargetInput[],
    type: AssignmentType,
    scheduledFor?: Date | string | null,
    dueDateDefaultDays?: number | null,
    isMandatory: boolean = false,
    ownerId?: string,
    createdById?: string
  ): Promise<Assignment[]> {
    if (!ownerId) {
      throw new Error('Owner ID is required to create a course assignment.');
    }
    if (!createdById) {
      throw new Error('Creator ID is required to create a course assignment.');
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        courseLessons: {
          orderBy: { order: 'asc' },
          include: { lesson: true },
        },
      },
    });

    if (!course) {
      throw new Error(`Course with ID ${courseId} not found.`);
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new Error('Unpublished course cannot be assigned.');
    }

    const courseLessons = course.courseLessons;
    if (courseLessons.length === 0) {
      throw new Error('Course has no lessons to assign.');
    }

    // Pre-validate that ALL lessons in the course are PUBLISHED.
    // This ensures we fail completely, rather than partially creating assignments.
    for (const cl of courseLessons) {
      if (cl.lesson.status !== LessonStatus.PUBLISHED) {
        throw new Error(`Cannot assign course: Lesson "${cl.lesson.title}" is not published.`);
      }
    }

    const courseAssignmentBatchId = crypto.randomUUID();
    const createdAssignments: Assignment[] = [];

    for (const cl of courseLessons) {
      const assignment = await this.createLessonAssignment(
        cl.lessonId,
        targets,
        type,
        scheduledFor,
        dueDateDefaultDays,
        isMandatory,
        ownerId,
        createdById,
        courseAssignmentBatchId
      );
      createdAssignments.push(assignment);
    }

    // Log the Course Assignment mutation
    await auditLogService.log({
      companyId: course.companyId,
      category: AuditCategory.LEARNING_CONTENT_ASSIGNMENTS,
      outcome: AuditOutcome.SUCCESS,
      action: 'CREATE_COURSE_ASSIGNMENT',
      actorId: createdById,
      entityType: 'Course',
      entityId: courseId,
      affectedObjectName: course.title,
      details: {
        courseAssignmentBatchId,
        assignmentsCreated: createdAssignments.map((a) => a.id),
      },
    });

    return createdAssignments;
  }

  /**
   * Cancels an assignment.
   * Sets Assignment status to CANCELLED and cancels all associated UserAssignmentInstances.
   */
  async cancelAssignment(assignmentId: string, actorId?: string): Promise<Assignment> {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { lesson: true },
    });

    if (!assignment) {
      throw new Error(`Assignment with ID ${assignmentId} not found.`);
    }

    const updatedAssignment = await prisma.$transaction(async (tx) => {
      const deletedAt = new Date();
      const permanentDeleteAt = new Date(deletedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
      const deletionBatchId = crypto.randomUUID();

      const updated = await tx.assignment.update({
        where: { id: assignmentId },
        data: {
          status: AssignmentStatus.CANCELLED,
          deletedAt,
          permanentDeleteAt,
          deletionBatchId,
        },
      });

      await tx.userAssignmentInstance.updateMany({
        where: { assignmentId },
        data: {
          status: UserAssignmentInstanceStatus.CANCELLED,
          deletedAt,
          permanentDeleteAt,
          deletionBatchId,
        },
      });

      return updated;
    });

    // Log the mutation to AuditLog
    await auditLogService.log({
      companyId: assignment.companyId,
      category: AuditCategory.LEARNING_CONTENT_ASSIGNMENTS,
      outcome: AuditOutcome.SUCCESS,
      action: 'CANCEL_ASSIGNMENT',
      actorId: actorId || null,
      entityType: 'Assignment',
      entityId: assignmentId,
      affectedObjectName: assignment.lesson.title,
    });

    return updatedAssignment;
  }
}

export const assignmentService = new AssignmentService();
