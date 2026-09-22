import { Router, Request, Response } from 'express';
import { prisma } from '../../../shared/db/prisma';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import {
  ScheduledNotificationRecurrence,
  ScheduledNotificationStatus,
  Prisma,
} from '@prisma/client';
import { RecipientConfig, NotificationChannels } from '../types/notificationEvent.types';

const router = Router();

// All scheduled notification routes require the manage-scheduled permission
router.use(requirePermission('notifications', 'manage-scheduled'));

/**
 * Validates that recipientConfig adheres strictly to RecipientConfig interface.
 */
function isValidRecipientConfig(config: any): config is RecipientConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return false;
  }
  if (typeof config.learner !== 'boolean') return false;
  if (typeof config.directManager !== 'boolean') return false;
  if (typeof config.entireCompany !== 'boolean') return false;
  if (!Array.isArray(config.groupIds) || !config.groupIds.every((id: any) => typeof id === 'string')) {
    return false;
  }
  if (!Array.isArray(config.userIds) || !config.userIds.every((id: any) => typeof id === 'string')) {
    return false;
  }
  return true;
}

/**
 * Validates that channels adheres strictly to NotificationChannels interface.
 */
function isValidChannels(channels: any): channels is NotificationChannels {
  if (!channels || typeof channels !== 'object' || Array.isArray(channels)) {
    return false;
  }
  if (typeof channels.inLms !== 'boolean') return false;
  if (typeof channels.email !== 'boolean') return false;
  return true;
}

