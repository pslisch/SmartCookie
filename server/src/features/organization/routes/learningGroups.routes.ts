import { Router, Request, Response } from 'express';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { learningGroupService } from '../services/learningGroup.service';
import { prisma } from '../../../shared/db/prisma';

const router = Router();

// GET /api/learning-groups - List active or soft-deleted learning groups for the company
router.get('/', requirePermission('organization', 'view'), async (req: Request, res: Response) => {
  try {
    const showDeleted = req.query.showDeleted === 'true';
    const groups = await prisma.learningGroup.findMany({
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
    return res.json(groups);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to list learning groups.' });
  }
});

// GET /api/learning-groups/expiring - List temporary groups expiring soon
router.get('/expiring', requirePermission('organization', 'view'), async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const threshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days (matching scheduler threshold)

    const groups = await prisma.learningGroup.findMany({
      where: {
        companyId: req.user!.companyId!,
        isTemporary: true,
        deletedAt: null,
        expiresAt: {
          gt: now,
          lte: threshold
        }
      }
    });
    return res.json(groups);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to list expiring learning groups.' });
  }
});

// GET /api/learning-groups/:id - Retrieve a single learning group
router.get('/:id', requirePermission('organization', 'view'), async (req: Request, res: Response) => {
  try {
    const group = await prisma.learningGroup.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId!
      }
    });
    if (!group) {
      return res.status(404).json({ error: 'Learning group not found.' });
    }
    return res.json(group);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to retrieve learning group.' });
  }
});

// POST /api/learning-groups - Create a new learning group
router.post('/', requirePermission('organization', 'create'), async (req: Request, res: Response) => {
  try {
    const { name, parentGroupId, isTemporary, expiresAt } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required.' });
    }
    const group = await learningGroupService.create(
      name,
      parentGroupId,
      !!isTemporary,
      expiresAt ? new Date(expiresAt) : null,
      req.user!.companyId!
    );
    return res.status(201).json(group);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to create learning group.' });
  }
});

// PUT /api/learning-groups/:id - Update name / edit group
router.put('/:id', requirePermission('organization', 'edit'), async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'New name is required.' });
    }
    const updated = await learningGroupService.rename(req.params.id, name);
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to update learning group.' });
  }
});

// POST /api/learning-groups/:id/move - Move group in hierarchy
router.post('/:id/move', requirePermission('organization', 'edit'), async (req: Request, res: Response) => {
  try {
    const { parentGroupId } = req.body;
    const updated = await learningGroupService.move(req.params.id, parentGroupId === undefined ? null : parentGroupId);
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to move learning group.' });
  }
});

// DELETE /api/learning-groups/:id - Soft delete learning group
router.delete('/:id', requirePermission('organization', 'delete'), async (req: Request, res: Response) => {
  try {
    const result = await learningGroupService.delete(req.params.id);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to delete learning group.' });
  }
});

// POST /api/learning-groups/:id/restore - Restore a soft-deleted learning group
router.post('/:id/restore', requirePermission('organization', 'delete'), async (req: Request, res: Response) => {
  try {
    const result = await learningGroupService.restore(req.params.id);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to restore learning group.' });
  }
});

// POST /api/learning-groups/:id/members - Add a user as a member
router.post('/:id/members', requirePermission('organization', 'manage-members'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required.' });
    }
    const membership = await learningGroupService.addMember(userId, req.params.id, req.user!.id);
    return res.status(201).json(membership);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to add member.' });
  }
});

// DELETE /api/learning-groups/:id/members/:userId - Remove a user from group
router.delete('/:id/members/:userId', requirePermission('organization', 'manage-members'), async (req: Request, res: Response) => {
  try {
    const result = await learningGroupService.removeMember(req.params.userId, req.params.id);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to remove member.' });
  }
});

// PATCH /api/learning-groups/:id/extend - Extend learning group expiration date
router.patch('/:id/extend', requirePermission('organization', 'manage-groups'), async (req: Request, res: Response) => {
  try {
    const { newExpiresAt } = req.body;
    if (!newExpiresAt) {
      return res.status(400).json({ error: 'New expiration date is required.' });
    }

    const group = await prisma.learningGroup.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId!,
        deletedAt: null
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Learning group not found or has been deleted.' });
    }

    const updated = await prisma.learningGroup.update({
      where: { id: req.params.id },
      data: {
        expiresAt: new Date(newExpiresAt),
        reminderSentAt: null
      }
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to extend learning group.' });
  }
});

export default router;
