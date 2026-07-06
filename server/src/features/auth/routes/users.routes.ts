import { Router, Request, Response } from 'express';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { userInvitationService } from '../services/userInvitation.service';
import { prisma } from '../../../shared/db/prisma';
import { TokenService } from '../../../shared/token/token.service';
import { TokenPurpose } from '@prisma/client';
import { emailService } from '../../../shared/email/email.service';
import { PASSWORD_RESET_TTL_SECONDS } from '../../../shared/constants';

const router = Router();

/**
 * GET /api/users
 * Returns a list of active users for the current company.
 */
router.get('/', requirePermission('organization', 'view'), async (req: Request, res: Response) => {
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
    // If it's a known domain validation/business rule error, return 400
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
 * Same underlying token+email mechanism as forgot-password,
 * triggered by an admin.
 */
router.post('/:id/admin-reset-password', requirePermission('users', 'edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Cannot reset password for a non-active user.' });
    }

    // Issue PASSWORD_RESET token
    const token = await TokenService.issue(user.id, TokenPurpose.PASSWORD_RESET, PASSWORD_RESET_TTL_SECONDS);

    // Send email
    await emailService.send(user.email, 'password-reset', {
      username: user.username || user.email,
      token,
    });

    return res.json({
      success: true,
      message: 'Password reset email sent successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'An internal error occurred.' });
  }
});

export default router;

