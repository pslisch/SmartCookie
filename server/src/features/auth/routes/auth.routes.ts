import { Router, Request, Response } from 'express';
import { prisma } from '../../../shared/db/prisma';
import { emailPasswordAuthProvider } from '../services/auth.service';
import { emailService } from '../../../shared/email/email.service';
import { loginRateLimiter } from '../../../shared/middleware/rateLimit.middleware';
import { requireAuth } from '../../../shared/middleware/session.middleware';

const router = Router();

/**
 * Helper to get user and session from request cookies
 */
async function getAuthenticatedUser(req: Request) {
  const sessionId = req.signedCookies?.sid || req.cookies?.sid;
  if (!sessionId) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    return null;
  }

  if (!session.user || session.user.status !== 'ACTIVE') {
    return null;
  }

  return { session, user: session.user };
}

/**
 * POST /api/auth/login -> { username, password }
 */
router.post('/login', loginRateLimiter.middleware, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await emailPasswordAuthProvider.authenticate({ username, password });

    // Reset rate limiter count for this identifier on successful login
    const identifier = loginRateLimiter.getIdentifier(req);
    loginRateLimiter.reset(identifier);

    // Create session in the DB
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
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
      secure: process.env.NODE_ENV === 'production',
      signed: true,
      expires: expiresAt,
      sameSite: 'lax',
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        isSuperuser: user.isSuperuser,
        recoveryEmail: user.recoveryEmail,
        companyId: user.companyId,
        status: user.status,
      },
    });
  } catch (error: any) {
    if (error.name === 'AuthenticationError') {
      const identifier = loginRateLimiter.getIdentifier(req);
      loginRateLimiter.recordFailure(identifier);
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'An internal error occurred.' });
  }
});

/**
 * POST /api/auth/logout -> invalidates session and clears cookie
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const sessionId = req.signedCookies?.sid || req.cookies?.sid;
    res.clearCookie('sid');

    if (sessionId) {
      await prisma.session.deleteMany({
        where: { id: sessionId },
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'An internal error occurred.' });
  }
});

/**
 * GET /api/auth/session -> returns user identity if authenticated
 */
router.get('/session', requireAuth, async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        isSuperuser: req.user.isSuperuser,
        recoveryEmail: req.user.recoveryEmail,
        companyId: req.user.companyId,
        status: req.user.status,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'An internal error occurred.' });
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
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'An internal error occurred.' });
  }
});

export default router;
