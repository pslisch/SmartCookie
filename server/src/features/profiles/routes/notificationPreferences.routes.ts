import { Router, Request, Response } from 'express';
import { prisma } from '../../../shared/db/prisma';
import { requireAuth } from '../../../shared/middleware/session.middleware';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { MembershipStatus, MembershipType, NotificationType } from '@prisma/client';
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

    const [userPrefs, rules, company, isManager] = await Promise.all([
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
      prisma.membership.findFirst({
        where: {
          userId,
          membershipType: MembershipType.MANAGER,
          status: MembershipStatus.ACTIVE,
          deletedAt: null,
          organizationUnitId: { not: null },
        },
      }),
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

    let allTypes = Object.values(NotificationType) as NotificationType[];
    if (!isManager) {
      allTypes = allTypes.filter(
        (type) =>
          type !== NotificationType.MANAGER_COMPLETION &&
          type !== NotificationType.MANAGER_OVERDUE
      );
    }

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
 * Updates the current authenticated user's notification preference for a specific channel.
 * Enforces mandatory constraints server-side.
 */
router.patch('/notification-preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    const { notificationType, channel, enabled } = req.body;

    if (!notificationType || !Object.values(NotificationType).includes(notificationType as NotificationType)) {
      return res.status(400).json({ error: `Invalid or missing notification type: ${notificationType}` });
    }

    if (channel !== 'inLms' && channel !== 'email') {
      return res.status(400).json({ error: "Invalid channel. Must be 'inLms' or 'email'." });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean.' });
    }

    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    const [rules, company] = await Promise.all([
      companyId
        ? prisma.notificationRule.findMany({
            where: {
              companyId,
              notificationType: notificationType as NotificationType,
              enabled: true,
              deletedAt: null,
            },
            select: {
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

    if (rules.length > 0) {
      // Governed by rule
      const hasInLmsChannel = rules.some((r) => {
        const ch = r.channels as unknown as NotificationChannels;
        return Boolean(ch?.inLms);
      });
      const hasEmailChannel = rules.some((r) => {
        const ch = r.channels as unknown as NotificationChannels;
        return Boolean(ch?.email);
      });

      const channelSupported = channel === 'inLms' ? hasInLmsChannel : hasEmailChannel;
      if (!channelSupported) {
        return res.status(400).json({
          error: `Channel '${channel}' is not supported for notification type ${notificationType}.`,
        });
      }

      const isMandatory = rules.some((r) => r.mandatory);
      if (isMandatory && !enabled) {
        return res.status(403).json({
          error: `This notification's ${channel} delivery is mandatory and cannot be disabled.`,
        });
      }
    } else {
      // Governed by legacy
      if (channel === 'inLms') {
        return res.status(400).json({
          error: `Channel 'inLms' is not supported for notification type ${notificationType}.`,
        });
      }

      const legacyMandatoryRaw = company?.mandatoryNotificationTypes;
      const legacyMandatorySet = new Set<string>(
        Array.isArray(legacyMandatoryRaw) ? (legacyMandatoryRaw as string[]) : []
      );
      const isMandatory = legacyMandatorySet.has(notificationType);

      if (isMandatory && !enabled) {
        return res.status(403).json({
          error: `This notification's ${channel} delivery is mandatory and cannot be disabled.`,
        });
      }
    }

    const updateData = channel === 'inLms' ? { inLmsEnabled: enabled } : { emailEnabled: enabled };

    await prisma.notificationPreference.upsert({
      where: {
        userId_notificationType: {
          userId,
          notificationType: notificationType as NotificationType,
        },
      },
      update: updateData,
      create: {
        userId,
        notificationType: notificationType as NotificationType,
        inLmsEnabled: channel === 'inLms' ? enabled : true,
        emailEnabled: channel === 'email' ? enabled : true,
      },
    });

    return res.json({ success: true, notificationType, channel, enabled });
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
