import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { requireAuth, optionalAuth } from '../../../shared/middleware/session.middleware';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { prisma } from '../../../shared/db/prisma';
import { ThemeStatus, ThemeLockType } from '@prisma/client';
import { themeResolutionService } from '../services/themeResolution.service';
import { themeLockService } from '../services/themeLock.service';
import { permissionResolverService } from '../../rbac/services/permissionResolver.service';
import { scheduledTasksService } from '../../../shared/scheduler/scheduledTasks.service';
import { ImageUploadService, InvalidImageError } from '../../content/services/imageUpload.service';
import { saveLogoFile, deleteLogoFile } from '../services/logoStorage.service';

const router = Router();
const imageUploadService = new ImageUploadService();
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
});

const THEME_INCLUDE_FONTS = {
  generalFont: true,
  navFont: true,
  headingsFont: true,
  buttonsFont: true,
  formsFont: true,
  cardsFont: true,
  linksFont: true,
  statusFont: true,
};

async function getEffectiveCompanyId(req: Request): Promise<string | null> {
  if (req.user?.companyId) {
    return req.user.companyId;
  }
  const company = await prisma.company.findFirst();
  return company?.id || null;
}

async function validateFontReferences(
  theme: {
    generalFontId?: string | null;
    navFontId?: string | null;
    headingsFontId?: string | null;
    buttonsFontId?: string | null;
    formsFontId?: string | null;
    cardsFontId?: string | null;
    linksFontId?: string | null;
    statusFontId?: string | null;
  },
  companyId: string
): Promise<{ valid: boolean; danglingIds: string[] }> {
  const fontIds = [
    theme.generalFontId,
    theme.navFontId,
    theme.headingsFontId,
    theme.buttonsFontId,
    theme.formsFontId,
    theme.cardsFontId,
    theme.linksFontId,
    theme.statusFontId,
  ].filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

  if (fontIds.length === 0) {
    return { valid: true, danglingIds: [] };
  }

  const existingFonts = await prisma.font.findMany({
    where: {
      id: { in: fontIds },
      companyId,
    },
    select: { id: true },
  });

  const foundSet = new Set(existingFonts.map((f) => f.id));
  const danglingIds = fontIds.filter((id) => !foundSet.has(id));

  return {
    valid: danglingIds.length === 0,
    danglingIds,
  };
}

/**
 * GET /api/themes/resolved?test=:themeId
 *
 * RequireAuth only — no theme:* permissions required.
 * Returns the fully resolved token map, resolved font details (family/format/storagePath per group),
 * and baseFontSize.
 *
 * Missing test query param resolves Active normally.
 * Bogus or soft-deleted test theme falls back to Active silently.
 */
router.get('/resolved', optionalAuth, async (req: Request, res: Response) => {
  try {
    const testThemeId =
      typeof req.query.test === 'string' && req.query.test.trim()
        ? req.query.test.trim()
        : undefined;

    const mode = req.query.mode === 'dark' ? 'dark' : 'light';

    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const resolved = await themeResolutionService.resolveTheme(companyId, testThemeId, mode);
    return res.json(resolved);
  } catch (error: any) {
    console.error('[Theme Router] Error resolving theme:', error);
    return res.status(500).json({ error: error.message || 'Failed to resolve theme.' });
  }
});

/**
 * GET /api/themes
 * List non-deleted themes for the user's company.
 * Gated by: theme:view
 */
router.get(['/', ''], requirePermission('theme', 'view'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const themes = await prisma.theme.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      include: THEME_INCLUDE_FONTS,
      orderBy: [
        { isSmartCookieDefault: 'desc' },
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return res.json(themes);
  } catch (error: any) {
    console.error('[Theme Router] Error listing themes:', error);
    return res.status(500).json({ error: error.message || 'Failed to list themes.' });
  }
});

/**
 * POST /api/themes
 * Create a new theme as a deep snapshot copy of a source theme.
 * Gated by: theme:edit
 * Body: { name, sourceThemeId }
 * Starts in status: DRAFT
 */
