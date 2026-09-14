import { NotificationType } from '@prisma/client';
import { processNotificationEvent } from './notificationEvent.service';

export interface TriggerLessonAssignedNotificationParams {
  instanceId: string;
  userId: string;
  companyId: string;
  lessonTitle: string;
}

/**
 * Shared trigger function for LESSON_ASSIGNED notification events.
 *
 * Dispatches a `LESSON_ASSIGNED` notification for the assigned learner.
 * Note: While asynchronous and await-able, errors are caught and logged internally so
 * notification dispatch failures never fail or roll back assignment materialization
 * or the scheduled activation background job.
 */
export async function triggerLessonAssignedNotification(
  params: TriggerLessonAssignedNotificationParams
): Promise<void> {
  try {
    await processNotificationEvent({
      companyId: params.companyId,
      notificationType: NotificationType.LESSON_ASSIGNED,
      sourceEventType: 'ASSIGNMENT_ACTIVATED',
      sourceEventId: params.instanceId,
      subjectUserId: params.userId,
      titleParams: { lessonTitle: params.lessonTitle },
      bodyParams: { lessonTitle: params.lessonTitle },
      actionEntityType: 'UserAssignmentInstance',
      actionEntityId: params.instanceId,
    });
  } catch (error) {
    console.error(
      `[LessonAssignedEvent] Failed to trigger lesson assigned notification for instance ${params.instanceId}:`,
      error
    );
  }
}
