import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Double-submit cookie CSRF protection middleware.
 * 
 * 1. GET requests (and other safe methods) will generate and attach a `csrfToken` cookie 
 *    if one doesn't already exist.
 * 2. State-changing requests (POST, PATCH, PUT, DELETE) must supply the token in the 
 *    `x-csrf-token` header or the request body `_csrf`, which must match the cookie token.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS', 'TRACE'];
  
  // 1. If it's a safe method, generate/ensure the cookie exists
  if (safeMethods.includes(req.method)) {
    let token = req.cookies?.csrfToken;
    if (!token) {
      token = crypto.randomBytes(24).toString('hex');
      res.cookie('csrfToken', token, {
        httpOnly: false, // Must be readable by client-side JS to submit back
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }
    // Also attach to response headers for ease of programmatic inspection
    res.setHeader('X-CSRF-Token', token);
    return next();
  }

  // 2. For state-changing methods, validate the token
  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'] as string | undefined;
  const bodyToken = req.body?._csrf as string | undefined;
  const submittedToken = headerToken || bodyToken;

  if (!cookieToken || !submittedToken || cookieToken !== submittedToken) {
    return res.status(403).json({
      error: 'Forbidden: CSRF token mismatch or missing.',
    });
  }

  next();
}
