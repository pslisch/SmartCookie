import { Router, Request, Response } from 'express';
import { prisma } from '../../../shared/db/prisma';
import { requireAuth } from '../../../shared/middleware/session.middleware';
import { NotificationChannel } from '@prisma/client';
import { interpolate } from '../services/emailDelivery.service';

const router = Router();

export interface NotificationListItem {
  deliveryId: string;
  notificationInstanceId: string;
  title: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
  actionUrl: string | null;
  actionLabel?: string;
  mandatory: boolean;
  targetAvailable: boolean;
}

type DeliveryWithInstanceAndRule = {
  id: string;
  readAt: Date | null;
  createdAt: Date;
  notificationRecipient: {
    userId: string;
    notificationInstance: {
      id: string;
      titleKey: string | null;
      titleParams: unknown;
      bodyKey: string | null;
      bodyParams: unknown;
      actionUrl: string | null;
      actionType: string | null;
      actionEntityType: string | null;
      actionEntityId: string | null;
      rule: {
        mandatory: boolean;
        actionType: string | null;
        actionUrl: string | null;
      } | null;
    };
  };
};

/**
 * Checks target entity availability for an array of deliveries.
 * NOTE: Currently scoped strictly to `actionEntityType: 'UserAssignmentInstance'`,
 * checking that the UserAssignmentInstance and its parent Assignment exist and are not soft-deleted.
 * This will need extending if/when other actionEntityType values (e.g. Course, Certificate) are introduced.
 */
async function resolveTargetAvailability(
  deliveries: DeliveryWithInstanceAndRule[]
): Promise<Map<string, boolean>> {
  const availabilityMap = new Map<string, boolean>();

  // Collect all instance IDs where actionEntityType === 'UserAssignmentInstance'
  const assignmentInstanceIds = new Set<string>();
  for (const d of deliveries) {
    const inst = d.notificationRecipient.notificationInstance;
    if (inst.actionEntityType === 'UserAssignmentInstance' && inst.actionEntityId) {
      assignmentInstanceIds.add(inst.actionEntityId);
    }
  }

  if (assignmentInstanceIds.size === 0) {
    return availabilityMap;
  }

  // Batch query UserAssignmentInstance rows and verify both instance and assignment are not soft-deleted
  const activeAssignmentInstances = await prisma.userAssignmentInstance.findMany({
    where: {
      id: { in: Array.from(assignmentInstanceIds) },
      deletedAt: null,
      assignment: {
        deletedAt: null,
      },
    },
    select: {
      id: true,
    },
  });

  const validIds = new Set(activeAssignmentInstances.map((a) => a.id));
  for (const id of assignmentInstanceIds) {
    availabilityMap.set(id, validIds.has(id));
  }

  return availabilityMap;
}

/**
 * Transforms a NotificationDelivery record into a client-ready NotificationListItem.
 */
function toNotificationListItem(
  delivery: DeliveryWithInstanceAndRule,
  targetAvailabilityMap: Map<string, boolean>
): NotificationListItem {
  const instance = delivery.notificationRecipient.notificationInstance;
  const rule = instance.rule;

  const titleParams = (instance.titleParams && typeof instance.titleParams === 'object')
    ? (instance.titleParams as Record<string, unknown>)
    : null;
  const bodyParams = (instance.bodyParams && typeof instance.bodyParams === 'object')
    ? (instance.bodyParams as Record<string, unknown>)
    : null;

  const title = interpolate(instance.titleKey, titleParams);
  const body = interpolate(instance.bodyKey, bodyParams);

  // Fallback order for actionUrl: instance.actionUrl -> rule.actionUrl -> null
  const actionUrl = instance.actionUrl ?? rule?.actionUrl ?? null;

  // Resolve target availability:
  // Default true if actionEntityType is null or not 'UserAssignmentInstance'.
  // If 'UserAssignmentInstance', consult the target availability map.
  let targetAvailable = true;
  if (instance.actionEntityType === 'UserAssignmentInstance') {
    if (instance.actionEntityId) {
      targetAvailable = targetAvailabilityMap.get(instance.actionEntityId) ?? false;
    } else {
      targetAvailable = false;
    }
  }

  const item: NotificationListItem = {
    deliveryId: delivery.id,
    notificationInstanceId: instance.id,
    title,
    body,
    createdAt: delivery.createdAt,
    readAt: delivery.readAt,
    actionUrl,
    mandatory: rule?.mandatory ?? false,
    targetAvailable,
  };

  // If rule has an explicit actionType, expose it as actionLabel; otherwise omit actionLabel
  // so the frontend can apply its own localized default.
  if (instance.actionType || rule?.actionType) {
    item.actionLabel = instance.actionType || rule?.actionType || 'Open link';
  }

  return item;
}

