import { Router, Request, Response } from 'express';
import { prisma } from '../../../shared/db/prisma';
import { requireAuth } from '../../../shared/middleware/session.middleware';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { ProfileFieldService } from '../services/profileField.service';

const router = Router();
const profileFieldService = new ProfileFieldService();

/**
 * GET /api/profile-fields/categories
 * Returns all categories and their fields, as well as unassigned fields.
 */
router.get('/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const categories = await prisma.profileFieldCategory.findMany({
      where: { companyId: req.user!.companyId },
      include: {
        fields: {
          include: {
            editableByRoles: {
              select: { roleId: true }
            }
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    const unassignedFields = await prisma.profileFieldDefinition.findMany({
      where: {
        companyId: req.user!.companyId,
        categoryId: null,
      },
      include: {
        editableByRoles: {
          select: { roleId: true }
        }
      },
      orderBy: { displayOrder: 'asc' },
    });

    return res.json({
      categories,
      unassignedFields,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch categories and fields.' });
  }
});

/**
 * GET /api/profile-fields/roles
 * Returns all available roles for the current company.
 */
router.get('/roles', requireAuth, requirePermission('profile-fields', 'manage-fields'), async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      where: { companyId: req.user!.companyId },
      select: { id: true, name: true },
    });
    return res.json(roles);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch roles.' });
  }
});

/**
 * POST /api/profile-fields/categories
 * Creates a new profile field category.
 */
router.post('/categories', requireAuth, requirePermission('profile-fields', 'manage-categories'), async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const category = await profileFieldService.createCategory(req.user!.companyId, name);
    return res.status(201).json(category);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create category.' });
  }
});

/**
 * PATCH /api/profile-fields/categories/:id
 * Renames or reorders an existing profile field category.
 */
router.patch('/categories/:id', requireAuth, requirePermission('profile-fields', 'manage-categories'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, displayOrder } = req.body;

    let category = await prisma.profileFieldCategory.findUnique({
      where: { id },
    });

    if (!category || category.companyId !== req.user!.companyId) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    if (name !== undefined) {
      category = await profileFieldService.renameCategory(id, name);
    }

    if (displayOrder !== undefined) {
      category = await profileFieldService.reorderCategory(id, displayOrder);
    }

    return res.json(category);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update category.' });
  }
});

/**
 * DELETE /api/profile-fields/categories/:id
 * Deletes a category. Fields in the category are set to null category.
 */
router.delete('/categories/:id', requireAuth, requirePermission('profile-fields', 'manage-categories'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = await prisma.profileFieldCategory.findUnique({
      where: { id },
    });

    if (!category || category.companyId !== req.user!.companyId) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    await prisma.profileFieldCategory.delete({
      where: { id },
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to delete category.' });
  }
});

/**
 * POST /api/profile-fields/definitions
 * Creates a new profile field definition (custom fields only).
 */
router.post('/definitions', requireAuth, requirePermission('profile-fields', 'manage-fields'), async (req: Request, res: Response) => {
  try {
    const {
      name,
      categoryId,
      description,
      fieldType,
      required,
      visible,
      editableByUser,
      defaultValue,
      validationRules,
      options,
    } = req.body;

    const field = await profileFieldService.createField(req.user!.companyId, {
      name,
      categoryId,
      description,
      fieldType,
      required: !!required,
      visible: visible !== undefined ? !!visible : true,
      editableByUser: editableByUser !== undefined ? !!editableByUser : true,
      defaultValue,
      validationRules,
      options,
    });

    return res.status(201).json(field);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create field definition.' });
  }
});

/**
 * PATCH /api/profile-fields/definitions/:id
 * Updates an existing profile field definition.
 */
router.patch('/definitions/:id', requireAuth, requirePermission('profile-fields', 'manage-fields'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      categoryId,
      description,
      required,
      visible,
      editableByUser,
      defaultValue,
      validationRules,
      options,
    } = req.body;

    const existing = await prisma.profileFieldDefinition.findUnique({
      where: { id },
    });

    if (!existing || existing.companyId !== req.user!.companyId) {
      return res.status(404).json({ error: 'Field definition not found.' });
    }

    const field = await profileFieldService.updateField(id, {
      name,
      categoryId,
      description,
      required,
      visible,
      editableByUser,
      defaultValue,
      validationRules,
      options,
    });

    return res.json(field);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update field definition.' });
  }
});

/**
 * DELETE /api/profile-fields/definitions/:id
 * Deletes a field definition (custom only).
 */
router.delete('/definitions/:id', requireAuth, requirePermission('profile-fields', 'manage-fields'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.profileFieldDefinition.findUnique({
      where: { id },
    });

    if (!existing || existing.companyId !== req.user!.companyId) {
      return res.status(404).json({ error: 'Field definition not found.' });
    }

    await profileFieldService.deleteField(id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to delete field definition.' });
  }
});

/**
 * POST /api/profile-fields/definitions/:id/move-up
 */
router.post('/definitions/:id/move-up', requireAuth, requirePermission('profile-fields', 'manage-fields'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.profileFieldDefinition.findUnique({
      where: { id },
    });

    if (!existing || existing.companyId !== req.user!.companyId) {
      return res.status(404).json({ error: 'Field definition not found.' });
    }

    const field = await profileFieldService.moveFieldUp(id);
    return res.json(field);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to move field up.' });
  }
});

/**
 * POST /api/profile-fields/definitions/:id/move-down
 */
router.post('/definitions/:id/move-down', requireAuth, requirePermission('profile-fields', 'manage-fields'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.profileFieldDefinition.findUnique({
      where: { id },
    });

    if (!existing || existing.companyId !== req.user!.companyId) {
      return res.status(404).json({ error: 'Field definition not found.' });
    }

    const field = await profileFieldService.moveFieldDown(id);
    return res.json(field);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to move field down.' });
  }
});

/**
 * POST /api/profile-fields/definitions/:id/roles
 */
router.post('/definitions/:id/roles', requireAuth, requirePermission('profile-fields', 'manage-fields'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { roleIds } = req.body;

    if (!Array.isArray(roleIds)) {
      return res.status(400).json({ error: 'roleIds must be an array of strings.' });
    }

    const existing = await prisma.profileFieldDefinition.findUnique({
      where: { id },
    });

    if (!existing || existing.companyId !== req.user!.companyId) {
      return res.status(404).json({ error: 'Field definition not found.' });
    }

    const field = await profileFieldService.setEditableByRoles(id, roleIds);
    return res.json(field);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to assign editable roles.' });
  }
});

export default router;
