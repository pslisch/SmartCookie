import { Router, Request, Response } from 'express';
import { prisma } from '../../../shared/db/prisma';
import { requireAuth } from '../../../shared/middleware/session.middleware';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { NotificationType } from '@prisma/client';

const router = Router();

/**
 * GET /api/notification-preferences
 * Returns the current authenticated user's notification preferences,
 * defaulting to enabled: true for any not explicitly set.
 */
router.get('/notification-preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    const userPrefs = await prisma.notificationPreference.findMany({
      where: { userId: req.user!.id },
    });

    const prefMap = new Map<NotificationType, boolean>();
    for (const p of userPrefs) {
      prefMap.set(p.notificationType, p.enabled);
    }

    const allTypes = Object.values(NotificationType) as NotificationType[];
    const preferences = allTypes.map((type) => ({
      notificationType: type,
      enabled: prefMap.has(type) ? prefMap.get(type)! : true,
    }));

    return res.json({ preferences });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch notification preferences.' });
  }
});

/**
 * PATCH /api/notification-preferences
 * Updates the current authenticated user's notification preferences.
 * Supports updating a single preference or an array of preferences.
 */
router.patch('/notification-preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    const { preferences, notificationType, enabled } = req.body;

    if (Array.isArray(preferences)) {
      for (const pref of preferences) {
        if (!pref.notificationType || typeof pref.enabled !== 'boolean') {
          return res.status(400).json({ error: 'Invalid preference data format.' });
        }
        await prisma.notificationPreference.upsert({
          where: {
            userId_notificationType: {
              userId: req.user!.id,
              notificationType: pref.notificationType,
            },
          },
          update: { enabled: pref.enabled },
          create: {
            userId: req.user!.id,
            notificationType: pref.notificationType,
            enabled: pref.enabled,
          },
        });
      }
    } else if (notificationType && typeof enabled === 'boolean') {
      if (!Object.values(NotificationType).includes(notificationType as any)) {
        return res.status(400).json({ error: `Invalid notification type: ${notificationType}` });
      }
      await prisma.notificationPreference.upsert({
        where: {
          userId_notificationType: {
            userId: req.user!.id,
            notificationType,
          },
        },
        update: { enabled },
        create: {
          userId: req.user!.id,
          notificationType,
          enabled,
        },
      });
    } else {
      return res.status(400).json({ error: 'Invalid update body. Provide preferences array or notificationType and enabled.' });
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update preferences.' });
  }
});

/**
 * GET /api/company/mandatory-notification-types
 * Returns the company-wide mandatory notification types.
 */
router.get('/company/mandatory-notification-types', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user!.companyId) {
      return res.status(400).json({ error: 'User is not associated with a company.' });
    }
    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
      select: { mandatoryNotificationTypes: true },
    });
    return res.json({
      mandatoryNotificationTypes: company?.mandatoryNotificationTypes || [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch mandatory notification types.' });
  }
});

/**
 * PATCH /api/company/mandatory-notification-types
 * Updates company-wide mandatory notification types.
 * Requires organization:edit permission.
 */
router.patch(
  '/company/mandatory-notification-types',
  requireAuth,
  requirePermission('organization', 'edit'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user!.companyId) {
        return res.status(400).json({ error: 'User is not associated with a company.' });
      }
      const { mandatoryNotificationTypes } = req.body;
      if (!Array.isArray(mandatoryNotificationTypes)) {
        return res.status(400).json({ error: 'mandatoryNotificationTypes must be an array of strings.' });
      }

      const validTypes = Object.values(NotificationType);
      for (const t of mandatoryNotificationTypes) {
        if (!validTypes.includes(t as any)) {
          return res.status(400).json({ error: `Invalid notification type: ${t}` });
        }
      }

      await prisma.company.update({
        where: { id: req.user!.companyId },
        data: { mandatoryNotificationTypes },
      });

      return res.json({ success: true, mandatoryNotificationTypes });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update mandatory notification types.' });
    }
  }
);

export default router;