router.post(['/', ''], requirePermission('theme', 'edit'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const { name, sourceThemeId } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Theme name is required.' });
    }
    if (!sourceThemeId || typeof sourceThemeId !== 'string' || !sourceThemeId.trim()) {
      return res.status(400).json({ error: 'sourceThemeId is required.' });
    }

    const sourceTheme = await prisma.theme.findFirst({
      where: {
        id: sourceThemeId.trim(),
        companyId,
        deletedAt: null,
      },
    });

    if (!sourceTheme) {
      return res.status(404).json({ error: 'Source theme not found.' });
    }

    // Deep snapshot copy of colorValues and darkColorValues
    const colorValues =
      typeof sourceTheme.colorValues === 'string'
        ? JSON.parse(sourceTheme.colorValues)
        : JSON.parse(JSON.stringify(sourceTheme.colorValues));

    const darkColorValues = sourceTheme.darkColorValues
      ? typeof sourceTheme.darkColorValues === 'string'
        ? JSON.parse(sourceTheme.darkColorValues)
        : JSON.parse(JSON.stringify(sourceTheme.darkColorValues))
      : null;

    const newTheme = await prisma.theme.create({
      data: {
        companyId,
        name: name.trim(),
        status: ThemeStatus.DRAFT,
        isSmartCookieDefault: false,
        colorValues,
        darkColorValues,
        generalFontId: sourceTheme.generalFontId,
        navFontId: sourceTheme.navFontId,
        headingsFontId: sourceTheme.headingsFontId,
        buttonsFontId: sourceTheme.buttonsFontId,
        formsFontId: sourceTheme.formsFontId,
        cardsFontId: sourceTheme.cardsFontId,
        linksFontId: sourceTheme.linksFontId,
        statusFontId: sourceTheme.statusFontId,
        baseFontSize: sourceTheme.baseFontSize,
        createdById: req.user!.id,
      },
      include: THEME_INCLUDE_FONTS,
    });

    return res.status(201).json(newTheme);
  } catch (error: any) {
    console.error('[Theme Router] Error creating theme:', error);
    return res.status(500).json({ error: error.message || 'Failed to create theme.' });
  }
});

/**
 * POST /api/themes/run-scheduled-activation
 * Manually trigger the scheduled theme activation task (e.g. for testing / verification).
 * Gated by: theme:activate
 */
router.post('/run-scheduled-activation', requirePermission('theme', 'activate'), async (req: Request, res: Response) => {
  try {
    await scheduledTasksService.activateScheduledThemes();
    return res.json({ success: true, message: 'Scheduled theme activation executed.' });
  } catch (error: any) {
    console.error('[Theme Router] Error running scheduled theme activation:', error);
    return res.status(500).json({ error: error.message || 'Failed to run scheduled theme activation.' });
  }
});

/**
 * GET /api/themes/:id
 * Retrieve theme details by ID.
 * Gated by: theme:view
 */
router.get('/:id', requirePermission('theme', 'view'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const { id } = req.params;
    const theme = await prisma.theme.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      include: THEME_INCLUDE_FONTS,
    });

    if (!theme) {
      return res.status(404).json({ error: 'Theme not found.' });
    }

    return res.json(theme);
  } catch (error: any) {
    console.error('[Theme Router] Error fetching theme:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch theme.' });
  }
});

/**
 * PATCH /api/themes/:id
 * Partial update of theme properties (name, colorValues, darkColorValues, font FKs, baseFontSize).
 * Gated by: theme:edit
 * Rules:
 * - 403 if isSmartCookieDefault
 * - 409 if status === ACTIVE
 * - Merges colorValues / darkColorValues key-by-key rather than replacing the whole object.
 */