const deliveryInclude = {
  notificationRecipient: {
    select: {
      userId: true,
      notificationInstance: {
        select: {
          id: true,
          titleKey: true,
          titleParams: true,
          bodyKey: true,
          bodyParams: true,
          actionUrl: true,
          actionType: true,
          actionEntityType: true,
          actionEntityId: true,
          rule: {
            select: {
              mandatory: true,
              actionType: true,
              actionUrl: true,
            },
          },
        },
      },
    },
  },
} as const;

/**
 * GET /api/notifications
 * Returns unread notifications and notifications marked read in the last 7 days for the authenticated user.
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch unread in-LMS deliveries (readAt is null)
    const unreadDeliveries = await prisma.notificationDelivery.findMany({
      where: {
        channel: NotificationChannel.IN_LMS,
        readAt: null,
        notificationRecipient: {
          userId,
        },
      },
      include: deliveryInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch recent read in-LMS deliveries (readAt in last 7 days)
    const recentReadDeliveries = await prisma.notificationDelivery.findMany({
      where: {
        channel: NotificationChannel.IN_LMS,
        readAt: {
          gte: sevenDaysAgo,
        },
        notificationRecipient: {
          userId,
        },
      },
      include: deliveryInclude,
      orderBy: {
        readAt: 'desc',
      },
    });

    // Resolve target availability for all loaded deliveries
    const allDeliveries = [
      ...(unreadDeliveries as unknown as DeliveryWithInstanceAndRule[]),
      ...(recentReadDeliveries as unknown as DeliveryWithInstanceAndRule[]),
    ];
    const availabilityMap = await resolveTargetAvailability(allDeliveries);

    const unread = (unreadDeliveries as unknown as DeliveryWithInstanceAndRule[]).map((d) =>
      toNotificationListItem(d, availabilityMap)
    );
    const recentRead = (recentReadDeliveries as unknown as DeliveryWithInstanceAndRule[]).map((d) =>
      toNotificationListItem(d, availabilityMap)
    );

    return res.json({ unread, recentRead });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications.';
    console.error('[NotificationHub] GET /api/notifications error:', error);
    return res.status(500).json({ error: message });
  }
});

/**
 * PATCH /api/notifications/:deliveryId/read
 * Marks a single NotificationDelivery as read (sets readAt to now).
 * Strictly requires the delivery to belong to the authenticated user.
 * Idempotent: re-marking an already-read delivery succeeds without error.
 */
router.patch('/:deliveryId/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const { deliveryId } = req.params;
    const userId = req.user!.id;

    const delivery = await prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        readAt: true,
        channel: true,
        notificationRecipient: {
          select: {
            userId: true,
          },
        },
      },
    });

    // Enforce ownership check: delivery must exist and belong to req.user!.id
    if (!delivery || delivery.notificationRecipient.userId !== userId) {
      return res.status(404).json({ error: 'Notification delivery not found.' });
    }

    // Idempotent: If already read, return the existing state
    if (delivery.readAt !== null) {
      return res.json({
        success: true,
        deliveryId: delivery.id,
        readAt: delivery.readAt,
      });
    }

    const updated = await prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: { readAt: new Date() },
      select: {
        id: true,
        readAt: true,
      },
    });

    return res.json({
      success: true,
      deliveryId: updated.id,
      readAt: updated.readAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to mark notification as read.';
    console.error('[NotificationHub] PATCH /api/notifications/:deliveryId/read error:', error);
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/notifications/history
 * Paginated 365-day history of the authenticated user's in-LMS notifications.
 * Query params: ?page=1&pageSize=20 (pageSize capped at 50).
 */
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const rawPageSize = parseInt(String(req.query.pageSize), 10) || 20;
    const pageSize = Math.min(50, Math.max(1, rawPageSize));
    const skip = (page - 1) * pageSize;

    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const whereClause = {
      channel: NotificationChannel.IN_LMS,
      createdAt: {
        gte: oneYearAgo,
      },
      notificationRecipient: {
        userId,
      },
    };

    const [totalCount, deliveries] = await Promise.all([
      prisma.notificationDelivery.count({
        where: whereClause,
      }),
      prisma.notificationDelivery.findMany({
        where: whereClause,
        include: deliveryInclude,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
    ]);

    const availabilityMap = await resolveTargetAvailability(
      deliveries as unknown as DeliveryWithInstanceAndRule[]
    );

    const items = (deliveries as unknown as DeliveryWithInstanceAndRule[]).map((d) =>
      toNotificationListItem(d, availabilityMap)
    );

    return res.json({
      items,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notification history.';
    console.error('[NotificationHub] GET /api/notifications/history error:', error);
    return res.status(500).json({ error: message });
  }
});

export default router;
