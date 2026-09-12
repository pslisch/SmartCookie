import { NotificationType } from '@prisma/client';
import { prisma } from '../../../shared/db/prisma';
import { processNotificationEvent } from './notificationEvent.service';

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

export interface TriggerCompletionNotificationsParams {
  instanceId: string;
  userId: string;
  companyId: string;
  lessonTitle: string;
}

/**
 * Shared trigger function for lesson completion events.
 *
 * Dispatches:
 * 1. `COMPLETION_CONFIRMATION` notification for the learner.
 * 2. `MANAGER_COMPLETION` notification for the learner's direct manager (if one exists).
 *
 * Note: While asynchronous and await-able, errors are caught and logged internally so
 * notification dispatch failures never fail or roll back the assignment completion transaction.
 */
export async function triggerCompletionNotifications(
  params: {
    instanceId: string;
    userId: string;
    companyId: string;
    lessonTitle: string;
  }
): Promise<void> {
  try {
    // 1. Learner completion confirmation
    await processNotificationEvent({
      companyId: params.companyId,
      notificationType: NotificationType.COMPLETION_CONFIRMATION,
      sourceEventType: 'ASSIGNMENT_COMPLETED_LEARNER',
      sourceEventId: params.instanceId,
      subjectUserId: params.userId,
      titleParams: { lessonTitle: params.lessonTitle },
      bodyParams: { lessonTitle: params.lessonTitle },
      actionEntityType: 'UserAssignmentInstance',
      actionEntityId: params.instanceId,
    });

    // 2. Fetch learner profile for manager notification display
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        firstName: true,
        lastName: true,
        username: true,
        email: true,
      },
    });
    const learnerName = getLearnerDisplayName(user);

    // 3. Manager completion notification (manager resolved via OU membership using subjectUserId)
    await processNotificationEvent({
      companyId: params.companyId,
      notificationType: NotificationType.MANAGER_COMPLETION,
      sourceEventType: 'ASSIGNMENT_COMPLETED_MANAGER',
      sourceEventId: params.instanceId,
      subjectUserId: params.userId,
      titleParams: {
        lessonTitle: params.lessonTitle,
        learnerName,
      },
      bodyParams: {
        lessonTitle: params.lessonTitle,
        learnerName,
      },
      actionEntityType: 'UserAssignmentInstance',
      actionEntityId: params.instanceId,
    });
  } catch (error) {
    console.error(
      `[LessonCompletionEvent] Failed to trigger completion notifications for instance ${params.instanceId}:`,
      error
    );
  }
}
