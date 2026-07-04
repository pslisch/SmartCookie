import { Router, Request, Response } from 'express';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { prisma } from '../../../shared/db/prisma';

const router = Router();

/**
 * GET /api/company/settings — get company settings
 * Requires roles:manage permission.
 */
router.get('/settings', requirePermission('roles', 'manage'), async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.companyId) {
      return res.status(401).json({ error: 'Unauthorized: User is missing company context.' });
    }

    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
      select: { roleInheritanceEnabled: true },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }

    return res.json(company);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch company settings.' });
  }
});

/**
 * PATCH /api/company/settings — update company settings (e.g. roleInheritanceEnabled)
 * Requires roles:manage permission.
 */
router.patch('/settings', requirePermission('roles', 'manage'), async (req: Request, res: Response) => {
  try {
    const { roleInheritanceEnabled } = req.body;

    if (roleInheritanceEnabled === undefined || typeof roleInheritanceEnabled !== 'boolean') {
      return res.status(400).json({ error: 'roleInheritanceEnabled must be a boolean.' });
    }

    if (!req.user || !req.user.companyId) {
      return res.status(401).json({ error: 'Unauthorized: User is missing company context.' });
    }

    const updatedCompany = await prisma.company.update({
      where: { id: req.user.companyId },
      data: { roleInheritanceEnabled },
    });

    return res.json(updatedCompany);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to update company settings.' });
  }
});

export default router;
