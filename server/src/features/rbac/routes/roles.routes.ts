import { Router, Request, Response } from 'express';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { roleService } from '../services/role.service';
import { roleTemplatesService } from '../services/roleTemplates.service';
import { prisma } from '../../../shared/db/prisma';

const router = Router();

/**
 * GET /api/roles — list all roles for the company
 * Returns: { id, name, isProtected, parentRoleId, permissionCount }[]
 */
router.get('/', requirePermission('roles', 'manage'), async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      where: { companyId: req.user!.companyId! },
      include: {
        permissions: true,
      },
    });

    const mapped = roles.map((role) => ({
      id: role.id,
      name: role.name,
      isProtected: role.isProtected,
      parentRoleId: role.parentRoleId,
      permissionCount: role.permissions.length,
    }));

    return res.json(mapped);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to list roles.' });
  }
});

/**
 * POST /api/roles — create a new role
 */
router.post('/', requirePermission('roles', 'manage'), async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Role name is required.' });
    }

    const newRole = await roleService.create(name, req.user!.companyId!);
    return res.status(201).json(newRole);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to create role.' });
  }
});

/**
 * POST /api/roles/seed-templates — seed default role templates for the company
 */
router.post('/seed-templates', requirePermission('roles', 'manage'), async (req: Request, res: Response) => {
  try {
    const { selectedNames } = req.body;
    if (!selectedNames || !Array.isArray(selectedNames)) {
      return res.status(400).json({ error: 'selectedNames must be an array of strings.' });
    }

    const seeded = await roleTemplatesService.seedTemplates(req.user!.companyId!, selectedNames);
    return res.status(200).json(seeded);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to seed templates.' });
  }
});

/**
 * POST /api/roles/:id/duplicate — duplicate an existing role
 */
router.post('/:id/duplicate', requirePermission('roles', 'manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      return res.status(404).json({ error: `Role with ID ${id} not found.` });
    }

    if (role.companyId !== req.user!.companyId!) {
      return res.status(403).json({ error: 'Forbidden: Access denied to this role.' });
    }

    const duplicated = await roleService.duplicate(id);
    return res.status(201).json(duplicated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to duplicate role.' });
  }
});

/**
 * DELETE /api/roles/:id — delete a role
 */
router.delete('/:id', requirePermission('roles', 'manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      return res.status(404).json({ error: `Role with ID ${id} not found.` });
    }

    if (role.companyId !== req.user!.companyId!) {
      return res.status(403).json({ error: 'Forbidden: Access denied to this role.' });
    }

    const response = await roleService.delete(id);
    return res.json(response);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to delete role.' });
  }
});

/**
 * GET /api/roles/:id/permissions — full permission list grouped by module, with checked/unchecked state for this role
 */
router.get('/:id/permissions', requirePermission('roles', 'manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: true,
      },
    });

    if (!role) {
      return res.status(404).json({ error: `Role with ID ${id} not found.` });
    }

    if (role.companyId !== req.user!.companyId!) {
      return res.status(403).json({ error: 'Forbidden: Access denied to this role.' });
    }

    const allPermissions = await prisma.permission.findMany();
    const assignedPermissionIds = new Set(role.permissions.map((p) => p.permissionId));

    const grouped: Record<string, Array<{ id: string; action: string; checked: boolean }>> = {};

    for (const p of allPermissions) {
      if (!grouped[p.module]) {
        grouped[p.module] = [];
      }
      grouped[p.module].push({
        id: p.id,
        action: p.action,
        checked: assignedPermissionIds.has(p.id),
      });
    }

    return res.json(grouped);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch permissions for role.' });
  }
});

/**
 * PATCH /api/roles/:id — rename / set permissions / set parent
 */
router.patch('/:id', requirePermission('roles', 'manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, permissionIds, parentRoleId } = req.body;

    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      return res.status(404).json({ error: `Role with ID ${id} not found.` });
    }

    if (role.companyId !== req.user!.companyId!) {
      return res.status(403).json({ error: 'Forbidden: Access denied to this role.' });
    }

    // Process fields if supplied
    if (name !== undefined) {
      await roleService.rename(id, name);
    }

    if (parentRoleId !== undefined) {
      await roleService.setParent(id, parentRoleId);
    }

    if (permissionIds !== undefined) {
      await roleService.updatePermissions(id, permissionIds);
    }

    const updated = await roleService.getById(id);
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to update role.' });
  }
});

export default router;
