import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../../../shared/db/prisma';
import { emailPasswordAuthProvider } from '../services/auth.service';
import { emailService } from '../../../shared/email/email.service';
import { loginRateLimiter, forgotPasswordRateLimiter } from '../../../shared/middleware/rateLimit.middleware';
import { requireAuth } from '../../../shared/middleware/session.middleware';
import { SESSION_DURATION_MS, PASSWORD_RESET_TTL_SECONDS } from '../../../shared/constants';
import { TokenService } from '../../../shared/token/token.service';
import { TokenPurpose } from '@prisma/client';
import { permissionResolverService } from '../../rbac/services/permissionResolver.service';
import { mandatoryAssignmentService } from '../../assignments/services/mandatoryAssignment.service';
import { ProfileFieldValueService } from '../../profiles/services/profileFieldValue.service';
import { issueSession } from '../services/sessionHelper';

const router = Router();

/**
 * POST /api/auth/login -> { identifier, password }
 */
router.post('/login', loginRateLimiter.middleware, async (req: Request, res: Response) => {
  try {
    const { identifier, username, password } = req.body;
    const loginIdentifier = identifier || username;
    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }

    const user = await emailPasswordAuthProvider.authenticate({ identifier: loginIdentifier, password });

    // Reset rate limiter count for this identifier on successful login
    loginRateLimiter.reset(req);

    // Check if MFA is required for this user
    const company = user.companyId ? await prisma.company.findUnique({
      where: { id: user.companyId },
    }) : null;

    const isMfaRequired = user.mfaEnabled || 
      (company && company.mfaPolicy === 'ENFORCED') ||
      (company && company.mfaPolicy === 'ROLE_BASED' && user.roleId && (await prisma.mfaPolicyRole.findUnique({
        where: { companyId_roleId: { companyId: company.id, roleId: user.roleId } }
      })) !== null);

    if (isMfaRequired) {
      if (user.mfaEnabled) {
        const challengeToken = await TokenService.issue(user.id, TokenPurpose.MFA_CHALLENGE, 300);
        return res.json({
          success: false,
          mfaRequired: true,
          challengeToken,
        });
      } else {
        const setupToken = await TokenService.issue(user.id, TokenPurpose.MFA_CHALLENGE, 300);
        return res.json({
          success: false,
          mfaSetupRequired: true,
          setupToken,
        });
      }
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!fullUser) {
      throw new Error('User not found.');
    }

    const sessionResult = await issueSession(fullUser, req, res);

    res.json({
      success: true,
      user: sessionResult.user,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (err.name === 'AuthenticationError') {
      loginRateLimiter.recordFailure(req);
      return res.status(401).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'An internal error occurred.' });
  }
});

/**
 * POST /api/auth/mfa/verify
 * Request body: { challengeToken, code }
 */
router.post('/mfa/verify', loginRateLimiter.middleware, async (req: Request, res: Response) => {
  try {
    const { challengeToken, code } = req.body;
    if (!challengeToken || !code) {
      return res.status(400).json({ error: 'Challenge token and code are required.' });
    }

    const userId = await TokenService.consume(challengeToken, TokenPurpose.MFA_CHALLENGE);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify code: TOTP or recovery code
    let isValid = false;
    let isRecovery = false;

    if (user.mfaSecretEncrypted) {
      try {
        const { decrypt } = await import('../../../shared/crypto/encryption');
        const otplib = await import('otplib');
        const decryptedSecret = decrypt(user.mfaSecretEncrypted);
        const result = otplib.verifySync({
          token: code,
          secret: decryptedSecret,
        });
        if (result && result.valid) {
          isValid = true;
        }
      } catch (err) {
        console.error('Error verifying TOTP:', err);
      }
    }

    if (!isValid) {
      // Check recovery codes
      const hashedCode = crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
      const recoveryCodeRecord = await prisma.mfaRecoveryCode.findFirst({
        where: {
          userId,
          codeHash: hashedCode,
          usedAt: null,
        },
      });

      if (recoveryCodeRecord) {
        isValid = true;
        isRecovery = true;
        await prisma.mfaRecoveryCode.update({
          where: { id: recoveryCodeRecord.id },
          data: { usedAt: new Date() },
        });
      }
    }

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    // Login succeeded! Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session in DB
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      },
    });

    // Set cookie
    res.cookie('sid', session.id, {
      httpOnly: true,
      secure: true,
      signed: true,
      expires: expiresAt,
      sameSite: 'lax',
    });

    let roleName: string | null = null;
    let effectivePermissions: string[] = [];

    if (user.isSuperuser) {
      roleName = 'Superuser';
    } else if (user.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: user.roleId },
      });
      roleName = role ? role.name : null;
      const permissions = await permissionResolverService.getEffectivePermissions(user.roleId);
      effectivePermissions = permissions.map((p) => `${p.module}:${p.action}`);
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        isSuperuser: user.isSuperuser,
        recoveryEmail: user.recoveryEmail,
        companyId: user.companyId,
        status: user.status,
        roleName,
        effectivePermissions,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Verification failed.' });
  }
});

