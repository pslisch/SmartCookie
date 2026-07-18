import { Router, Request, Response } from 'express';
import { prisma } from '../../../shared/db/prisma';
import { requireAuth } from '../../../shared/middleware/session.middleware';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { encrypt } from '../../../shared/crypto/encryption';
import nodemailer from 'nodemailer';

const router = Router();

/**
 * GET /api/company/email-config
 * Retrieves the company-wide email/SMTP configuration.
 * Gated by: organization:edit
 */
router.get('/', requireAuth, requirePermission('organization', 'edit'), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'User is not associated with a company.' });
    }

    const config = await prisma.emailConfig.findUnique({
      where: { companyId },
    });

    if (!config) {
      return res.json(null);
    }

    return res.json({
      id: config.id,
      companyId: config.companyId,
      host: config.host,
      port: config.port,
      username: config.username,
      passwordConfigured: true,
      fromAddress: config.fromAddress,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch email configuration.' });
  }
});

/**
 * POST /api/company/email-config/test
 * Tests the provided SMTP credentials using nodemailer.verify().
 * Gated by: organization:edit
 * Never persists anything.
 */
router.post('/test', requireAuth, requirePermission('organization', 'edit'), async (req: Request, res: Response) => {
  try {
    const { host, port, username, password, fromAddress } = req.body;
    if (!host || !port || !username || !password || !fromAddress) {
      return res.status(400).json({ error: 'All mail configuration fields (host, port, username, password, fromAddress) are required.' });
    }

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
    return res.json({ success: true, message: 'Mail server connection verified successfully.' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to verify mail server connection.' });
  }
});

/**
 * POST /api/company/email-config
 * Creates or updates the company's email/SMTP configuration.
 * Gated by: organization:edit
 */
router.post('/', requireAuth, requirePermission('organization', 'edit'), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'User is not associated with a company.' });
    }

    const { host, port, username, password, fromAddress } = req.body;
    if (!host || !port || !username || !password || !fromAddress) {
      return res.status(400).json({ error: 'All mail configuration fields (host, port, username, password, fromAddress) are required.' });
    }

    const passwordEncrypted = encrypt(password);

    const config = await prisma.$transaction(async (tx) => {
      const emailConfig = await tx.emailConfig.upsert({
        where: { companyId },
        create: {
          companyId,
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
        },
      });

      await tx.company.update({
        where: { id: companyId },
        data: { mailConfigStepCompletedAt: new Date() },
      });

      return emailConfig;
    });

    return res.json({
      success: true,
      config: {
        id: config.id,
        companyId: config.companyId,
        host: config.host,
        port: config.port,
        username: config.username,
        passwordConfigured: true,
        fromAddress: config.fromAddress,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to save email configuration.' });
  }
});

export default router;
