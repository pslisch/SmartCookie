import { Router, Request, Response } from 'express';
import { prisma } from '../../../shared/db/prisma';
import { requirePermission } from '../../../shared/middleware/permission.middleware';

const router = Router();

// All email template routes require the notifications:manage-templates permission
router.use(requirePermission('notifications', 'manage-templates'));

/**
 * GET /api/email-templates
 * List all active email templates for the requesting user's company (deletedAt: null).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const templates = await prisma.emailTemplate.findMany({
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
        _count: {
          select: {
            notificationRules: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return res.json(templates);
  } catch (error: any) {
    console.error('[Email Templates] Error fetching templates:', error);
    return res.status(500).json({ error: 'Failed to retrieve email templates.' });
  }
});

/**
 * GET /api/email-templates/:id
 * Retrieve a specific email template by ID (must belong to user's company and deletedAt: null).
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const { id } = req.params;
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id,
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
        _count: {
          select: {
            notificationRules: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Email template not found.' });
    }

    return res.json(template);
  } catch (error: any) {
    console.error('[Email Templates] Error retrieving template:', error);
    return res.status(500).json({ error: 'Failed to retrieve email template.' });
  }
});

/**
 * POST /api/email-templates
 * Create a new email template.
 * Required: name, htmlContent
 * Optional: isDefault (boolean) — if true, atomically unsets existing default for the company.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;
    if (!companyId || !userId) {
      return res.status(401).json({ error: 'Unauthorized: User or company context missing.' });
    }

    const { name, htmlContent, isDefault } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required and must be a non-empty string.' });
    }

    // Validate htmlContent
    if (!htmlContent || typeof htmlContent !== 'string' || htmlContent.trim().length === 0) {
      return res.status(400).json({ error: 'htmlContent is required and must be a non-empty string.' });
    }

    // Validate isDefault if provided
    if (isDefault !== undefined && typeof isDefault !== 'boolean') {
      return res.status(400).json({ error: 'isDefault must be a boolean.' });
    }

    const shouldSetDefault = Boolean(isDefault);

    // Atomically manage default flag and create template
    const createdTemplate = await prisma.$transaction(async (tx) => {
      if (shouldSetDefault) {
        await tx.emailTemplate.updateMany({
          where: {
            companyId,
            isDefault: true,
            deletedAt: null,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.emailTemplate.create({
        data: {
          companyId,
          name: name.trim(),
          htmlContent,
          isDefault: shouldSetDefault,
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
          _count: {
            select: {
              notificationRules: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      });
    });

    return res.status(201).json(createdTemplate);
  } catch (error: any) {
    console.error('[Email Templates] Error creating template:', error);
    return res.status(500).json({ error: 'Failed to create email template.' });
  }
});

/**
 * PATCH /api/email-templates/:id
 * Update an existing email template.
 * Optional: name, htmlContent, isDefault
 * If isDefault is set to true, atomically unsets any other default template for the company.
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const { id } = req.params;
    const existing = await prisma.emailTemplate.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Email template not found.' });
    }

    const { name, htmlContent, isDefault } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name must be a non-empty string.' });
      }
    }

    if (htmlContent !== undefined) {
      if (typeof htmlContent !== 'string' || htmlContent.trim().length === 0) {
        return res.status(400).json({ error: 'htmlContent must be a non-empty string.' });
      }
    }

    if (isDefault !== undefined) {
      if (typeof isDefault !== 'boolean') {
        return res.status(400).json({ error: 'isDefault must be a boolean.' });
      }
    }

    const updatedTemplate = await prisma.$transaction(async (tx) => {
      if (isDefault === true) {
        // Unset default on any other active template in the company
        await tx.emailTemplate.updateMany({
          where: {
            companyId,
            id: { not: id },
            isDefault: true,
            deletedAt: null,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.emailTemplate.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name: name.trim() } : {}),
          ...(htmlContent !== undefined ? { htmlContent } : {}),
          ...(isDefault !== undefined ? { isDefault } : {}),
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
          _count: {
            select: {
              notificationRules: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      });
    });

    return res.json(updatedTemplate);
  } catch (error: any) {
    console.error('[Email Templates] Error updating template:', error);
    return res.status(500).json({ error: 'Failed to update email template.' });
  }
});

/**
 * DELETE /api/email-templates/:id
 * Soft-delete an email template.
 * Rejection conditions:
 * 1. Default template cannot be deleted outright (400) — require unsetting default first via PATCH.
 * 2. Template referenced by any active NotificationRule cannot be deleted (400).
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with current user.' });
    }

    const { id } = req.params;
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Email template not found.' });
    }

    // Reject deleting the current default template outright
    if (template.isDefault) {
      return res.status(400).json({
        error: 'Cannot delete the current default email template. Please designate another default template or unset default status first via PATCH.',
      });
    }

    // Reject deleting if referenced by any active notification rules
    const referencingRuleCount = await prisma.notificationRule.count({
      where: {
        emailTemplateId: id,
        deletedAt: null,
      },
    });

    if (referencingRuleCount > 0) {
      return res.status(400).json({
        error: `Cannot delete email template because it is currently referenced by ${referencingRuleCount} notification rule(s). Please reassign or clear those rules first.`,
      });
    }

    // Soft delete
    await prisma.emailTemplate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return res.json({ success: true, message: 'Email template deleted successfully.' });
  } catch (error: any) {
    console.error('[Email Templates] Error deleting template:', error);
    return res.status(500).json({ error: 'Failed to delete email template.' });
  }
});

export default router;