/**
 * GET /api/scheduled-notifications
 * List all scheduled notifications for the requesting admin's company (deletedAt: null),
 * ordered by nextExecutionAt ascending.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const scheduledNotifications = await prisma.scheduledNotification.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        nextExecutionAt: 'asc',
      },
    });

    return res.json(scheduledNotifications);
  } catch (error: any) {
    console.error('[Scheduled Notifications] Error fetching list:', error);
    return res.status(500).json({ error: 'Failed to retrieve scheduled notifications.' });
  }
});

/**
 * POST /api/scheduled-notifications
 * Create a new admin-authored scheduled notification.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;
    if (!companyId || !userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const {
      title,
      message,
      recipientConfig,
      channels,
      startAt,
      recurrence,
      endAt,
      actionUrl,
    } = req.body;

    // Validate title
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required and must be a non-empty string.' });
    }

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required and must be a non-empty string.' });
    }

    // Validate recipientConfig structure
    if (!isValidRecipientConfig(recipientConfig)) {
      return res.status(400).json({
        error:
          'Invalid recipientConfig: must contain learner (boolean), directManager (boolean), entireCompany (boolean), groupIds (string[]), and userIds (string[]).',
      });
    }

    // CRITICAL: Reject learner and directManager flags for scheduled notifications
    if (recipientConfig.learner || recipientConfig.directManager) {
      return res.status(400).json({
        error:
          'Invalid recipientConfig: learner and directManager do not apply to scheduled notifications and must be false.',
      });
    }

    // Validate channels
    if (!isValidChannels(channels)) {
      return res.status(400).json({
        error: 'Invalid channels: must contain inLms (boolean) and email (boolean).',
      });
    }

    if (!channels.inLms && !channels.email) {
      return res.status(400).json({
        error: 'At least one delivery channel (inLms or email) must be enabled.',
      });
    }

    // Validate startAt
    if (!startAt) {
      return res.status(400).json({ error: 'startAt is required.' });
    }
    const startDate = new Date(startAt);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'startAt must be a valid datetime string.' });
    }

    // Validate recurrence (defaults to NONE)
    const recurrenceVal: ScheduledNotificationRecurrence =
      recurrence ?? ScheduledNotificationRecurrence.NONE;
    if (!Object.values(ScheduledNotificationRecurrence).includes(recurrenceVal)) {
      return res.status(400).json({
        error: `Invalid recurrence. Must be one of: ${Object.values(ScheduledNotificationRecurrence).join(', ')}.`,
      });
    }

    // Validate endAt: REQUIRED if recurrence !== 'NONE'
    let endDate: Date | null = null;
    if (recurrenceVal !== ScheduledNotificationRecurrence.NONE) {
      if (!endAt) {
        return res.status(400).json({
          error: 'endAt is required for recurring scheduled notifications (recurrence !== NONE).',
        });
      }
      endDate = new Date(endAt);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'endAt must be a valid datetime string.' });
      }
      if (endDate.getTime() <= startDate.getTime()) {
        return res.status(400).json({ error: 'endAt must be strictly after startAt.' });
      }
    } else if (endAt !== undefined && endAt !== null) {
      endDate = new Date(endAt);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'endAt must be a valid datetime string if provided.' });
      }
    }

    // Validate actionUrl
    if (actionUrl !== undefined && actionUrl !== null && typeof actionUrl !== 'string') {
      return res.status(400).json({ error: 'actionUrl must be a string or null.' });
    }

    const newNotification = await prisma.scheduledNotification.create({
      data: {
        companyId,
        title: title.trim(),
        message: message.trim(),
        recipientConfig: recipientConfig as unknown as Prisma.InputJsonValue,
        channels: channels as unknown as Prisma.InputJsonValue,
        actionUrl: actionUrl ? actionUrl.trim() : null,
        startAt: startDate,
        recurrence: recurrenceVal,
        endAt: endDate,
        status: ScheduledNotificationStatus.ACTIVE,
        nextExecutionAt: startDate,
        lastExecutedAt: null,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return res.status(201).json(newNotification);
  } catch (error: any) {
    console.error('[Scheduled Notifications] Error creating notification:', error);
    return res.status(500).json({ error: 'Failed to create scheduled notification.' });
  }
});

/**
 * PATCH /api/scheduled-notifications/:id
 * Update an existing scheduled notification.
 * 
 * Note: If the notification has already executed at least once (lastExecutedAt not null)
 * and recurrence !== 'NONE', changes only affect future executions — past NotificationInstance
 * records are immutable and unrelated to this row.
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const { id } = req.params;
    const existing = await prisma.scheduledNotification.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Scheduled notification not found.' });
    }

    const {
      title,
      message,
      recipientConfig,
      channels,
      startAt,
      recurrence,
      endAt,
      actionUrl,
      status,
    } = req.body;

    const updateData: Prisma.ScheduledNotificationUpdateInput = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ error: 'Title must be a non-empty string.' });
      }
      updateData.title = title.trim();
    }

    if (message !== undefined) {
      if (typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message must be a non-empty string.' });
      }
      updateData.message = message.trim();
    }

    if (recipientConfig !== undefined) {
      if (!isValidRecipientConfig(recipientConfig)) {
        return res.status(400).json({
          error:
            'Invalid recipientConfig: must contain learner (boolean), directManager (boolean), entireCompany (boolean), groupIds (string[]), and userIds (string[]).',
        });
      }
      if (recipientConfig.learner || recipientConfig.directManager) {
        return res.status(400).json({
          error:
            'Invalid recipientConfig: learner and directManager do not apply to scheduled notifications and must be false.',
        });
      }
      updateData.recipientConfig = recipientConfig as unknown as Prisma.InputJsonValue;
    }

    if (channels !== undefined) {
      if (!isValidChannels(channels)) {
        return res.status(400).json({
          error: 'Invalid channels: must contain inLms (boolean) and email (boolean).',
        });
      }
      if (!channels.inLms && !channels.email) {
        return res.status(400).json({
          error: 'At least one delivery channel (inLms or email) must be enabled.',
        });
      }
      updateData.channels = channels as unknown as Prisma.InputJsonValue;
    }

    let effectiveStartDate = existing.startAt;
    if (startAt !== undefined) {
      const parsedStart = new Date(startAt);
      if (isNaN(parsedStart.getTime())) {
        return res.status(400).json({ error: 'startAt must be a valid datetime string.' });
      }
      updateData.startAt = parsedStart;
      effectiveStartDate = parsedStart;

      // If notification has not yet executed, also update nextExecutionAt
      if (existing.lastExecutedAt === null) {
        updateData.nextExecutionAt = parsedStart;
      }
    }

    // Determine effective recurrence and endAt
    let effectiveRecurrence = existing.recurrence;
    if (recurrence !== undefined) {
      if (!Object.values(ScheduledNotificationRecurrence).includes(recurrence)) {
        return res.status(400).json({
          error: `Invalid recurrence. Must be one of: ${Object.values(ScheduledNotificationRecurrence).join(', ')}.`,
        });
      }
      updateData.recurrence = recurrence;
      effectiveRecurrence = recurrence;
    }

    let effectiveEndDate = existing.endAt;
    if (endAt !== undefined) {
      if (endAt === null) {
        effectiveEndDate = null;
        updateData.endAt = null;
      } else {
        const parsedEnd = new Date(endAt);
        if (isNaN(parsedEnd.getTime())) {
          return res.status(400).json({ error: 'endAt must be a valid datetime string if provided.' });
        }
        effectiveEndDate = parsedEnd;
        updateData.endAt = parsedEnd;
      }
    }

    // Validate that recurring notifications require endAt
    if (effectiveRecurrence !== ScheduledNotificationRecurrence.NONE) {
      if (!effectiveEndDate) {
        return res.status(400).json({
          error: 'endAt is required for recurring scheduled notifications (recurrence !== NONE).',
        });
      }
      if (effectiveEndDate.getTime() <= effectiveStartDate.getTime()) {
        return res.status(400).json({ error: 'endAt must be strictly after startAt.' });
      }
    }

    if (actionUrl !== undefined) {
      if (actionUrl !== null && typeof actionUrl !== 'string') {
        return res.status(400).json({ error: 'actionUrl must be a string or null.' });
      }
      updateData.actionUrl = actionUrl ? actionUrl.trim() : null;
    }

    if (status !== undefined) {
      if (!Object.values(ScheduledNotificationStatus).includes(status)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${Object.values(ScheduledNotificationStatus).join(', ')}.`,
        });
      }
      updateData.status = status;
    }

    const updated = await prisma.scheduledNotification.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return res.json(updated);
  } catch (error: any) {
    console.error('[Scheduled Notifications] Error updating notification:', error);
    return res.status(500).json({ error: 'Failed to update scheduled notification.' });
  }
});

/**
 * Common handler to cancel a scheduled notification (soft-delete via status: 'CANCELLED').
 * A cancelled notification remains visible/listed in the admin interface but will not be executed.
 */
