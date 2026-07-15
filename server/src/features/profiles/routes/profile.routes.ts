import { Router, Request, Response } from 'express';
import { requireAuth } from '../../../shared/middleware/session.middleware';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { ProfileFieldValueService } from '../services/profileFieldValue.service';
import { prisma } from '../../../shared/db/prisma';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { ImageUploadService } from '../../content/services/imageUpload.service';

const router = Router();
const profileFieldValueService = new ProfileFieldValueService();
const upload = multer({ storage: multer.memoryStorage() });
const imageUploadService = new ImageUploadService();

/**
 * GET /api/profile/me
 * Returns the current user's complete profile fields and values.
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const profile = await profileFieldValueService.getProfile(req.user!.id, req.user!.id);
    return res.json(profile);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to fetch your profile.' });
  }
});

/**
 * GET /api/profile/me/completion
 * Returns the current user's profile completion metrics.
 */
router.get('/me/completion', requireAuth, async (req: Request, res: Response) => {
  try {
    const metrics = await profileFieldValueService.getProfileCompletionPercentage(req.user!.id);
    return res.json(metrics);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to fetch profile completion.' });
  }
});

/**
 * PUT /api/profile/me
 * Updates multiple profile fields for the current user.
 */
router.put('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const { fields } = req.body;
    if (!fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: 'An array of fields is required.' });
    }

    for (const item of fields) {
      await profileFieldValueService.setFieldValue(
        req.user!.id,
        item.fieldDefinitionId,
        item.value !== undefined ? item.value : null,
        req.user!.id
      );
    }

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to update profile.' });
  }
});

/**
 * POST /api/profile/picture
 * Uploads a profile picture for the logged-in user.
 * Enforces magic-bytes checking and 2MB size limit.
 */
router.post('/picture', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required in the "file" field.' });
    }

    // 1. Enforce max size of 2MB
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (req.file.buffer.length > MAX_SIZE) {
      return res.status(400).json({ error: 'File size exceeds the maximum allowed limit of 2MB.' });
    }

    // 2. Validate content is actually a valid image by magic bytes signature
    let ext: string;
    try {
      ext = imageUploadService.validateImageSignature(req.file.buffer);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }

    // 3. Ensure target directory exists
    const storageDir = path.join(process.cwd(), 'storage', 'profile_pictures');
    fs.mkdirSync(storageDir, { recursive: true });

    // 4. Save unique file
    const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const targetPath = path.join(storageDir, filename);
    fs.writeFileSync(targetPath, req.file.buffer);

    // 5. Update user's profile picture path
    const urlPath = `/api/profile/picture/raw/${filename}`;
    
    // Update User model directly in db
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { profilePicturePath: urlPath },
    });

    return res.json({ success: true, profilePicturePath: urlPath });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to upload profile picture.' });
  }
});

/**
 * GET /api/profile/picture/raw/:filename
 * Serves raw profile picture files.
 */
router.get('/picture/raw/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename.' });
    }

    const filePath = path.join(process.cwd(), 'storage', 'profile_pictures', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found.' });
    }

    return res.sendFile(filePath);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to serve image.' });
  }
});

/**
 * PUT /api/profile/:userId
 * Updates profile fields for a specific user (requires users:edit permission).
 */
router.put('/:userId', requireAuth, requirePermission('users', 'edit'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { fields } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }
    if (!fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: 'An array of fields is required.' });
    }

    for (const item of fields) {
      await profileFieldValueService.setFieldValue(
        userId,
        item.fieldDefinitionId,
        item.value !== undefined ? item.value : null,
        req.user!.id
      );
    }

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to update user profile.' });
  }
});

/**
 * GET /api/profile/me/account-info
 * Returns the read-only system/account details for the currently logged-in user.
 */
router.get('/me/account-info', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        role: true,
        company: true,
        memberships: {
          where: { deletedAt: null },
          include: {
            organizationUnit: true,
            learningGroup: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Process memberships
    const organizationUnits = user.memberships
      .filter((m) => m.organizationUnit && !m.deletedAt)
      .map((m) => m.organizationUnit!);

    const learningGroups = user.memberships
      .filter((m) => m.learningGroup && !m.deletedAt)
      .map((m) => m.learningGroup!);

    // top-level units vs nested
    const assignedOrgUnits = organizationUnits.filter(ou => !ou.parentId).map(ou => ou.name);
    const assignedSubOrgUnits = organizationUnits.filter(ou => ou.parentId).map(ou => ou.name);

    // parent learning groups vs sub learning groups
    const assignedGroups = learningGroups.filter(lg => !lg.parentGroupId).map(lg => lg.name);
    const assignedSubgroups = learningGroups.filter(lg => lg.parentGroupId).map(lg => lg.name);

    // Merge company name as primary assigned organization if no top-level OUs
    const finalOrgName = assignedOrgUnits.length > 0 
      ? assignedOrgUnits.join(', ') 
      : (user.company ? user.company.name : 'None');

    return res.json({
      userId: user.id,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      loginProvider: user.passwordHash ? 'Email / Password' : 'OAuth / SSO',
      status: user.status,
      role: user.role ? user.role.name : 'None',
      organization: finalOrgName,
      company: user.company ? user.company.name : 'None',
      groups: assignedGroups,
      subgroups: [
        ...assignedSubgroups,
        ...assignedSubOrgUnits
      ]
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch account info.' });
  }
});

/**
 * GET /api/profile/mfa/status
 * Returns MFA status of current logged-in user.
 */
router.get('/mfa/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({
      mfaEnabled: user.mfaEnabled,
      mfaEnabledAt: user.mfaEnabledAt,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch MFA status.' });
  }
});

/**
 * GET /api/profile/mfa/setup
 * Generates pending secret and URI.
 */
router.get('/mfa/setup', requireAuth, async (req: Request, res: Response) => {
  try {
    const { mfaService } = await import('../../auth/services/mfa.service');
    const { secret, otpauthUrl } = await mfaService.generateSecret(req.user!.id);
    return res.json({
      success: true,
      secret,
      otpauthUrl,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to initiate MFA setup.' });
  }
});

/**
 * POST /api/profile/mfa/enable
 * Verifies and enables MFA for the user.
 */
router.post('/mfa/enable', requireAuth, async (req: Request, res: Response) => {
  try {
    const { pendingSecret, code } = req.body;
    if (!pendingSecret || !code) {
      return res.status(400).json({ error: 'Pending secret and verification code are required.' });
    }

    const { mfaService } = await import('../../auth/services/mfa.service');
    const recoveryCodes = await mfaService.verifyAndEnable(req.user!.id, pendingSecret, code);

    return res.json({
      success: true,
      recoveryCodes,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to enable MFA.' });
  }
});

/**
 * POST /api/profile/mfa/disable
 * Disables MFA requiring current password confirmation.
 */
router.post('/mfa/disable', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword } = req.body;
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required to disable MFA.' });
    }

    const { mfaService } = await import('../../auth/services/mfa.service');
    await mfaService.disableMfa(req.user!.id, currentPassword);

    return res.json({
      success: true,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to disable MFA.' });
  }
});

/**
 * POST /api/profile/mfa/regenerate-recovery
 * Regenerates recovery codes for the current user.
 */
router.post('/mfa/regenerate-recovery', requireAuth, async (req: Request, res: Response) => {
  try {
    const { mfaService } = await import('../../auth/services/mfa.service');
    const recoveryCodes = await mfaService.regenerateRecoveryCodes(req.user!.id);

    return res.json({
      success: true,
      recoveryCodes,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to regenerate recovery codes.' });
  }
});

export default router;
