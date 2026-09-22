import { Router, Request, Response } from 'express';
import { prisma } from '../../../shared/db/prisma';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { NotificationChannel, NotificationDeliveryStatus, NotificationType, Prisma } from '@prisma/client';
import { RecipientConfig, NotificationChannels } from '../types/notificationEvent.types';
import { interpolate } from '../services/emailDelivery.service';

const router = Router();

interface DeliveryFailureRecipient {
  userId: string;
  username: string | null;
  email: string | null;
}

interface DeliveryFailureNotification {
  instanceId: string;
  sourceEventType: string;
  title: string;
}

interface DeliveryFailureItem {
  deliveryId: string;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  attemptCount: number;
  lastAttemptAt: Date | null;
  errorMessage: string | null;
  recipient: DeliveryFailureRecipient;
  notification: DeliveryFailureNotification;
}

/**
 * GET /api/notification-admin/delivery-failures
 * Paginated list of NotificationDelivery rows in FAILED or PERMANENTLY_FAILED status
 * for the requesting admin user's company.
 * Query params: ?page=1&pageSize=20 (pageSize capped at 50)
 * Gated explicitly by: requirePermission('notifications', 'view-delivery-failures')
 */
router.get(
  '/delivery-failures',
  requirePermission('notifications', 'view-delivery-failures'),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'No company associated with current user.' });
      }

      const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
      const rawPageSize = parseInt(String(req.query.pageSize), 10) || 20;
      const pageSize = Math.min(50, Math.max(1, rawPageSize));
      const skip = (page - 1) * pageSize;

      const whereClause: Prisma.NotificationDeliveryWhereInput = {
        status: {
          in: [
            NotificationDeliveryStatus.FAILED,
            NotificationDeliveryStatus.PERMANENTLY_FAILED,
          ],
        },
        notificationRecipient: {
          notificationInstance: {
            companyId,
          },
        },
      };

      const [totalCount, deliveries] = await Promise.all([
        prisma.notificationDelivery.count({
          where: whereClause,
        }),
        prisma.notificationDelivery.findMany({
          where: whereClause,
          select: {
            id: true,
            channel: true,
            status: true,
            attemptCount: true,
            lastAttemptAt: true,
            errorMessage: true,
            notificationRecipient: {
              select: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
                notificationInstance: {
                  select: {
                    id: true,
                    sourceEventType: true,
                    titleKey: true,
                    titleParams: true,
                  },
                },
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
          skip,
          take: pageSize,
        }),
      ]);

      const items: DeliveryFailureItem[] = deliveries.map((d) => {
        const instance = d.notificationRecipient.notificationInstance;
        const titleParams =
          instance.titleParams &&
          typeof instance.titleParams === 'object' &&
          !Array.isArray(instance.titleParams)
            ? (instance.titleParams as Record<string, unknown>)
            : null;

        return {
          deliveryId: d.id,
          channel: d.channel,
          status: d.status,
          attemptCount: d.attemptCount,
          lastAttemptAt: d.lastAttemptAt,
          errorMessage: d.errorMessage,
          recipient: {
            userId: d.notificationRecipient.user.id,
            username: d.notificationRecipient.user.username,
            email: d.notificationRecipient.user.email,
          },
          notification: {
            instanceId: instance.id,
            sourceEventType: instance.sourceEventType,
            title: interpolate(instance.titleKey, titleParams),
          },
        };
      });

      return res.json({
        items,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to retrieve delivery failures.';
      console.error('[Notification Admin] GET /delivery-failures error:', error);
      return res.status(500).json({ error: message });
    }
  }
);

// All subsequent rule-management routes gated by requirePermission('notifications', 'manage-rules')
router.use(requirePermission('notifications', 'manage-rules'));

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
 * Validates that conditions is a plain object if provided.
 */
function isValidConditions(conditions: any): boolean {
  if (conditions === null || conditions === undefined) return true;
  return typeof conditions === 'object' && !Array.isArray(conditions);
}

/**
 * GET /api/notification-admin/rules
 * List all NotificationRule rows for req.user!.companyId (deletedAt: null),
 * ordered by notificationType then createdAt.
 */
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const rules = await prisma.notificationRule.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: [
        { notificationType: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return res.json(rules);
  } catch (error: any) {
    console.error('[Notification Admin] Error fetching rules:', error);
    return res.status(500).json({ error: 'Failed to retrieve notification rules.' });
  }
});