router.patch('/:id', requirePermission('theme', 'edit'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const { id } = req.params;
    const theme = await prisma.theme.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!theme) {
      return res.status(404).json({ error: 'Theme not found.' });
    }

    if (theme.isSmartCookieDefault) {
      return res.status(403).json({ error: 'The Smart Cookie Default theme cannot be edited.' });
    }

    if (theme.status === ThemeStatus.ACTIVE) {
      return res.status(409).json({
        error: 'Active themes cannot be edited. Create a copy or edit in Draft/Ready status.',
      });
    }

    // Check if locked by another user (Section 20: testing or editing locks against others)
    const lockStatus = await themeLockService.getLockStatus(id);
    if (lockStatus && req.user && lockStatus.userId !== req.user.id) {
      const verb = lockStatus.lockType === ThemeLockType.TEST ? 'testing' : 'editing';
      return res.status(409).json({
        error: `${lockStatus.holderName} is currently ${verb} this theme.`,
        holderName: lockStatus.holderName,
        lockType: lockStatus.lockType,
      });
    }

    const updateData: Record<string, any> = {};

    if (typeof req.body.name === 'string' && req.body.name.trim().length > 0) {
      updateData.name = req.body.name.trim();
    }

    if (req.body.colorValues && typeof req.body.colorValues === 'object' && !Array.isArray(req.body.colorValues)) {
      const existingColors =
        typeof theme.colorValues === 'string'
          ? JSON.parse(theme.colorValues)
          : { ...((theme.colorValues as Record<string, any>) || {}) };

      updateData.colorValues = {
        ...existingColors,
        ...req.body.colorValues,
      };
    }

    if (req.body.darkColorValues !== undefined) {
      if (req.body.darkColorValues === null) {
        updateData.darkColorValues = null;
      } else if (typeof req.body.darkColorValues === 'object' && !Array.isArray(req.body.darkColorValues)) {
        const existingDarkColors = theme.darkColorValues
          ? typeof theme.darkColorValues === 'string'
            ? JSON.parse(theme.darkColorValues)
            : { ...((theme.darkColorValues as Record<string, any>) || {}) }
          : {};

        updateData.darkColorValues = {
          ...existingDarkColors,
          ...req.body.darkColorValues,
        };
      }
    }

    const fontSlots = [
      'generalFontId',
      'navFontId',
      'headingsFontId',
      'buttonsFontId',
      'formsFontId',
      'cardsFontId',
      'linksFontId',
      'statusFontId',
    ] as const;

    for (const slot of fontSlots) {
      if (req.body[slot] !== undefined) {
        updateData[slot] = req.body[slot] === null ? null : String(req.body[slot]).trim();
      }
    }

    if (req.body.baseFontSize !== undefined) {
      const parsedSize = parseInt(String(req.body.baseFontSize), 10);
      if (!isNaN(parsedSize) && parsedSize > 0) {
        updateData.baseFontSize = parsedSize;
      }
    }

    const updatedTheme = await prisma.theme.update({
      where: { id: theme.id },
      data: updateData,
      include: THEME_INCLUDE_FONTS,
    });

    return res.json(updatedTheme);
  } catch (error: any) {
    console.error('[Theme Router] Error updating theme:', error);
    return res.status(500).json({ error: error.message || 'Failed to update theme.' });
  }
});

/**
 * POST /api/themes/:id/set-ready
 * Transition theme from DRAFT to READY status.
 * Gated by: theme:set-ready
 * Validates that every assigned font FK still resolves to an existing Font row (400 if dangling).
 */
router.post('/:id/set-ready', requirePermission('theme', 'set-ready'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const { id } = req.params;
    const theme = await prisma.theme.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!theme) {
      return res.status(404).json({ error: 'Theme not found.' });
    }

    if (theme.isSmartCookieDefault) {
      return res.status(403).json({ error: 'The Smart Cookie Default theme cannot be edited.' });
    }

    const validation = await validateFontReferences(theme, companyId);
    if (!validation.valid) {
      return res.status(400).json({
        error: `Cannot set theme to READY: font reference(s) ${validation.danglingIds.join(', ')} do not exist.`,
      });
    }

    const updatedTheme = await prisma.theme.update({
      where: { id: theme.id },
      data: { status: ThemeStatus.READY },
      include: THEME_INCLUDE_FONTS,
    });

    return res.json(updatedTheme);
  } catch (error: any) {
    console.error('[Theme Router] Error setting theme to ready:', error);
    return res.status(500).json({ error: error.message || 'Failed to set theme to ready.' });
  }
});

