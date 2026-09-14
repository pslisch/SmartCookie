import { NotificationType } from '@prisma/client';
import { prisma } from '../../../shared/db/prisma';
import { processNotificationEvent } from './notificationEvent.service';

interface DueSoonConditions {
  daysBeforeDue?: number;
}

/**
 * Builds a friendly display name for a learner from user attributes,
 * falling back gracefully through available identifier fields.
 */
function getLearnerDisplayName(
  user: {
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    email?: string | null;
  } | null
): string {
  if (!user) return 'Learner';
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (user.username) return user.username;
  if (user.email) return user.email;
  return 'Learner';
}

/**
 * Formats a Date to YYYY-MM-DD string.
 */
function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Processes DUE_SOON deadline notifications for active assignments.
 *
 * Checks enabled DUE_SOON notification rules (e.g. 7, 3, 1 days before due),
 * calculates the target calendar date range, finds matching active user assignment instances,
 * and calls processNotificationEvent for each.
 */
export async function processDeadlineReminders(): Promise<void> {
  const dueSoonRules = await prisma.notificationRule.findMany({
    where: {
      notificationType: NotificationType.DUE_SOON,
      enabled: true,
      deletedAt: null,
    },
  });

  if (dueSoonRules.length === 0) {
    return;
  }

  const today = new Date();

  for (const rule of dueSoonRules) {
    const conditions = rule.conditions as DueSoonConditions | null;
    const daysBeforeDue = conditions?.daysBeforeDue;

    if (typeof daysBeforeDue !== 'number' || isNaN(daysBeforeDue)) {
      continue;
    }

    // Target day: today + daysBeforeDue
    const targetStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysBeforeDue, 0, 0, 0, 0);
    const targetEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysBeforeDue + 1, 0, 0, 0, 0);

    const instances = await prisma.userAssignmentInstance.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        dueDate: {
          gte: targetStart,
          lt: targetEnd,
        },
        assignment: {
          companyId: rule.companyId,
          deletedAt: null,
        },
      },
      include: {
        assignment: {
          include: {
            lesson: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    for (const instance of instances) {
      try {
        const dueDateString = instance.dueDate ? formatDateToYYYYMMDD(instance.dueDate) : '';
        await processNotificationEvent({
          companyId: rule.companyId,
          notificationType: NotificationType.DUE_SOON,
          sourceEventType: 'ASSIGNMENT_DUE_SOON',
          sourceEventId: instance.id,
          subjectUserId: instance.userId,
          titleParams: {
            lessonTitle: instance.assignment.lesson.title,
            dueDate: dueDateString,
          },
          bodyParams: {
            lessonTitle: instance.assignment.lesson.title,
            dueDate: dueDateString,
          },
          actionEntityType: 'UserAssignmentInstance',
          actionEntityId: instance.id,
        });
      } catch (err) {
        console.error(
          `[DeadlineReminders] Failed to process DUE_SOON notification for instance ${instance.id} (rule ${rule.id}):`,
          err
        );
      }
    }
  }
}

/**
 * Processes OVERDUE and MANAGER_OVERDUE notifications for active assignments past their due date.
 *
 * Replaces legacy sendBasicReminders while preserving the 14-day recurrence cadence via lastReminderSentAt.
 */
export async function processOverdueReminders(): Promise<void> {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const todayDateString = formatDateToYYYYMMDD(now);

  const overdueRules = await prisma.notificationRule.findMany({
    where: {
      notificationType: {
        in: [NotificationType.OVERDUE, NotificationType.MANAGER_OVERDUE],
      },
      enabled: true,
      deletedAt: null,
    },
  });

  if (overdueRules.length === 0) {
    return;
  }

  // Group rules by companyId
  const rulesByCompany = new Map<string, { overdueRule?: typeof overdueRules[0]; managerOverdueRule?: typeof overdueRules[0] }>();
  for (const rule of overdueRules) {
    let entry = rulesByCompany.get(rule.companyId);
    if (!entry) {
      entry = {};
      rulesByCompany.set(rule.companyId, entry);
    }
    if (rule.notificationType === NotificationType.OVERDUE) {
      entry.overdueRule = rule;
    } else if (rule.notificationType === NotificationType.MANAGER_OVERDUE) {
      entry.managerOverdueRule = rule;
    }
  }

  const overdueInstances = await prisma.userAssignmentInstance.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      dueDate: { lt: now },
      assignment: {
        deletedAt: null,
      },
      OR: [
        { lastReminderSentAt: null },
        { lastReminderSentAt: { lte: fourteenDaysAgo } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          email: true,
        },
      },
      assignment: {
        include: {
          lesson: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  for (const instance of overdueInstances) {
    const companyRules = rulesByCompany.get(instance.assignment.companyId);
    if (!companyRules || (!companyRules.overdueRule && !companyRules.managerOverdueRule)) {
      continue;
    }

    const dateStampedSourceEventId = `${instance.id}:${todayDateString}`;
    const dueDateString = instance.dueDate ? formatDateToYYYYMMDD(instance.dueDate) : '';
    const learnerName = getLearnerDisplayName(instance.user);

    // 1. Process OVERDUE notification for learner
    if (companyRules.overdueRule) {
      try {
        await processNotificationEvent({
          companyId: instance.assignment.companyId,
          notificationType: NotificationType.OVERDUE,
          sourceEventType: 'ASSIGNMENT_OVERDUE',
          sourceEventId: dateStampedSourceEventId,
          subjectUserId: instance.userId,
          titleParams: {
            lessonTitle: instance.assignment.lesson.title,
            dueDate: dueDateString,
          },
          bodyParams: {
            lessonTitle: instance.assignment.lesson.title,
            dueDate: dueDateString,
          },
          actionEntityType: 'UserAssignmentInstance',
          actionEntityId: instance.id,
        });
      } catch (err) {
        console.error(
          `[OverdueReminders] Failed to process OVERDUE notification for instance ${instance.id}:`,
          err
        );
      }
    }

    // 2. Process MANAGER_OVERDUE notification for manager
    if (companyRules.managerOverdueRule) {
      try {
        await processNotificationEvent({
          companyId: instance.assignment.companyId,
          notificationType: NotificationType.MANAGER_OVERDUE,
          sourceEventType: 'ASSIGNMENT_OVERDUE_MANAGER',
          sourceEventId: dateStampedSourceEventId,
          subjectUserId: instance.userId,
          titleParams: {
            lessonTitle: instance.assignment.lesson.title,
            dueDate: dueDateString,
            learnerName,
          },
          bodyParams: {
            lessonTitle: instance.assignment.lesson.title,
            dueDate: dueDateString,
            learnerName,
          },
          actionEntityType: 'UserAssignmentInstance',
          actionEntityId: instance.id,
        });
      } catch (err) {
        console.error(
          `[OverdueReminders] Failed to process MANAGER_OVERDUE notification for instance ${instance.id}:`,
          err
        );
      }
    }

    // The 14-day cooldown is based on "this instance was processed," not "a delivery definitely succeeded"
    // matching the coarse granularity the legacy job already had.
    try {
      await prisma.userAssignmentInstance.update({
        where: { id: instance.id },
        data: { lastReminderSentAt: now },
      });
    } catch (err) {
      console.error(
        `[OverdueReminders] Failed to update lastReminderSentAt for instance ${instance.id}:`,
        err
      );
    }
  }
}
