import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../../shared/db/prisma';
import { setupWizardService } from '../services/setupWizard.service';
import { requireAuth } from '../../../shared/middleware/session.middleware';
import { SESSION_DURATION_MS } from '../../../shared/constants';

const router = Router();

/**
 * Middleware to reject requests if the setup wizard is already fully completed.
 * All three routes (status, superuser, company) must 403 once setup is complete.
 */
const checkNotComplete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await setupWizardService.getStatus();
    if (status === 'complete') {
      return res.status(403).json({ error: 'Setup is already complete.' });
    }
    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error.' });
  }
};

router.use(checkNotComplete);

/**
 * GET /api/setup/status -> returns current step of setup.
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await setupWizardService.getStatus();
    res.json({ status });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to check status.' });
  }
});

/**
 * POST /api/setup/superuser -> creates the primary system superuser,
 * then generates a session and cookie to automatically log them in.
 */
router.post('/superuser', async (req: Request, res: Response) => {
  try {
    const { username, password, recoveryEmail } = req.body;
    if (!username || !password || !recoveryEmail) {
      return res.status(400).json({ error: 'Username, password, and recovery email are required.' });
    }

    const superuser = await setupWizardService.createSuperuser(username, password, recoveryEmail);

    // Create a database session for the new superuser
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS); // 30 days
    const session = await prisma.session.create({
      data: {
        userId: superuser.id,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      },
    });

    // Set signed cookie for the session ID
    res.cookie('sid', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      signed: true,
      expires: expiresAt,
      sameSite: 'lax',
    });

    res.status(201).json({
      success: true,
      user: {
        id: superuser.id,
        username: superuser.username,
        isSuperuser: superuser.isSuperuser,
        recoveryEmail: superuser.recoveryEmail,
      },
    });
  } catch (error: any) {
    const isValidationError =
      error.name === 'PasswordValidationError' ||
      error.message.includes('required') ||
      error.message.includes('already taken') ||
      error.message.includes('exists');

    res.status(isValidationError ? 400 : 500).json({ error: error.message || 'Failed to create superuser.' });
  }
});

/**
 * POST /api/setup/company -> completes company setup step.
 * Requires an active superuser session.
 */
router.post('/company', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, contactInfo } = req.body;
    if (!name || !contactInfo) {
      return res.status(400).json({ error: 'Company name and contact info are required.' });
    }

    const user = req.user;
    if (!user || !user.isSuperuser || user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Forbidden: Requires an active superuser session.' });
    }

    const company = await setupWizardService.completeCompanyStep(name, contactInfo);

    res.status(200).json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        contactInfo: company.contactInfo,
        setupCompletedAt: company.setupCompletedAt,
      },
    });
  } catch (error: any) {
    const isValidationError = error.message.includes('required') || error.message.includes('before completing');
    res.status(isValidationError ? 400 : 500).json({ error: error.message || 'Failed to complete company step.' });
  }
});

/**
 * POST /api/setup/role-templates -> completes role template selection step.
 * Requires an active superuser session.
 */
router.post('/role-templates', requireAuth, async (req: Request, res: Response) => {
  try {
    const { selectedNames } = req.body;
    if (!selectedNames || !Array.isArray(selectedNames)) {
      return res.status(400).json({ error: 'selectedNames must be an array of strings.' });
    }

    const user = req.user;
    if (!user || !user.isSuperuser || user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Forbidden: Requires an active superuser session.' });
    }

    if (!user.companyId) {
      return res.status(400).json({ error: 'User is not associated with any company yet.' });
    }

    const company = await setupWizardService.completeRoleTemplatesStep(user.companyId, selectedNames);

    res.status(200).json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        contactInfo: company.contactInfo,
        setupCompletedAt: company.setupCompletedAt,
      },
    });
  } catch (error: any) {
    const isValidationError = error.message.includes('required') || error.message.includes('before completing');
    res.status(isValidationError ? 400 : 500).json({ error: error.message || 'Failed to complete role templates step.' });
  }
});

export default router;