/**
 * POST /api/themes/:id/set-draft
 * Transition theme back to DRAFT status and cancel any pending schedule.
 * Gated by: theme:set-ready
 */
router.post('/:id/set-draft', requirePermission('theme', 'set-ready'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const { id } = req.params;
    const theme = await prisma.theme.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!theme) {
      return res.status(404).json({ error: 'Theme not found.' });
    }

    if (theme.isSmartCookieDefault) {
      return res.status(403).json({ error: 'The Smart Cookie Default theme cannot be modified.' });
    }

    if (theme.status === ThemeStatus.ACTIVE) {
      return res.status(409).json({
        error: 'Cannot set an ACTIVE theme to DRAFT. Another theme must be activated instead.',
      });
    }

    const updatedTheme = await prisma.theme.update({
      where: { id: theme.id },
      data: {
        status: ThemeStatus.DRAFT,
        scheduledActivationAt: null,
        scheduledActivationFailedAt: null,
        scheduledActivationFailedReason: null,
      },
      include: THEME_INCLUDE_FONTS,
    });

    return res.json(updatedTheme);
  } catch (error: any) {
    console.error('[Theme Router] Error setting theme to draft:', error);
    return res.status(500).json({ error: error.message || 'Failed to set theme to draft.' });
  }
});

/**
 * POST /api/themes/:id/activate
 * Activate theme immediately or schedule activation.
 * Gated by: theme:activate
 * Body:
 *   - Immediate mode: { mode: 'immediate' }
 *   - Schedule mode: { mode: 'schedule', scheduledActivationAt: ISOString, confirmReplaceExisting?: boolean }
 */
