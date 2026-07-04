import { prisma } from '../db/prisma';
import { TokenPurpose } from '@prisma/client';
import * as crypto from 'crypto';

export class TokenService {
  /**
   * Computes the SHA-256 hash of a raw token.
   */
  static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Generates a cryptographically random raw token, stores only its SHA-256 hash + expiry,
   * invalidates any previous unconsumed token of the same (userId, purpose) pair first.
   * Returns the raw token (only time it is available in plaintext).
   */
  static async issue(userId: string, purpose: TokenPurpose, ttlSeconds: number): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    // Invalidate any previous unconsumed token of the same (userId, purpose) pair first
    await prisma.token.updateMany({
      where: {
        userId,
        purpose,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Create the new token
    await prisma.token.create({
      data: {
        userId,
        tokenHash,
        purpose,
        expiresAt,
      },
    });

    return rawToken;
  }

  /**
   * Hashes the input raw token, looks up by hash, atomically marks it used via
   * updateMany and checks affected-row count. Returns the associated userId or throws.
   */
  static async consume(rawToken: string, purpose: TokenPurpose): Promise<string> {
    const tokenHash = this.hashToken(rawToken);

    // Look up the token to verify details
    const token = await prisma.token.findUnique({
      where: { tokenHash },
    });

    if (!token || token.purpose !== purpose) {
      throw new Error('Invalid token');
    }

    if (token.usedAt !== null) {
      throw new Error('Token already used');
    }

    if (token.expiresAt < new Date()) {
      throw new Error('Token expired');
    }

    // Atomically mark it as used using updateMany to prevent race conditions
    const result = await prisma.token.updateMany({
      where: {
        tokenHash,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        usedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new Error('Token already used or expired');
    }

    return token.userId;
  }
}