async function cancelScheduledNotification(req: Request, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const { id } = req.params;
    const existing = await prisma.scheduledNotification.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Scheduled notification not found.' });
    }

    const cancelled = await prisma.scheduledNotification.update({
      where: { id: existing.id },
      data: {
        status: ScheduledNotificationStatus.CANCELLED,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      message: 'Scheduled notification cancelled successfully.',
      notification: cancelled,
    });
  } catch (error: any) {
    console.error('[Scheduled Notifications] Error cancelling notification:', error);
    return res.status(500).json({ error: 'Failed to cancel scheduled notification.' });
  }
}

/**
 * POST /api/scheduled-notifications/:id/cancel
 * Cancel a scheduled notification (sets status: 'CANCELLED').
 */
router.post('/:id/cancel', cancelScheduledNotification);

/**
 * DELETE /api/scheduled-notifications/:id
 * Alias to cancel, preserving the notification with status: 'CANCELLED' per the specification.
 */
router.delete('/:id', cancelScheduledNotification);

/**
 * POST /api/scheduled-notifications/:id/duplicate
 * Clone a scheduled notification into a new ACTIVE notification.
 * Requires a new startAt in the request body (and optionally endAt if recurring).
 */
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;
    if (!companyId || !userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { id } = req.params;
    const existing = await prisma.scheduledNotification.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Scheduled notification not found.' });
    }

    const { startAt, endAt, title } = req.body;

    // A new startAt is strictly required when duplicating
    if (!startAt) {
      return res.status(400).json({
        error:
          'startAt is required when duplicating a scheduled notification (must specify the new scheduled start time).',
      });
    }

    const newStartDate = new Date(startAt);
    if (isNaN(newStartDate.getTime())) {
      return res.status(400).json({ error: 'startAt must be a valid datetime string.' });
    }

    // Determine endAt for recurring notifications
    let newEndDate: Date | null = null;
    if (existing.recurrence !== ScheduledNotificationRecurrence.NONE) {
      if (endAt) {
        newEndDate = new Date(endAt);
        if (isNaN(newEndDate.getTime())) {
          return res.status(400).json({ error: 'endAt must be a valid datetime string.' });
        }
      } else if (existing.endAt && existing.endAt.getTime() > newStartDate.getTime()) {
        newEndDate = existing.endAt;
      } else {
        return res.status(400).json({
          error:
            'endAt is required and must be strictly after the new startAt for recurring scheduled notifications.',
        });
      }

      if (newEndDate.getTime() <= newStartDate.getTime()) {
        return res.status(400).json({ error: 'endAt must be strictly after startAt.' });
      }
    } else if (endAt) {
      newEndDate = new Date(endAt);
      if (isNaN(newEndDate.getTime())) {
        return res.status(400).json({ error: 'endAt must be a valid datetime string if provided.' });
      }
    }

    const newTitle =
      title && typeof title === 'string' && title.trim().length > 0
        ? title.trim()
        : `${existing.title} (Copy)`;

    const duplicated = await prisma.scheduledNotification.create({
      data: {
        companyId,
        title: newTitle,
        message: existing.message,
        recipientConfig: existing.recipientConfig as Prisma.InputJsonValue,
        channels: existing.channels as Prisma.InputJsonValue,
        actionUrl: existing.actionUrl,
        startAt: newStartDate,
        recurrence: existing.recurrence,
        endAt: newEndDate,
        status: ScheduledNotificationStatus.ACTIVE,
        nextExecutionAt: newStartDate,
        lastExecutedAt: null,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return res.status(201).json(duplicated);
  } catch (error: any) {
    console.error('[Scheduled Notifications] Error duplicating notification:', error);
    return res.status(500).json({ error: 'Failed to duplicate scheduled notification.' });
  }
});

export default router;