router.post('/:id/activate', requirePermission('theme', 'activate'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const { mode = 'immediate', scheduledActivationAt, confirmReplaceExisting } = req.body || {};
    if (mode !== 'immediate' && mode !== 'schedule') {
      return res.status(400).json({
        error: 'Invalid activation mode. Mode must be either "immediate" or "schedule".',
      });
    }

    const { id } = req.params;
    const theme = await prisma.theme.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!theme) {
      return res.status(404).json({ error: 'Theme not found.' });
    }

    // Validate that font references are intact before activating or scheduling
    const validation = await validateFontReferences(theme, companyId);
    if (!validation.valid) {
      return res.status(400).json({
        error: `Cannot activate or schedule theme: font reference(s) ${validation.danglingIds.join(', ')} do not exist.`,
      });
    }

    if (mode === 'immediate') {
      // Already active - idempotent return
      if (theme.status === ThemeStatus.ACTIVE) {
        const activeTheme = await prisma.theme.findUnique({
          where: { id: theme.id },
          include: THEME_INCLUDE_FONTS,
        });
        return res.json(activeTheme);
      }

      // Execute atomic transition in a database transaction:
      // Only one theme can ever be ACTIVE at a time.
      const [activatedTheme] = await prisma.$transaction(async (tx) => {
        // 1. Demote any currently ACTIVE theme(s) for this company to READY
        await tx.theme.updateMany({
          where: {
            companyId,
            status: ThemeStatus.ACTIVE,
            id: { not: theme.id },
            deletedAt: null,
          },
          data: {
            status: ThemeStatus.READY,
          },
        });

        // 2. Promote target theme to ACTIVE and clear any schedule timestamps
        const updated = await tx.theme.update({
          where: { id: theme.id },
          data: {
            status: ThemeStatus.ACTIVE,
            scheduledActivationAt: null,
            scheduledActivationFailedAt: null,
            scheduledActivationFailedReason: null,
          },
          include: THEME_INCLUDE_FONTS,
        });

        return [updated];
      });

      return res.json(activatedTheme);
    }

    // Schedule mode:
    if (!scheduledActivationAt) {
      return res.status(400).json({
        error: 'A scheduledActivationAt ISO timestamp is required for schedule mode.',
      });
    }

    const scheduledDate = new Date(scheduledActivationAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid scheduledActivationAt date format.',
      });
    }

    if (scheduledDate.getTime() <= Date.now()) {
      return res.status(400).json({
        error: 'Scheduled activation time must be in the future.',
      });
    }

    // Check if any OTHER theme already has a non-null scheduledActivationAt
    const existingScheduledTheme = await prisma.theme.findFirst({
      where: {
        companyId,
        id: { not: theme.id },
        deletedAt: null,
        scheduledActivationAt: { not: null },
      },
    });

    if (existingScheduledTheme && !confirmReplaceExisting) {
      return res.status(409).json({
        error: `Theme "${existingScheduledTheme.name}" is already scheduled for activation at ${existingScheduledTheme.scheduledActivationAt?.toISOString()}. Only one pending schedule may exist at a time.`,
        requiresConfirmation: true,
        existingScheduledTheme: {
          id: existingScheduledTheme.id,
          name: existingScheduledTheme.name,
          scheduledActivationAt: existingScheduledTheme.scheduledActivationAt,
        },
      });
    }

    // Atomic schedule operation:
    // If confirmReplaceExisting is true, clear old theme's schedule and set new one.
    // Target theme stays READY (not ACTIVE) until the scheduler activates it.
    const [scheduledTheme] = await prisma.$transaction(async (tx) => {
      if (existingScheduledTheme) {
        await tx.theme.updateMany({
          where: {
            companyId,
            id: { not: theme.id },
            scheduledActivationAt: { not: null },
          },
          data: {
            scheduledActivationAt: null,
            scheduledActivationFailedAt: null,
            scheduledActivationFailedReason: null,
          },
        });
      }

      const updated = await tx.theme.update({
        where: { id: theme.id },
        data: {
          status: ThemeStatus.READY,
          scheduledActivationAt: scheduledDate,
          scheduledActivationFailedAt: null,
          scheduledActivationFailedReason: null,
        },
        include: THEME_INCLUDE_FONTS,
      });

      return [updated];
    });

    return res.json(scheduledTheme);
  } catch (error: any) {
    console.error('[Theme Router] Error activating/scheduling theme:', error);
    return res.status(500).json({ error: error.message || 'Failed to activate or schedule theme.' });
  }
});

/**
 * POST /api/themes/:id/cancel-schedule
 * Cancel pending scheduled activation for a theme.
 * Gated by: theme:activate
 */
router.post('/:id/cancel-schedule', requirePermission('theme', 'activate'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const { id } = req.params;
    const theme = await prisma.theme.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!theme) {
      return res.status(404).json({ error: 'Theme not found.' });
    }

    if (theme.isSmartCookieDefault) {
      return res.status(403).json({ error: 'The Smart Cookie Default theme cannot be scheduled.' });
    }

    const updatedTheme = await prisma.theme.update({
      where: { id: theme.id },
      data: {
        scheduledActivationAt: null,
        scheduledActivationFailedAt: null,
        scheduledActivationFailedReason: null,
      },
      include: THEME_INCLUDE_FONTS,
    });

    return res.json(updatedTheme);
  } catch (error: any) {
    console.error('[Theme Router] Error cancelling scheduled theme activation:', error);
    return res.status(500).json({ error: error.message || 'Failed to cancel scheduled activation.' });
  }
});

/**
 * POST /api/themes/:id/dismiss-failure
 * Dismiss scheduled activation failure for a theme.
 * Gated by: theme:view or theme:activate
 */
