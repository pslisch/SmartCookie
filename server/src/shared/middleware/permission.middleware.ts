import { Request, Response, NextFunction } from 'express';
import { requireAuth } from './session.middleware';
import { permissionResolverService } from '../../features/rbac/services/permissionResolver.service';

/**
 * Middleware to require a specific permission for the authenticated user.
 * Bypassed entirely if the user is a superuser.
 */
export function requirePermission(module: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    await requireAuth(req, res, async () => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({ error: 'Unauthorized: User is missing.' });
        }

        const hasPerm = await permissionResolverService.hasPermission(user.id, module, action);

        if (hasPerm) {
          return next();
        }

        return res.status(403).json({ error: `Forbidden: Missing required permission "${module}:${action}".` });
      } catch (error) {
        console.error(`Permission validation error for ${module}:${action}:`, error);
        return res.status(500).json({ error: 'Internal server error validating permission.' });
      }
    });
  };
}