/**
 * POST /api/notification-admin/rules
 * Create a new custom rule.
 */
router.post('/rules', async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;
    if (!companyId || !userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const {
      name,
      notificationType,
      recipientConfig,
      channels,
      enabled,
      mandatory,
      conditions,
      titleKey,
      bodyKey,
      actionType,
      actionUrl,
    } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required and must be a non-empty string.' });
    }

    // Validate notificationType
    if (!notificationType || !Object.values(NotificationType).includes(notificationType)) {
      return res.status(400).json({
        error: `Invalid or missing notificationType. Must be one of: ${Object.values(NotificationType).join(', ')}.`,
      });
    }

    // Validate recipientConfig
    if (!isValidRecipientConfig(recipientConfig)) {
      return res.status(400).json({
        error: 'Invalid recipientConfig: must contain learner (boolean), directManager (boolean), entireCompany (boolean), groupIds (string[]), and userIds (string[]).',
      });
    }

    // Validate channels
    if (!isValidChannels(channels)) {
      return res.status(400).json({
        error: 'Invalid channels: must contain inLms (boolean) and email (boolean).',
      });
    }

    // Validate optional fields
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean.' });
    }
    if (mandatory !== undefined && typeof mandatory !== 'boolean') {
      return res.status(400).json({ error: 'mandatory must be a boolean.' });
    }
    if (conditions !== undefined && conditions !== null && !isValidConditions(conditions)) {
      return res.status(400).json({ error: 'Invalid conditions: must be a plain object if provided.' });
    }
    if (titleKey !== undefined && titleKey !== null && typeof titleKey !== 'string') {
      return res.status(400).json({ error: 'titleKey must be a string or null.' });
    }
    if (bodyKey !== undefined && bodyKey !== null && typeof bodyKey !== 'string') {
      return res.status(400).json({ error: 'bodyKey must be a string or null.' });
    }
    if (actionType !== undefined && actionType !== null && typeof actionType !== 'string') {
      return res.status(400).json({ error: 'actionType must be a string or null.' });
    }
    if (actionUrl !== undefined && actionUrl !== null && typeof actionUrl !== 'string') {
      return res.status(400).json({ error: 'actionUrl must be a string or null.' });
    }

    const newRule = await prisma.notificationRule.create({
      data: {
        companyId,
        name: name.trim(),
        notificationType,
        enabled: enabled ?? true,
        mandatory: mandatory ?? false,
        recipientConfig: recipientConfig as unknown as Prisma.InputJsonValue,
        channels: channels as unknown as Prisma.InputJsonValue,
        ...(conditions !== undefined && conditions !== null
          ? { conditions: conditions as Prisma.InputJsonValue }
          : {}),
        titleKey: titleKey ? titleKey.trim() : (titleKey === null ? null : null),
        bodyKey: bodyKey ? bodyKey.trim() : (bodyKey === null ? null : null),
        actionType: actionType ? actionType.trim() : (actionType === null ? null : null),
        actionUrl: actionUrl ? actionUrl.trim() : (actionUrl === null ? null : null),
        isSystemDefault: false,
        createdById: userId,
      },
    });

    return res.status(201).json(newRule);
  } catch (error: any) {
    console.error('[Notification Admin] Error creating rule:', error);
    return res.status(500).json({ error: 'Failed to create notification rule.' });
  }
});

/**
 * PATCH /api/notification-admin/rules/:id
 * Update an existing rule (must belong to req.user!.companyId).
 */