router.post('/:id/dismiss-failure', requirePermission('theme', 'view'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const { id } = req.params;
    const theme = await prisma.theme.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!theme) {
      return res.status(404).json({ error: 'Theme not found.' });
    }

    const updatedTheme = await prisma.theme.update({
      where: { id: theme.id },
      data: {
        scheduledActivationFailedAt: null,
        scheduledActivationFailedReason: null,
      },
      include: THEME_INCLUDE_FONTS,
    });

    return res.json(updatedTheme);
  } catch (error: any) {
    console.error('[Theme Router] Error dismissing activation failure:', error);
    return res.status(500).json({ error: error.message || 'Failed to dismiss activation failure.' });
  }
});

/**
 * DELETE /api/themes/:id
 * Soft-delete a theme.
 * Gated by: theme:delete
 *
 * Rules:
 * - 403 if isSmartCookieDefault
 * - 409 if status === ACTIVE
 * - If status READY and scheduledActivationAt is set:
 *   require body { confirmCancelSchedule: true }; without it, return 409 with { error: ..., requiresScheduleConfirmation: true };
 *   with it, clear the schedule and proceed
 * - Otherwise: soft-delete (deletedAt = now, permanentDeleteAt = +14 days, deletionBatchId = new uuid)
 */
router.delete('/:id', requirePermission('theme', 'delete'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const { id } = req.params;
    const theme = await prisma.theme.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!theme) {
      return res.status(404).json({ error: 'Theme not found.' });
    }

    // 1. 403 if isSmartCookieDefault
    if (theme.isSmartCookieDefault) {
      return res.status(403).json({ error: 'The Smart Cookie Default theme cannot be deleted.' });
    }

    // 2. 409 if status === ACTIVE
    if (theme.status === ThemeStatus.ACTIVE) {
      return res.status(409).json({ error: 'Cannot delete an active theme. Another theme must be activated first.' });
    }

    // 3. If status READY and scheduledActivationAt is set:
    if (theme.status === ThemeStatus.READY && theme.scheduledActivationAt !== null) {
      const confirmCancelSchedule = req.body?.confirmCancelSchedule === true;
      if (!confirmCancelSchedule) {
        return res.status(409).json({
          error: 'Theme has a scheduled activation. Confirmation required to cancel schedule and delete.',
          requiresScheduleConfirmation: true,
        });
      }
    }

    // 4. Soft-delete
    const deletedAt = new Date();
    const permanentDeleteAt = new Date(deletedAt.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
    const deletionBatchId = crypto.randomUUID();

    const deletedTheme = await prisma.theme.update({
      where: { id: theme.id },
      data: {
        deletedAt,
        permanentDeleteAt,
        deletionBatchId,
        scheduledActivationAt: null,
        scheduledActivationFailedAt: null,
        scheduledActivationFailedReason: null,
      },
    });

    // Delete any active locks for this theme
    await prisma.themeLock.deleteMany({
      where: { themeId: theme.id },
    });

    return res.json({
      success: true,
      message: 'Theme deleted successfully.',
      theme: deletedTheme,
    });
  } catch (error: any) {
    console.error('[Theme Router] Error deleting theme:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete theme.' });
  }
});

/**
 * POST /api/themes/:id/logo
 * Upload a custom logo for a theme (JPEG, PNG, GIF, WebP up to 2MB).
 * Gated by: theme:edit
 */
