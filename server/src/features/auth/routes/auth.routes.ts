import { Router, Request, Response } from 'express';
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

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session in the DB
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS); // 30 days
    const session = await prisma.session.create({
      data: {
        userId: user.id,
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

    res.json({
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

export default router;