router.patch('/rules/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const { id } = req.params;
    const rule = await prisma.notificationRule.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!rule) {
      return res.status(404).json({ error: 'Notification rule not found.' });
    }

    // Reject attempt to modify immutable fields
    if (req.body.notificationType !== undefined) {
      return res.status(400).json({ error: 'notificationType is immutable and cannot be changed.' });
    }
    if (req.body.isSystemDefault !== undefined) {
      return res.status(400).json({ error: 'isSystemDefault is immutable and cannot be changed.' });
    }

    const {
      name,
      enabled,
      mandatory,
      recipientConfig,
      channels,
      conditions,
      titleKey,
      bodyKey,
      actionType,
      actionUrl,
    } = req.body;

    const updateData: Prisma.NotificationRuleUpdateInput = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name must be a non-empty string.' });
      }
      updateData.name = name.trim();
    }

    if (enabled !== undefined) {
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled must be a boolean.' });
      }
      updateData.enabled = enabled;
    }

    if (mandatory !== undefined) {
      if (typeof mandatory !== 'boolean') {
        return res.status(400).json({ error: 'mandatory must be a boolean.' });
      }
      updateData.mandatory = mandatory;
    }

    if (recipientConfig !== undefined) {
      if (!isValidRecipientConfig(recipientConfig)) {
        return res.status(400).json({
          error: 'Invalid recipientConfig: must contain learner (boolean), directManager (boolean), entireCompany (boolean), groupIds (string[]), and userIds (string[]).',
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
      updateData.channels = channels as unknown as Prisma.InputJsonValue;
    }

    if (conditions !== undefined) {
      if (conditions !== null && !isValidConditions(conditions)) {
        return res.status(400).json({ error: 'Invalid conditions: must be a plain object if provided.' });
      }
      updateData.conditions = conditions === null ? Prisma.DbNull : (conditions as Prisma.InputJsonValue);
    }

    if (titleKey !== undefined) {
      if (titleKey !== null && typeof titleKey !== 'string') {
        return res.status(400).json({ error: 'titleKey must be a string or null.' });
      }
      updateData.titleKey = titleKey === null ? null : titleKey.trim();
    }

    if (bodyKey !== undefined) {
      if (bodyKey !== null && typeof bodyKey !== 'string') {
        return res.status(400).json({ error: 'bodyKey must be a string or null.' });
      }
      updateData.bodyKey = bodyKey === null ? null : bodyKey.trim();
    }

    if (actionType !== undefined) {
      if (actionType !== null && typeof actionType !== 'string') {
        return res.status(400).json({ error: 'actionType must be a string or null.' });
      }
      updateData.actionType = actionType === null ? null : actionType.trim();
    }

    if (actionUrl !== undefined) {
      if (actionUrl !== null && typeof actionUrl !== 'string') {
        return res.status(400).json({ error: 'actionUrl must be a string or null.' });
      }
      updateData.actionUrl = actionUrl === null ? null : actionUrl.trim();
    }

    const updatedRule = await prisma.notificationRule.update({
      where: { id: rule.id },
      data: updateData,
    });

    return res.json(updatedRule);
  } catch (error: any) {
    console.error('[Notification Admin] Error updating rule:', error);
    return res.status(500).json({ error: 'Failed to update notification rule.' });
  }
});

/**
 * DELETE /api/notification-admin/rules/:id
 * Soft-delete a custom rule. Reject with 403 if rule.isSystemDefault is true.
 */
router.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const { id } = req.params;
    const rule = await prisma.notificationRule.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!rule) {
      return res.status(404).json({ error: 'Notification rule not found.' });
    }

    if (rule.isSystemDefault) {
      return res.status(403).json({
        error: 'System-default notification rules cannot be deleted. You can disable them instead.',
      });
    }

    const deletedRule = await prisma.notificationRule.update({
      where: { id: rule.id },
      data: {
        deletedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      message: 'Notification rule deleted successfully.',
      rule: deletedRule,
    });
  } catch (error: any) {
    console.error('[Notification Admin] Error deleting rule:', error);
    return res.status(500).json({ error: 'Failed to delete notification rule.' });
  }
});

/**
 * POST /api/notification-admin/rules/:id/duplicate
 * Duplicate any rule into a new non-system-default, disabled-by-default copy.
 */
router.post('/rules/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;
    if (!companyId || !userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { id } = req.params;
    const rule = await prisma.notificationRule.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!rule) {
      return res.status(404).json({ error: 'Notification rule not found.' });
    }

    const duplicatedRule = await prisma.notificationRule.create({
      data: {
        companyId,
        name: `${rule.name} (Copy)`,
        notificationType: rule.notificationType,
        enabled: false,
        mandatory: rule.mandatory,
        recipientConfig: rule.recipientConfig as Prisma.InputJsonValue,
        channels: rule.channels as Prisma.InputJsonValue,
        ...(rule.conditions ? { conditions: rule.conditions as Prisma.InputJsonValue } : {}),
        titleKey: rule.titleKey,
        bodyKey: rule.bodyKey,
        actionType: rule.actionType,
        actionUrl: rule.actionUrl,
        isSystemDefault: false,
        createdById: userId,
      },
    });

    return res.status(201).json(duplicatedRule);
  } catch (error: any) {
    console.error('[Notification Admin] Error duplicating rule:', error);
    return res.status(500).json({ error: 'Failed to duplicate notification rule.' });
  }
});

export default router;
