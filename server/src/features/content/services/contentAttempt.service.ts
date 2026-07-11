import { prisma } from '../../../shared/db/prisma.js';
import { ContentAttemptStatus, UserAssignmentInstanceStatus } from '@prisma/client';

export class ContentAttemptService {
  /**
   * Starts a new content attempt for a given UserAssignmentInstance,
   * respecting the Assignment's configured attempt limit.
   */
  async startAttempt(userAssignmentInstanceId: string, userId: string) {
    // 1. Fetch assignment instance and the assignment details
    const instance = await prisma.userAssignmentInstance.findUnique({
      where: { id: userAssignmentInstanceId },
      include: {
        assignment: {
          include: {
            lesson: true,
          }
        },
      },
    });

    if (!instance || instance.deletedAt !== null) {
      throw new Error('Assignment instance not found.');
    }

    // 2. Count existing attempts
    const attemptCount = await prisma.contentAttempt.count({
      where: { userAssignmentInstanceId },
    });

    const limit = instance.assignment.attemptLimit;

    // 3. Check attempt limit (0 means unlimited)
    if (limit > 0 && attemptCount >= limit) {
      throw new Error(`Maximum attempt limit reached. You are allowed a maximum of ${limit} attempts.`);
    }

    // 4. Create new ContentAttempt row
    const nextAttemptNumber = attemptCount + 1;
    const newAttempt = await prisma.contentAttempt.create({
      data: {
        userAssignmentInstanceId,
        attemptNumber: nextAttemptNumber,
        lessonStatus: ContentAttemptStatus.INCOMPLETE,
        startedAt: new Date(),
        objectives: {},
        interactions: {},
      },
    });

    // 5. Update user assignment instance startedAt if not set
    if (!instance.startedAt) {
      await prisma.userAssignmentInstance.update({
        where: { id: userAssignmentInstanceId },
        data: {
          startedAt: new Date(),
          status: UserAssignmentInstanceStatus.ACTIVE,
        },
      });
    }

    return newAttempt;
  }

  /**
   * Commits/updates a specific attempt with SCORM CMI state and triggers rollup.
   */
  async commitAttempt(attemptId: string, cmi: Record<string, string>) {
    const attempt = await prisma.contentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        userAssignmentInstance: {
          include: {
            assignment: true,
          }
        }
      }
    });

    if (!attempt) {
      throw new Error('Content attempt not found.');
    }

    // Parse values from CMI
    const rawStatus = cmi['cmi.core.lesson_status'];
    const lessonStatus = this.mapScormStatusToEnum(rawStatus);

    const lessonLocation = cmi['cmi.core.lesson_location'] || null;
    const suspendData = cmi['cmi.suspend_data'] || null;

    const scoreRaw = this.parseDecimal(cmi['cmi.core.score.raw']);
    const scoreMin = this.parseDecimal(cmi['cmi.core.score.min']);
    const scoreMax = this.parseDecimal(cmi['cmi.core.score.max']);

    const sessionTimeSeconds = this.parseScormTime(cmi['cmi.core.session_time']);

    // Extract objectives & interactions dictionaries
    const objectives: Record<string, any> = {};
    const interactions: Record<string, any> = {};

    for (const [key, val] of Object.entries(cmi)) {
      if (key.startsWith('cmi.objectives.')) {
        objectives[key] = val;
      } else if (key.startsWith('cmi.interactions.')) {
        interactions[key] = val;
      }
    }

    const isFinishedStatus = ['COMPLETED', 'PASSED', 'FAILED'].includes(lessonStatus);
    const finishedAt = attempt.finishedAt || (isFinishedStatus ? new Date() : null);

    // Update attempt
    const updatedAttempt = await prisma.contentAttempt.update({
      where: { id: attemptId },
      data: {
        lessonStatus,
        lessonLocation,
        suspendData,
        scoreRaw,
        scoreMin,
        scoreMax,
        sessionTimeSeconds,
        objectives,
        interactions,
        finishedAt,
      },
    });

    // Rollup UserAssignmentInstance
    await this.rollupInstance(attempt.userAssignmentInstanceId, lessonStatus);

    return updatedAttempt;
  }

  /**
   * Fetches attempt history for a specific UserAssignmentInstance.
   */
  async getAttemptHistory(userAssignmentInstanceId: string) {
    return prisma.contentAttempt.findMany({
      where: { userAssignmentInstanceId },
      orderBy: { attemptNumber: 'asc' },
    });
  }

  /**
   * Performs completion rollup to UserAssignmentInstance
   */
  private async rollupInstance(instanceId: string, lessonStatus: ContentAttemptStatus) {
    const instance = await prisma.userAssignmentInstance.findUnique({
      where: { id: instanceId },
      include: {
        assignment: {
          include: {
            lesson: true,
          }
        }
      }
    });

    if (!instance) return;

    const isSuccess = ['COMPLETED', 'PASSED'].includes(lessonStatus);

    if (isSuccess) {
      await prisma.userAssignmentInstance.update({
        where: { id: instanceId },
        data: {
          status: UserAssignmentInstanceStatus.COMPLETED,
          completedAt: instance.completedAt || new Date(),
          progressPercent: 100,
        },
      });
    } else {
      if (lessonStatus === 'FAILED') {
        const limit = instance.assignment.attemptLimit;
        const attemptCount = await prisma.contentAttempt.count({
          where: { userAssignmentInstanceId: instanceId },
        });

        if (limit > 0 && attemptCount >= limit) {
          // Exhausted! Consult completionRule to decide terminal outcome.
          const completionRule = instance.assignment.lesson.completionRule;
          
          // Mark as COMPLETED (terminal) while retaining latest attempt as FAILED
          await prisma.userAssignmentInstance.update({
            where: { id: instanceId },
            data: {
              status: UserAssignmentInstanceStatus.COMPLETED,
              completedAt: instance.completedAt || new Date(),
              progressPercent: 100,
            },
          });
          return;
        }
      }

      // If incomplete or failed with attempts remaining, set status to ACTIVE (if not already completed) and progress
      if (instance.status !== UserAssignmentInstanceStatus.COMPLETED) {
        const currentProgress = instance.progressPercent;
        const newProgress = ['INCOMPLETE', 'FAILED', 'BROWSED'].includes(lessonStatus)
          ? Math.max(currentProgress, 50)
          : currentProgress;

        await prisma.userAssignmentInstance.update({
          where: { id: instanceId },
          data: {
            status: UserAssignmentInstanceStatus.ACTIVE,
            progressPercent: newProgress,
          },
        });
      }
    }
  }

  private mapScormStatusToEnum(statusStr: string | undefined): ContentAttemptStatus {
    if (!statusStr) return ContentAttemptStatus.INCOMPLETE;
    const sanitized = statusStr.trim().toUpperCase().replace(/\s+/g, '_');
    const validStatuses = Object.values(ContentAttemptStatus);
    if (validStatuses.includes(sanitized as ContentAttemptStatus)) {
      return sanitized as ContentAttemptStatus;
    }
    return ContentAttemptStatus.INCOMPLETE;
  }

  private parseDecimal(val: string | undefined): number | null {
    if (!val || val.trim() === '') return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  }

  private parseScormTime(timeStr: string | undefined): number | null {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      const seconds = parseFloat(parts[2]) || 0;
      return Math.round(hours * 3600 + minutes * 60 + seconds);
    }
    const parsed = parseFloat(timeStr);
    return isNaN(parsed) ? null : Math.round(parsed);
  }
}
