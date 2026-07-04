import { Router, Request, Response } from 'express';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { prisma } from '../../../shared/db/prisma';

const router = Router();

/**
 * GET /api/permissions — full registry (module -> actions with IDs)
 * Returns a dictionary: { [module: string]: { id: string, action: string }[] }
 */
router.get('/', requirePermission('roles', 'manage'), async (req: Request, res: Response) => {
  try {
    const allPermissions = await prisma.permission.findMany();
    const grouped: Record<string, Array<{ id: string; action: string }>> = {};

    for (const p of allPermissions) {
      if (!grouped[p.module]) {
        grouped[p.module] = [];
      }
      grouped[p.module].push({
        id: p.id,
        action: p.action,
      });
    }

    return res.json(grouped);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to list permissions.' });
  }
});

export default router;
