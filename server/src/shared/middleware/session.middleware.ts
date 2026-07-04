import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { User, Session } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session & { user: User };
    }
  }
}

/**
 * Middleware to require an active, valid session on protected routes.
 * On success, populates req.session and req.user.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.signedCookies?.sid;
    if (!sessionId) {
      return res.status(401).json({ error: 'Unauthorized: No active session.' });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized: Invalid session.' });
    }

    if (session.expiresAt < new Date()) {
      // Clear session from DB
      await prisma.session.deleteMany({ where: { id: sessionId } }).catch(() => {});
      return res.status(401).json({ error: 'Unauthorized: Session has expired.' });
    }

    const user = session.user;
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Unauthorized: User is inactive or missing.' });
    }

    req.session = session;
    req.user = user;
    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error validating session.' });
  }
}

/**
 * Middleware to require a superuser session.
 * TEMPORARY — replace with a proper permission check (e.g. 'can_invite_users') once RBAC ships. Do not extend this check with more hardcoded roles.
 */
export async function requireSuperuser(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    // TEMPORARY — replace with a proper permission check (e.g. 'can_invite_users') once RBAC ships. Do not extend this check with more hardcoded roles.
    if (!req.user || !req.user.isSuperuser) {
      return res.status(403).json({ error: 'Forbidden: Superuser status required.' });
    }
    next();
  });
}
