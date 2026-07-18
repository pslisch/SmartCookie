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
      secure: true,
      signed: true,
      expires: expiresAt,
      sameSite: 'none',
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
 * GET /api/setup/mfa/setup -> generates a new TOTP secret for the logged-in superuser.
 * Requires active superuser session.
 */
router.get('/mfa/setup', requireAuth, async (req: Request, res: Response) => {
  try {
    const status = await setupWizardService.getStatus();
    if (status !== 'superuser-mfa') {
      return res.status(400).json({ error: 'MFA setup is not the active step.' });
    }

    const { mfaService } = await import('../services/mfa.service');
    const { secret, otpauthUrl } = await mfaService.generateSecret(req.user!.id);

    res.json({
      success: true,
      secret,
      otpauthUrl,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate MFA secret.' });
  }
});

/**
 * POST /api/setup/mfa/verify -> verifies and enables MFA for the logged-in superuser.
 * Requires active superuser session.
 */
router.post('/mfa/verify', requireAuth, async (req: Request, res: Response) => {
  try {
    const status = await setupWizardService.getStatus();
    if (status !== 'superuser-mfa') {
      return res.status(400).json({ error: 'MFA verification is not the active step.' });
    }

    const { pendingSecret, code } = req.body;
    if (!pendingSecret || !code) {
      return res.status(400).json({ error: 'Pending secret and verification code are required.' });
    }

    const { mfaService } = await import('../services/mfa.service');
    const recoveryCodes = await mfaService.verifyAndEnable(req.user!.id, pendingSecret, code);

    res.json({
      success: true,
      recoveryCodes,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to verify and enable MFA.' });
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
 * POST /api/setup/mail-config/test -> tests SMTP mail server connection.
 * Requires active superuser session. Never persists anything.
 */
router.post('/mail-config/test', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.isSuperuser || user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Forbidden: Requires an active superuser session.' });
    }

    const { host, port, username, password, fromAddress } = req.body;
    if (!host || !port || !username || !password || !fromAddress) {
      return res.status(400).json({ error: 'All mail configuration fields (host, port, username, password, fromAddress) are required.' });
    }

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: {
        user: username,
        pass: password,
      },
    });

    await transporter.verify();
    res.json({ success: true, message: 'Mail server connection verified successfully.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to verify mail server connection.' });
  }
});

/**
 * POST /api/setup/mail-config -> saves email configuration and marks mail-config step complete.
 * Requires active superuser session.
 */
router.post('/mail-config', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.isSuperuser || user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Forbidden: Requires an active superuser session.' });
    }
    if (!user.companyId) {
      return res.status(400).json({ error: 'User is not associated with any company.' });
    }

    const { host, port, username, password, fromAddress } = req.body;
    if (!host || !port || !username || !password || !fromAddress) {
      return res.status(400).json({ error: 'All mail configuration fields (host, port, username, password, fromAddress) are required.' });
    }

    const { encrypt } = await import('../../../shared/crypto/encryption');
    const passwordEncrypted = encrypt(password);

    await prisma.$transaction(async (tx) => {
      await tx.emailConfig.upsert({
        where: { companyId: user.companyId! },
        create: {
          companyId: user.companyId!,
          host,
          port: Number(port),
          username,
          passwordEncrypted,
          fromAddress,
        },
        update: {
          host,
          port: Number(port),
          username,
          passwordEncrypted,
          fromAddress,
        }
      });

      await tx.company.update({
        where: { id: user.companyId! },
        data: { mailConfigStepCompletedAt: new Date() }
      });
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save mail configuration.' });
  }
});

/**
 * POST /api/setup/mail-config/skip -> skips email configuration step.
 * Requires active superuser session.
 */
router.post('/mail-config/skip', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.isSuperuser || user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Forbidden: Requires an active superuser session.' });
    }
    if (!user.companyId) {
      return res.status(400).json({ error: 'User is not associated with any company.' });
    }

    await prisma.company.update({
      where: { id: user.companyId! },
      data: { mailConfigStepCompletedAt: new Date() }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to skip mail configuration.' });
  }
});

/**
 * POST /api/setup/identity-provider/test -> Connection-test for Entra during setup.
 * Never persists anything.
 */
