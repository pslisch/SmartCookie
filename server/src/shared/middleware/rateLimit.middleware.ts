import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  attempts: number;
  resetTime: number;
}

export class LoginRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  /**
   * Extracts and normalizes the identifier from the request.
   * Prioritizes a trimmed, lowercased username. Fallbacks to client IP.
   */
  public getIdentifier(req: Request): string {
    const username = req.body?.username;
    if (username && typeof username === 'string' && username.trim()) {
      return `usr:${username.trim().toLowerCase()}`;
    }
    return `ip:${req.ip || 'unknown'}`;
  }

  /**
   * Express middleware to check if the identifier has exceeded the failed attempt threshold.
   */
  public get middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const identifier = this.getIdentifier(req);
      const record = this.store.get(identifier);
      const now = Date.now();

      if (record) {
        // If the window has expired, clean up the record and proceed
        if (now >= record.resetTime) {
          this.store.delete(identifier);
          return next();
        }

        // If threshold exceeded, reject request with 429
        if (record.attempts >= this.maxAttempts) {
          const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
          res.setHeader('Retry-After', String(retryAfterSeconds));
          return res.status(429).json({
            error: 'Too many failed login attempts. Please try again later.',
            retryAfter: retryAfterSeconds,
          });
        }
      }

      next();
    };
  }

  /**
   * Records a failed login attempt for the identifier.
   */
  public recordFailure(identifier: string): void {
    const record = this.store.get(identifier);
    const now = Date.now();

    if (!record || now >= record.resetTime) {
      // Create a new record and start a new time window
      this.store.set(identifier, {
        attempts: 1,
        resetTime: now + this.windowMs,
      });
    } else {
      // Increment attempts in the active window
      record.attempts += 1;
    }
  }

  /**
   * Resets/clears the rate limit record for the identifier upon a successful login.
   */
  public reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Clean up all stored records (mainly for testing)
   */
  public clearAll(): void {
    this.store.clear();
  }

  /**
   * Get the current record of an identifier (mainly for testing)
   */
  public getRecord(identifier: string): RateLimitRecord | undefined {
    const record = this.store.get(identifier);
    if (record && Date.now() >= record.resetTime) {
      this.store.delete(identifier);
      return undefined;
    }
    return record;
  }
}

// Instantiate default rate limiter (5 failed attempts per 15-minute window)
export const loginRateLimiter = new LoginRateLimiter();
