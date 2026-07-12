import { Router, Request, Response } from 'express';
import { requireAuth } from '../../../shared/middleware/session.middleware';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { permissionResolverService } from '../../rbac/services/permissionResolver.service';
import { prisma } from '../../../shared/db/prisma';

const router = Router();

/**
 * GET /api/preview/eligible-roles
 */
router.get('/preview/eligible-roles', requirePermission('preview', 'use'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!user.companyId) {
      return res.status(400).json({ error: 'User must belong to a company.' });
    }

    // 1. Get all roles in the company
    const roles = await prisma.role.findMany({
      where: { companyId: user.companyId },
    });

    // 2. Determine requester's effective permissions
    let reqPermStrings: Set<string>;
    if (user.isSuperuser) {
      const allPerms = await prisma.permission.findMany();
      reqPermStrings = new Set(allPerms.map(p => `${p.module}:${p.action}`));
    } else {
      if (!user.roleId) {
        return res.json([]);
      }
      const perms = await permissionResolverService.getEffectivePermissions(user.roleId);
      reqPermStrings = new Set(perms.map(p => `${p.module}:${p.action}`));
    }

    const eligibleRoles = [];

    for (const role of roles) {
      // Exclude requester's own role
      if (role.id === user.roleId) {
        continue;
      }

      // Get candidate role's effective permissions
      const candPerms = await permissionResolverService.getEffectivePermissions(role.id);
      const candPermStrings = candPerms.map(p => `${p.module}:${p.action}`);

      // Check if every permission candidate holds, requester also holds
      const isSubset = candPermStrings.every(p => reqPermStrings.has(p));

      // Check if there is a strict non-empty difference (requester has some permission(s) that candidate lacks)
      const hasStrictDifference = Array.from(reqPermStrings).some(p => !candPermStrings.includes(p));

      if (isSubset && hasStrictDifference) {
        eligibleRoles.push({
          id: role.id,
          name: role.name,
        });
      }
    }

    return res.json(eligibleRoles);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to list eligible roles.' });
  }
});

/**
 * GET /api/roles/:id/effective-permissions
 */
router.get('/roles/:id/effective-permissions', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const hasPreviewUse = await permissionResolverService.hasPermission(user.id, 'preview', 'use');
    const hasRolesManage = await permissionResolverService.hasPermission(user.id, 'roles', 'manage');
    if (!hasPreviewUse && !hasRolesManage) {
      return res.status(403).json({ error: 'Forbidden: Missing required permission preview:use or roles:manage.' });
    }

    const { id } = req.params;

    // Check if the role belongs to the user's company
    const role = await prisma.role.findUnique({
      where: { id },
    });
    if (!role) {
      return res.status(404).json({ error: `Role with ID ${id} not found.` });
    }
    if (role.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Forbidden: Access denied to this role.' });
    }

    const perms = await permissionResolverService.getEffectivePermissions(id);
    const flatPerms = perms.map((p) => `${p.module}:${p.action}`);
    return res.json(flatPerms);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch effective permissions.' });
  }
});

export default router;
