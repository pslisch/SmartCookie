import { Router, Request, Response } from 'express';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { organizationUnitService } from '../services/organizationUnit.service';
import { prisma } from '../../../shared/db/prisma';

const router = Router();

// GET /api/organization-units - List active or soft-deleted organization units for the company
router.get('/', requirePermission('organization', 'view'), async (req: Request, res: Response) => {
  try {
    const showDeleted = req.query.showDeleted === 'true';
    const ous = await prisma.organizationUnit.findMany({
      where: {
        companyId: req.user!.companyId!,
        deletedAt: showDeleted ? { not: null } : null
      },
      include: {
        memberships: {
          where: {
            deletedAt: null
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        }
      }
    });
    return res.json(ous);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to list organization units.' });
  }
});

// GET /api/organization-units/:id - Retrieve a single organization unit
router.get('/:id', requirePermission('organization', 'view'), async (req: Request, res: Response) => {
  try {
    const ou = await prisma.organizationUnit.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId!
      }
    });
    if (!ou) {
      return res.status(404).json({ error: 'Organization unit not found.' });
    }
    return res.json(ou);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to retrieve organization unit.' });
  }
});

// POST /api/organization-units - Create a new organization unit
router.post('/', requirePermission('organization', 'create'), async (req: Request, res: Response) => {
  try {
    const { name, parentId } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required.' });
    }
    const ou = await organizationUnitService.create(name, parentId, req.user!.companyId!);
    return res.status(201).json(ou);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to create organization unit.' });
  }
});

// PUT /api/organization-units/:id - Rename an organization unit
router.put('/:id', requirePermission('organization', 'edit'), async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'New name is required.' });
    }
    const updated = await organizationUnitService.rename(req.params.id, name);
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to rename organization unit.' });
  }
});

// POST /api/organization-units/:id/move - Move an organization unit to a new parent
router.post('/:id/move', requirePermission('organization', 'edit'), async (req: Request, res: Response) => {
  try {
    const { parentId } = req.body;
    const updated = await organizationUnitService.move(req.params.id, parentId === undefined ? null : parentId);
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to move organization unit.' });
  }
});

// GET /api/organization-units/:id/deletion-preview - Get deletion preview of affected users
router.get('/:id/deletion-preview', requirePermission('organization', 'view'), async (req: Request, res: Response) => {
  try {
    const option = (req.query.option as string) === 'SUBTREE' ? 'SUBTREE' : 'REASSIGN';
    const users = await organizationUnitService.getAffectedUsers(req.params.id, option);
    return res.json(users);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to load deletion preview.' });
  }
});

// DELETE /api/organization-units/:id - Soft delete an organization unit
router.delete('/:id', requirePermission('organization', 'delete'), async (req: Request, res: Response) => {
  try {
    const option = (req.query.option as string) === 'SUBTREE' ? 'SUBTREE' : 'REASSIGN';
    const result = await organizationUnitService.delete(req.params.id, option);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to delete organization unit.' });
  }
});

// POST /api/organization-units/:id/restore - Restore a soft deleted organization unit
router.post('/:id/restore', requirePermission('organization', 'delete'), async (req: Request, res: Response) => {
  try {
    const result = await organizationUnitService.restore(req.params.id);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to restore organization unit.' });
  }
});

// POST /api/organization-units/:id/managers - Assign a manager to an organization unit
router.post('/:id/managers', requirePermission('organization', 'manage-members'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required.' });
    }
    const membership = await organizationUnitService.assignManager(userId, req.params.id, req.user!.id);
    return res.status(201).json(membership);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to assign manager.' });
  }
});

// POST /api/organization-units/:id/members - Move a user to this organization unit as a member
router.post('/:id/members', requirePermission('organization', 'manage-members'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required.' });
    }
    const membership = await organizationUnitService.moveUser(userId, req.params.id, req.user!.id);
    return res.status(201).json(membership);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to move user.' });
  }
});

// DELETE /api/organization-units/:id/managers/:userId - Remove a manager from an organization unit
router.delete('/:id/managers/:userId', requirePermission('organization', 'manage-members'), async (req: Request, res: Response) => {
  try {
    const result = await organizationUnitService.removeManager(req.params.userId, req.params.id);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to remove manager.' });
  }
});

export default router;