router.post(
  '/:id/logo',
  requireAuth,
  requirePermission('theme', 'edit'),
  (req: Request, res: Response, next: NextFunction) => {
    logoUpload.single('logo')(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds the maximum allowed limit of 2MB.' });
        }
        return res.status(400).json({ error: err.message || 'File upload error.' });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const companyId = await getEffectiveCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ error: 'No company associated with current user.' });
      }

      const { id } = req.params;
      const theme = await prisma.theme.findFirst({
        where: {
          id,
          companyId,
          deletedAt: null,
        },
      });

      if (!theme) {
        return res.status(404).json({ error: 'Theme not found.' });
      }

      if (theme.isSmartCookieDefault) {
        return res.status(403).json({ error: 'The Smart Cookie Default theme cannot be edited.' });
      }

      if (theme.status === ThemeStatus.ACTIVE) {
        return res.status(409).json({
          error: 'Active themes cannot be edited. Create a copy or edit in Draft/Ready status.',
        });
      }

      const lockStatus = await themeLockService.getLockStatus(id);
      if (lockStatus && req.user && lockStatus.userId !== req.user.id) {
        const verb = lockStatus.lockType === ThemeLockType.TEST ? 'testing' : 'editing';
        return res.status(409).json({
          error: `${lockStatus.holderName} is currently ${verb} this theme.`,
          holderName: lockStatus.holderName,
          lockType: lockStatus.lockType,
        });
      }

      const file = req.file;
      if (!file || !file.buffer) {
        return res.status(400).json({ error: 'No image file provided under the "logo" field.' });
      }

      const MAX_SIZE = 2 * 1024 * 1024; // 2MB
      if (file.buffer.length > MAX_SIZE) {
        return res.status(400).json({ error: 'File size exceeds the maximum allowed limit of 2MB.' });
      }

      let ext: string;
      try {
        ext = imageUploadService.validateImageSignature(file.buffer);
      } catch (validationErr: any) {
        if (validationErr instanceof InvalidImageError || validationErr.name === 'InvalidImageError') {
          return res.status(400).json({ error: validationErr.message });
        }
        return res.status(400).json({ error: 'Invalid image format: file does not match a supported image signature (JPEG, PNG, GIF, WebP).' });
      }

      // Delete previous logo file if one exists
      if (theme.logoStoragePath) {
        deleteLogoFile(theme.logoStoragePath);
      }

      // Save new logo file
      const savedPath = saveLogoFile(theme.id, ext, file.buffer);

      // Update theme record
      const updatedTheme = await prisma.theme.update({
        where: { id: theme.id },
        data: { logoStoragePath: savedPath },
        include: THEME_INCLUDE_FONTS,
      });

      return res.status(200).json({
        success: true,
        logoStoragePath: savedPath,
        theme: updatedTheme,
      });
    } catch (error: any) {
      console.error('[Theme Router] Error uploading theme logo:', error);
      if (error instanceof InvalidImageError || error.name === 'InvalidImageError') {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message || 'Failed to upload theme logo.' });
    }
  }
);

/**
 * GET /api/themes/:id/logo
 * Serves the theme logo file.
 * Public / unauthenticated route (usable in <img> tags across login/setup pages).
 * Cache-Control: public, max-age=86400
 */
router.get('/:id/logo', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const theme = await prisma.theme.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!theme || !theme.logoStoragePath) {
      return res.status(404).json({ error: 'Logo not found.' });
    }

    const fullPath = path.isAbsolute(theme.logoStoragePath)
      ? theme.logoStoragePath
      : path.resolve(process.cwd(), theme.logoStoragePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Logo file not found on disk.' });
    }

    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };

    const ext = path.extname(fullPath).replace(/^\./, '').toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(fullPath);
  } catch (error: any) {
    console.error('[Theme Router] Error serving theme logo:', error);
    return res.status(500).json({ error: 'Failed to serve theme logo.' });
  }
});

/**
 * DELETE /api/themes/:id/logo
 * Removes the theme logo file from disk and clears Theme.logoStoragePath.
 * Gated by: theme:edit
 */
