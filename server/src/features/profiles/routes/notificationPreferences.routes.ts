import { Router, Request, Response } from 'express';
import { prisma } from '../../../shared/db/prisma';
import { requireAuth } from '../../../shared/middleware/session.middleware';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { NotificationType } from '@prisma/client';
import { NotificationChannels } from '../../notifications/types/notificationEvent.types';

const router = Router();

/**
 * GET /api/notification-preferences
 * Returns the current authenticated user's notification preferences,
 * reporting channel availability, mandatory status, and per-channel enabled state
 * unified across rule-based and legacy systems.
 */
router.get('/notification-preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    const [userPrefs, rules, company] = await Promise.all([
      prisma.notificationPreference.findMany({
        where: { userId },
      }),
      companyId
        ? prisma.notificationRule.findMany({
            where: {
              companyId,
              enabled: true,
              deletedAt: null,
            },
            select: {
              notificationType: true,
              mandatory: true,
              channels: true,
            },
          })
        : Promise.resolve([]),
      companyId
        ? prisma.company.findUnique({
            where: { id: companyId },
            select: { mandatoryNotificationTypes: true },
          })
        : Promise.resolve(null),
    ]);

    // Map user preferences by NotificationType
    const prefMap = new Map<NotificationType, { emailEnabled: boolean; inLmsEnabled: boolean }>();
    for (const p of userPrefs) {
      prefMap.set(p.notificationType, {
        emailEnabled: p.emailEnabled,
        inLmsEnabled: p.inLmsEnabled,
      });
    }

    // Group rules by NotificationType
    const rulesByType = new Map<
      NotificationType,
      Array<{ mandatory: boolean; channels: unknown }>
    >();
    for (const rule of rules) {
      const existing = rulesByType.get(rule.notificationType) || [];
      existing.push(rule);
      rulesByType.set(rule.notificationType, existing);
    }

    // Parse legacy mandatory notification types
    const legacyMandatoryRaw = company?.mandatoryNotificationTypes;
    const legacyMandatorySet = new Set<string>(
      Array.isArray(legacyMandatoryRaw) ? (legacyMandatoryRaw as string[]) : []
    );

    const allTypes = Object.values(NotificationType) as NotificationType[];

    const preferences = allTypes.map((notificationType) => {
      const matchingRules = rulesByType.get(notificationType);
      const userPref = prefMap.get(notificationType);
      const inLmsEnabled = userPref ? userPref.inLmsEnabled : true;
      const emailEnabled = userPref ? userPref.emailEnabled : true;

      if (matchingRules && matchingRules.length > 0) {
        // Governed by rule
        const hasInLmsChannel = matchingRules.some((r) => {
          const ch = r.channels as unknown as NotificationChannels;
          return Boolean(ch?.inLms);
        });
        const hasEmailChannel = matchingRules.some((r) => {
          const ch = r.channels as unknown as NotificationChannels;
          return Boolean(ch?.email);
        });
        const mandatory = matchingRules.some((r) => r.mandatory);

        return {
          notificationType,
          governedBy: 'rule' as const,
          hasInLmsChannel,
          hasEmailChannel,
          mandatory,
          inLmsEnabled,
          emailEnabled,
        };
      } else {
        // Governed by legacy
        const mandatory = legacyMandatorySet.has(notificationType);

        return {
          notificationType,
          governedBy: 'legacy' as const,
          hasInLmsChannel: false,
          hasEmailChannel: true,
          mandatory,
          inLmsEnabled,
          emailEnabled,
        };
      }
    });

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
          update: { emailEnabled: pref.enabled },
          create: {
            userId: req.user!.id,
            notificationType: pref.notificationType,
            emailEnabled: pref.enabled,
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
        update: { emailEnabled: enabled },
        create: {
          userId: req.user!.id,
          notificationType,
          emailEnabled: enabled,
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