router.post('/identity-provider/test', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.isSuperuser || user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Forbidden: Requires an active superuser session.' });
    }

    const { tenantId, clientId, clientSecret } = req.body;
    if (!tenantId || !clientId || !clientSecret) {
      return res.status(400).json({ error: 'Tenant ID, Client ID, and Client Secret are required.' });
    }

    const { EntraGraphClient } = await import('../../identity/providers/entraGraphClient');
    await EntraGraphClient.validateConnection(tenantId, clientId, clientSecret);

    const client = new EntraGraphClient(tenantId, clientId, clientSecret);
    const token = await client.acquireApplicationToken();
    
    const decodeJwt = (t: string) => {
      try {
        const parts = t.split('.');
        if (parts.length !== 3) return null;
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
        return JSON.parse(payloadJson);
      } catch {
        return null;
      }
    };

    const payload = decodeJwt(token);
    const roles: string[] = Array.isArray(payload?.roles) ? payload.roles : [];

    const userReadAllGranted = roles.includes('User.Read.All');
    const groupReadAllGranted = roles.includes('Group.Read.All');

    const permissions = [
      {
        permission: 'User.Read.All',
        status: userReadAllGranted ? 'Granted' : 'Missing',
        explanation: userReadAllGranted 
          ? 'Granted. Required to read Entra user profiles and sync them into LMS.'
          : 'Missing. Required to read Entra user profiles.'
      },
      {
        permission: 'Group.Read.All',
        status: groupReadAllGranted ? 'Granted' : 'Missing',
        explanation: groupReadAllGranted 
          ? 'Granted. Required to read Entra groups and sync organizational units.'
          : 'Missing. Required to read Entra groups.'
      }
    ];

    const allGranted = userReadAllGranted && groupReadAllGranted;

    res.json({
      success: true,
      allGranted,
      permissions
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      allGranted: false,
      error: error.message || 'Failed to verify connection.'
    });
  }
});

/**
 * POST /api/setup/identity-provider -> saves Microsoft Entra configuration and marks identity-provider step complete.
 * Requires active superuser session.
 */
router.post('/identity-provider', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.isSuperuser || user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Forbidden: Requires an active superuser session.' });
    }
    if (!user.companyId) {
      return res.status(400).json({ error: 'User is not associated with any company.' });
    }

    const { tenantId, clientId, clientSecret } = req.body;
    if (!tenantId || !clientId || !clientSecret) {
      return res.status(400).json({ error: 'Tenant ID, Client ID, and Client Secret are required.' });
    }

    const { encrypt } = await import('../../../shared/crypto/encryption');
    const encryptedSecret = encrypt(clientSecret);

    await prisma.$transaction(async (tx) => {
      await tx.identityProviderConfig.upsert({
        where: {
          companyId_providerType: {
            companyId: user.companyId!,
            providerType: 'MICROSOFT_ENTRA'
          }
        },
        create: {
          companyId: user.companyId!,
          providerType: 'MICROSOFT_ENTRA',
          enabled: true,
          tenantId,
          clientId,
          clientSecretEncrypted: encryptedSecret,
          loginMode: 'BOTH',
          importStrategy: 'FIRST_LOGIN',
        },
        update: {
          tenantId,
          clientId,
          clientSecretEncrypted: encryptedSecret,
          enabled: true
        }
      });

      await tx.company.update({
        where: { id: user.companyId! },
        data: { identityProviderStepCompletedAt: new Date() }
      });
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save identity provider configuration.' });
  }
});

/**
 * POST /api/setup/identity-provider/skip -> skips Microsoft Entra configuration step.
 * Requires active superuser session.
 */
router.post('/identity-provider/skip', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.isSuperuser || user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Forbidden: Requires an active superuser session.' });
    }
    if (!user.companyId) {
      return res.status(400).json({ error: 'User is not associated with any company.' });
    }

    await prisma.company.update({
      where: { id: user.companyId! },
      data: { identityProviderStepCompletedAt: new Date() }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to skip identity provider step.' });
  }
});

/**
 * POST /api/setup/org-structure -> completes organizational structure setup step.
 * Requires an active superuser session.
 */
router.post('/org-structure', requireAuth, async (req: Request, res: Response) => {
  try {
    const { ouNames } = req.body;
    if (!ouNames || !Array.isArray(ouNames)) {
      return res.status(400).json({ error: 'ouNames must be an array of strings.' });
    }

    const user = req.user;
    if (!user || !user.isSuperuser || user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Forbidden: Requires an active superuser session.' });
    }

    if (!user.companyId) {
      return res.status(400).json({ error: 'User is not associated with any company yet.' });
    }

    const company = await setupWizardService.completeOrgStructureStep(user.companyId, ouNames);

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
    res.status(isValidationError ? 400 : 500).json({ error: error.message || 'Failed to complete organization structure step.' });
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