/**
 * POST /api/auth/mfa/setup-pending
 * Request body: { setupToken }
 */
router.post('/mfa/setup-pending', async (req: Request, res: Response) => {
  try {
    const { setupToken } = req.body;
    if (!setupToken) {
      return res.status(400).json({ error: 'Setup token is required.' });
    }

    const tokenHash = TokenService.hashToken(setupToken);
    const token = await prisma.token.findUnique({
      where: { tokenHash },
    });

    if (!token || token.purpose !== TokenPurpose.MFA_CHALLENGE || token.usedAt !== null || token.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid, used, or expired setup token.' });
    }

    const { mfaService } = await import('../services/mfa.service');
    const { secret, otpauthUrl } = await mfaService.generateSecret(token.userId);

    return res.json({
      success: true,
      secret,
      otpauthUrl,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to generate secret.' });
  }
});

/**
 * POST /api/auth/mfa/enable-pending
 * Request body: { setupToken, pendingSecret, code }
 */
router.post('/mfa/enable-pending', async (req: Request, res: Response) => {
  try {
    const { setupToken, pendingSecret, code } = req.body;
    if (!setupToken || !pendingSecret || !code) {
      return res.status(400).json({ error: 'Setup token, pending secret, and verification code are required.' });
    }

    const userId = await TokenService.consume(setupToken, TokenPurpose.MFA_CHALLENGE);

    const { mfaService } = await import('../services/mfa.service');
    const recoveryCodes = await mfaService.verifyAndEnable(userId, pendingSecret, code);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session in DB
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      },
    });

    // Set cookie
    res.cookie('sid', session.id, {
      httpOnly: true,
      secure: true,
      signed: true,
      expires: expiresAt,
      sameSite: 'lax',
    });

    let roleName: string | null = null;
    let effectivePermissions: string[] = [];

    if (user.isSuperuser) {
      roleName = 'Superuser';
    } else if (user.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: user.roleId },
      });
      roleName = role ? role.name : null;
      const permissions = await permissionResolverService.getEffectivePermissions(user.roleId);
      effectivePermissions = permissions.map((p) => `${p.module}:${p.action}`);
    }

    return res.json({
      success: true,
      recoveryCodes,
      user: {
        id: user.id,
        username: user.username,
        isSuperuser: user.isSuperuser,
        recoveryEmail: user.recoveryEmail,
        companyId: user.companyId,
        status: user.status,
        roleName,
        effectivePermissions,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'MFA enablement failed.' });
  }
});

/**
 * POST /api/auth/logout -> invalidates session and clears cookie
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const sessionId = req.signedCookies?.sid;
    res.clearCookie('sid');

    if (sessionId) {
      await prisma.session.deleteMany({
        where: { id: sessionId },
      });
    }

    res.json({ success: true });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    res.status(500).json({ error: err.message || 'An internal error occurred.' });
  }
});

/**
 * GET /api/auth/session -> returns user identity if authenticated
 */
