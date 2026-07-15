import { Router, Request, Response } from 'express';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { userInvitationService } from '../services/userInvitation.service';
import { prisma } from '../../../shared/db/prisma';
import { userManagementService } from '../services/userManagement.service';

const router = Router();

/**
 * GET /api/users
 * If the user has users:view permission and requests paginated results or is managing users,
 * returns a paginated list of users with their name, email, status, role, and organization unit.
 * Otherwise, falls back to returning the simple active users list (requires organization:view).
 */
router.get('/', async (req: Request, res: Response, next) => {
  const reqUser = req.user as any;
  const hasUsersView = reqUser?.effectivePermissions?.includes('users:view') || reqUser?.isSuperuser;
  const hasPageQuery = req.query.page !== undefined || req.query.limit !== undefined || req.query.search !== undefined || req.query.status !== undefined || req.query.roleId !== undefined || req.query.organizationUnitId !== undefined;

  if (hasUsersView && (hasPageQuery || !reqUser?.effectivePermissions?.includes('organization:view'))) {
    try {
      const filters = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined,
        roleId: req.query.roleId as string | undefined,
        organizationUnitId: req.query.organizationUnitId as string | undefined,
      };
      const result = await userManagementService.listUsers(req.user!.companyId!, filters);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to list users.' });
    }
  }
  next();
}, requirePermission('organization', 'view'), async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        companyId: req.user!.companyId!,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        username: true,
        email: true,
        status: true
      }
    });
    return res.json(users);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to list users.' });
  }
});

/**
 * GET /api/users/:id
 * Returns a user's full detail, including profile and memberships.
 * Requires users:view permission.
 */
router.get('/:id', requirePermission('users', 'view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'User ID is required.' });
    }
    const result = await userManagementService.getUserDetail(id, req.user!.id);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to fetch user details.' });
  }
});

/**
 * PUT /api/users/:id
 * Updates a user's standard fields and role/org/group assignments.
 * Requires users:edit permission.
 */
router.put('/:id', requirePermission('users', 'edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'User ID is required.' });
    }
    const result = await userManagementService.updateUser(id, req.body, req.user!.id);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to update user.' });
  }
});

/**
 * DELETE /api/users/:id
 * Archives a user (requires users:delete permission).
 */
router.delete('/:id', requirePermission('users', 'delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'User ID is required.' });
    }
    const result = await userManagementService.archiveUser(id, req.user!.id);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to archive user.' });
  }
});

/**
 * POST /api/users/:id/restore
 * Restores an archived user using UserReactivationService options.
 * Requires users:delete permission.
 */
router.post('/:id/restore', requirePermission('users', 'delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { option } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'User ID is required.' });
    }
    if (option !== 'RESTORE' && option !== 'FRESH_START') {
      return res.status(400).json({ error: 'Option must be RESTORE or FRESH_START.' });
    }
    const result = await userManagementService.restoreUser(id, option, req.user!.id);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to restore user.' });
  }
});

/**
 * POST /api/users/invite -> { email }
 * Requires users:create permission.
 * Returns the created user's id and status only.
 */
router.post('/invite', requirePermission('users', 'create'), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const result = await userInvitationService.invite(email);

    // Return the created user's id and status only
    return res.json({
      id: result.userId,
      status: 'PENDING',
    });
  } catch (error: any) {
    if (error.message === 'user already active' || error.message === 'already invited, use resend') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message || 'An internal error occurred.' });
  }
});

/**
 * POST /api/users/:id/resend-invitation
 * Requires users:edit permission.
 * Returns the updated user's id and status only.
 */
router.post('/:id/resend-invitation', requirePermission('users', 'edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    await userInvitationService.resendInvitation(id);

    // Return the updated user's id and status only
    return res.json({
      id,
      status: 'PENDING',
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/users/:id/admin-reset-password
 * Requires users:edit permission.
 * Delegates to userManagementService.adminResetPassword.
 */
router.post('/:id/admin-reset-password', requirePermission('users', 'edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    await userManagementService.adminResetPassword(id);

    return res.json({
      success: true,
      message: 'Password reset email sent successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'An internal error occurred.' });
  }
});

/**
 * POST /api/users/:id/admin-reset-mfa
 * Requires users:edit permission.
 * Admin action to reset MFA for a user.
 */
router.post('/:id/admin-reset-mfa', requirePermission('users', 'edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    const { mfaService } = await import('../services/mfa.service');
    await mfaService.adminResetMfa(id);

    return res.json({
      success: true,
      message: 'MFA reset successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'An internal error occurred.' });
  }
});

/**
 * POST /api/users/:id/reactivate
 * For backwards compatibility with other modules.
 * Requires assignments:edit permission.
 */
router.post('/:id/reactivate', requirePermission('assignments', 'edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { option } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    if (option !== 'RESTORE' && option !== 'FRESH_START') {
      return res.status(400).json({ error: 'Option must be RESTORE or FRESH_START.' });
    }

    const result = await userManagementService.restoreUser(id, option, req.user!.id);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to reactivate user.' });
  }
});

export default router;