router.delete('/:id/logo', requireAuth, requirePermission('theme', 'edit'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const { id } = req.params;
    const theme = await prisma.theme.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!theme) {
      return res.status(404).json({ error: 'Theme not found.' });
    }

    if (theme.isSmartCookieDefault) {
      return res.status(403).json({ error: 'The Smart Cookie Default theme cannot be edited.' });
    }

    if (theme.status === ThemeStatus.ACTIVE) {
      return res.status(409).json({
        error: 'Active themes cannot be edited. Create a copy or edit in Draft/Ready status.',
      });
    }

    const lockStatus = await themeLockService.getLockStatus(id);
    if (lockStatus && req.user && lockStatus.userId !== req.user.id) {
      const verb = lockStatus.lockType === ThemeLockType.TEST ? 'testing' : 'editing';
      return res.status(409).json({
        error: `${lockStatus.holderName} is currently ${verb} this theme.`,
        holderName: lockStatus.holderName,
        lockType: lockStatus.lockType,
      });
    }

    if (!theme.logoStoragePath) {
      return res.status(404).json({ error: 'No logo currently set for this theme.' });
    }

    deleteLogoFile(theme.logoStoragePath);

    const updatedTheme = await prisma.theme.update({
      where: { id: theme.id },
      data: { logoStoragePath: null },
      include: THEME_INCLUDE_FONTS,
    });

    return res.json({
      success: true,
      message: 'Logo deleted successfully.',
      theme: updatedTheme,
    });
  } catch (error: any) {
    console.error('[Theme Router] Error deleting theme logo:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete theme logo.' });
  }
});

/**
 * POST /api/themes/:id/lock
 * Acquire or refresh a lock on a theme.
 * Body: { lockType?: 'TEST' | 'EDIT' }
 * - lockType: 'TEST' requires theme:view
 * - lockType: 'EDIT' requires theme:edit
 * Returns 409 with holder name if currently locked by someone else.
 */
router.post('/:id/lock', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { id } = req.params;
    const lockTypeParam = req.body?.lockType === 'EDIT' ? ThemeLockType.EDIT : ThemeLockType.TEST;

    // Check permission: theme:view for TEST, theme:edit for EDIT
    const requiredAction = lockTypeParam === ThemeLockType.EDIT ? 'edit' : 'view';
    const hasPerm = await permissionResolverService.hasPermission(user.id, 'theme', requiredAction);
    if (!hasPerm && !user.isSuperuser) {
      return res.status(403).json({ error: `Forbidden: Missing required permission "theme:${requiredAction}".` });
    }

    const companyId = await getEffectiveCompanyId(req);
    const theme = await prisma.theme.findFirst({
      where: { id, ...(companyId ? { companyId } : {}), deletedAt: null },
    });

    if (!theme) {
      return res.status(404).json({ error: 'Theme not found.' });
    }

    const result = await themeLockService.acquireLock(id, user.id, lockTypeParam);
    if (!result.success) {
      const verb = result.lockType === ThemeLockType.TEST ? 'testing' : 'editing';
      return res.status(409).json({
        error: `${result.holderName} is currently ${verb} this theme.`,
        holderName: result.holderName,
        lockType: result.lockType,
        lockedAt: result.lockedAt,
      });
    }

    return res.json({
      success: true,
      lock: result.lock,
    });
  } catch (error: any) {
    console.error('[Theme Router] Error acquiring theme lock:', error);
    return res.status(500).json({ error: error.message || 'Failed to acquire theme lock.' });
  }
});

/**
 * DELETE /api/themes/:id/lock
 * Release current user's lock on a theme.
 * Gated by: requireAuth
 */
router.delete('/:id/lock', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { id } = req.params;
    const released = await themeLockService.releaseLock(id, user.id);
    return res.json({ success: true, released });
  } catch (error: any) {
    console.error('[Theme Router] Error releasing theme lock:', error);
    return res.status(500).json({ error: error.message || 'Failed to release theme lock.' });
  }
});

/**
 * GET /api/themes/:id/lock
 * Check lock status on a theme.
 * Gated by: theme:view
 */
router.get('/:id/lock', requirePermission('theme', 'view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lockStatus = await themeLockService.getLockStatus(id);

    if (!lockStatus) {
      return res.json({ isLocked: false, lock: null });
    }

    return res.json({
      isLocked: true,
      lock: {
        ...lockStatus,
        isMine: req.user?.id === lockStatus.userId,
      },
    });
  } catch (error: any) {
    console.error('[Theme Router] Error getting theme lock status:', error);
    return res.status(500).json({ error: error.message || 'Failed to get lock status.' });
  }
});

export default router;