router.get('/session', requireAuth, async (req: Request, res: Response) => {
  try {
    let roleName: string | null = null;
    let effectivePermissions: string[] = [];

    if (req.user.isSuperuser) {
      roleName = 'Superuser';
    } else if (req.user.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: req.user.roleId },
      });
      roleName = role ? role.name : null;
      const permissions = await permissionResolverService.getEffectivePermissions(req.user.roleId);
      effectivePermissions = permissions.map((p) => `${p.module}:${p.action}`);
    }

    let incompleteRequiredFields: string[] = [];
    if (req.user.companyId) {
      try {
        const profileFieldValueService = new ProfileFieldValueService();
        const completion = await profileFieldValueService.getProfileCompletionPercentage(req.user.id);
        incompleteRequiredFields = completion.missingFields.map((f) => f.id);
      } catch (err) {
        console.error('Error fetching profile completion for session:', err);
      }
    }

    res.json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        isSuperuser: req.user.isSuperuser,
        recoveryEmail: req.user.recoveryEmail,
        companyId: req.user.companyId,
        status: req.user.status,
        roleName,
        effectivePermissions,
        incompleteRequiredFields,
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    res.status(500).json({ error: err.message || 'An internal error occurred.' });
  }
});

/**
 * PATCH /api/auth/recovery-email -> updates recoveryEmail and sends Old Email security notification
 */
router.patch('/recovery-email', requireAuth, async (req: Request, res: Response) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail || typeof newEmail !== 'string' || !newEmail.trim()) {
      return res.status(400).json({ error: 'Valid new recovery email is required.' });
    }

    const oldEmail = req.user.recoveryEmail;
    const trimmedNewEmail = newEmail.trim();

    // Update DB
    await prisma.user.update({
      where: { id: req.user.id },
      data: { recoveryEmail: trimmedNewEmail },
    });

    // Notify the OLD address of the change using EmailService
    await emailService.send(oldEmail, 'recovery-email-changed', {
      username: req.user.username,
      oldEmail,
      newEmail: trimmedNewEmail,
    });

    res.json({
      success: true,
      newEmail: trimmedNewEmail,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    res.status(500).json({ error: err.message || 'An internal error occurred.' });
  }
});

/**
 * POST /api/auth/activate -> { token, password }
 * Consumes the INVITATION token, validates the password against policy,
 * sets passwordHash and status to ACTIVE, creates a session and logs the user in immediately.
 */
router.post('/activate', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required.' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    // First validate the password policy before consuming the token to avoid burning a token on a weak password
    emailPasswordAuthProvider.validatePassword(password);

    // Consume the token (validates correctness, purpose, expiration, reuse, and marks it used)
    const userId = await TokenService.consume(token, TokenPurpose.INVITATION);

    // Fetch the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Set passwordHash + status ACTIVE. Automatically set username to email if it was null
    const passwordHash = await emailPasswordAuthProvider.hashPassword(password);
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        status: 'ACTIVE',
        username: user.username || user.email,
      },
    });

    // Auto-create instances for mandatory assignments
    await mandatoryAssignmentService.onUserActivated(updatedUser.id);

    // Create session in the DB
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS); // 30 days
    const session = await prisma.session.create({
      data: {
        userId: updatedUser.id,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      },
    });

    // Set HTTP-only session cookie
    res.cookie('sid', session.id, {
      httpOnly: true,
      secure: true,
      signed: true,
      expires: expiresAt,
      sameSite: 'lax',
    });

    let roleName: string | null = null;
    let effectivePermissions: string[] = [];

    if (updatedUser.isSuperuser) {
      roleName = 'Superuser';
    } else if (updatedUser.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: updatedUser.roleId },
      });
      roleName = role ? role.name : null;
      const permissions = await permissionResolverService.getEffectivePermissions(updatedUser.roleId);
      effectivePermissions = permissions.map((p) => `${p.module}:${p.action}`);
    }

    return res.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        isSuperuser: updatedUser.isSuperuser,
        recoveryEmail: updatedUser.recoveryEmail,
        companyId: updatedUser.companyId,
        status: updatedUser.status,
        roleName,
        effectivePermissions,
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const isValidationError =
      err.name === 'PasswordValidationError' ||
      err.message === 'Invalid token' ||
      err.message === 'Token already used' ||
      err.message === 'Token expired' ||
      err.message === 'Token already used or expired';

    return res.status(isValidationError ? 400 : 500).json({
      error: err.message || 'An internal error occurred.'
    });
  }
});

/**
 * POST /api/auth/forgot-password -> { email }
 * ALWAYS returns the same generic response regardless of outcome.
 * Internally: only proceeds (issue token + send email) if user exists AND status is ACTIVE.
 * Rate limited by email + IP, independent from login rate limiter.
 */
router.post('/forgot-password', forgotPasswordRateLimiter.middleware, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Look up the user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // If active, run the token generation and email sending in the background to prevent timing channels
    if (user && user.status === 'ACTIVE') {
      TokenService.issue(user.id, TokenPurpose.PASSWORD_RESET, PASSWORD_RESET_TTL_SECONDS)
        .then(async (token) => {
          await emailService.send(normalizedEmail, 'password-reset', {
            username: user.username || normalizedEmail,
            token,
          });
        })
        .catch((err) => {
          console.error('Error in forgot-password background service:', err);
        });
    }

    // Always return the exact same success response immediately
    return res.json({
      success: true,
      message: 'If the email exists and is active, a password reset link has been sent.',
    });
  } catch (error) {
    return res.status(500).json({ error: 'An internal error occurred.' });
  }
});

/**
 * POST /api/auth/reset-password -> { token, newPassword }
 * Consumes the PASSWORD_RESET token, validates the new password against policy,
 * updates the user's passwordHash, invalidates ALL existing sessions for the user,
 * and logs them in immediately with a fresh session.
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required.' });
    }
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required.' });
    }

    // Validate the password policy before consuming/burning the token
    emailPasswordAuthProvider.validatePassword(newPassword);

    // Consume the PASSWORD_RESET token (validates correctness, purpose, expiration, and marks it used)
    const userId = await TokenService.consume(token, TokenPurpose.PASSWORD_RESET);

    // Fetch user to verify existence
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Hash the new password and update the database
    const passwordHash = await emailPasswordAuthProvider.hashPassword(newPassword);
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate ALL existing sessions for this user (security measure)
    await prisma.session.deleteMany({
      where: { userId },
    });

    // Create a single fresh session for the resetting device
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    const session = await prisma.session.create({
      data: {
        userId: updatedUser.id,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      },
    });

    // Set the HTTP-only session cookie
    res.cookie('sid', session.id, {
      httpOnly: true,
      secure: true,
      signed: true,
      expires: expiresAt,
      sameSite: 'lax',
    });

    let roleName: string | null = null;
    let effectivePermissions: string[] = [];

    if (updatedUser.isSuperuser) {
      roleName = 'Superuser';
    } else if (updatedUser.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: updatedUser.roleId },
      });
      roleName = role ? role.name : null;
      const permissions = await permissionResolverService.getEffectivePermissions(updatedUser.roleId);
      effectivePermissions = permissions.map((p) => `${p.module}:${p.action}`);
    }

    return res.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        isSuperuser: updatedUser.isSuperuser,
        recoveryEmail: updatedUser.recoveryEmail,
        companyId: updatedUser.companyId,
        status: updatedUser.status,
        roleName,
        effectivePermissions,
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const isValidationError =
      err.name === 'PasswordValidationError' ||
      err.message === 'Invalid token' ||
      err.message === 'Token already used' ||
      err.message === 'Token expired' ||
      err.message === 'Token already used or expired';

    return res.status(isValidationError ? 400 : 500).json({
      error: err.message || 'An internal error occurred.',
    });
  }
});

/**
 * POST /api/auth/change-email/request -> { newEmail }
 * Authenticated route. Validates new email is not in use, generates a token, and sends confirmation email to the NEW email address.
 */
router.post('/change-email/request', requireAuth, async (req: Request, res: Response) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail || typeof newEmail !== 'string' || !newEmail.trim()) {
      return res.status(400).json({ error: 'Valid new email is required.' });
    }

    const normalizedNewEmail = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedNewEmail)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    if (req.user.email && normalizedNewEmail === req.user.email.toLowerCase()) {
      return res.status(400).json({ error: 'New email cannot be the same as your current email.' });
    }

    // Check if the new email is already in use by another user
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedNewEmail },
    });
    if (existingUser) {
      return res.status(400).json({ error: 'This email is already in use by another user.' });
    }

    // Issue an EMAIL_CHANGE token (expires in 24 hours) with pendingEmail set
    const token = await TokenService.issue(
      req.user.id,
      TokenPurpose.EMAIL_CHANGE,
      86400, // 24 hours
      normalizedNewEmail
    );

    // Send verification email to the new address
    await emailService.send(normalizedNewEmail, 'email-change-verification', {
      username: req.user.username || req.user.firstName || normalizedNewEmail,
      newEmail: normalizedNewEmail,
      token,
    });

    return res.json({
      success: true,
      message: 'Verification email sent to your new email address.',
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return res.status(500).json({ error: err.message || 'An internal error occurred.' });
  }
});

/**
 * POST /api/auth/change-email/confirm -> { token }
 * Public route. Consumes EMAIL_CHANGE token, updates the email, and invalidates all existing sessions.
 */
router.post('/change-email/confirm', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required.' });
    }

    // Atomically consume token and get details
    const { userId, pendingEmail } = await TokenService.consumeWithPendingEmail(token, TokenPurpose.EMAIL_CHANGE);

    if (!pendingEmail) {
      return res.status(400).json({ error: 'No pending email address associated with this token.' });
    }

    const normalizedPendingEmail = pendingEmail.toLowerCase();

    // Verify again that the email isn't in use (to handle race conditions)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedPendingEmail },
    });
    if (existingUser) {
      return res.status(400).json({ error: 'This email is already in use by another user.' });
    }

    // Update the user's email
    await prisma.user.update({
      where: { id: userId },
      data: { email: normalizedPendingEmail },
    });

    // Invalidate all sessions for this user (credentials/identity changed)
    await prisma.session.deleteMany({
      where: { userId },
    });

    // Clear session cookie
    res.clearCookie('sid');

    return res.json({
      success: true,
      message: 'Email changed successfully. Please log in again.',
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const isValidationError =
      err.message === 'Invalid token' ||
      err.message === 'Token already used' ||
      err.message === 'Token expired' ||
      err.message === 'Token already used or expired';

    return res.status(isValidationError ? 400 : 500).json({
      error: err.message || 'An internal error occurred.',
    });
  }
});

/**
 * POST /api/auth/change-password
 * Authenticated. Changes the currently logged-in user's password.
 */
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required.' });
    }
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required.' });
    }

    // 1. Fetch user again with passwordHash from database
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });
    if (!user || !user.passwordHash) {
      return res.status(404).json({ error: 'User not found or does not have a local password.' });
    }

    // 2. Verify current password
    const isCurrentValid = await emailPasswordAuthProvider.verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return res.status(400).json({ error: 'The current password you entered is incorrect.' });
    }

    // 3. Validate new password format/strength
    try {
      emailPasswordAuthProvider.validatePassword(newPassword);
    } catch (validationErr: any) {
      return res.status(400).json({ error: validationErr.message });
    }

    // 4. Hash new password and save
    const newPasswordHash = await emailPasswordAuthProvider.hashPassword(newPassword);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash: newPasswordHash },
    });

    return res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'An internal error occurred.' });
  }
});

export default router;
