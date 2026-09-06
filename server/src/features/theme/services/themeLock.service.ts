import { prisma } from '../../../shared/db/prisma';
import { ThemeLockType } from '@prisma/client';

export const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes safety timeout

export interface LockHolderInfo {
  isLocked: boolean;
  lockType: ThemeLockType;
  lockedAt: Date;
  userId: string;
  holderName: string;
}

export interface AcquireLockResult {
  success: boolean;
  conflict?: boolean;
  holderName?: string;
  lockType?: ThemeLockType;
  lockedAt?: Date;
  lock?: any;
}

export class ThemeLockService {
  /**
   * Acquire or renew a lock on a theme.
   * Fails if an unexpired lock (lockedAt within 5 min) exists for a different user;
   * upserts otherwise.
   */
  async acquireLock(
    themeId: string,
    userId: string,
    lockType: ThemeLockType = ThemeLockType.TEST
  ): Promise<AcquireLockResult> {
    const now = new Date();

    const existingLock = await prisma.themeLock.findUnique({
      where: { themeId },
    });

    if (existingLock) {
      const isExpired = now.getTime() - new Date(existingLock.lockedAt).getTime() >= LOCK_TIMEOUT_MS;

      // Lock is still active and held by someone else
      if (!isExpired && existingLock.userId !== userId) {
        const holder = await prisma.user.findUnique({
          where: { id: existingLock.userId },
          select: { id: true, firstName: true, lastName: true, email: true, username: true },
        });

        const holderName = holder
          ? `${holder.firstName || ''} ${holder.lastName || ''}`.trim() || holder.username || holder.email || 'Another user'
          : 'Another user';

        return {
          success: false,
          conflict: true,
          holderName,
          lockType: existingLock.lockType,
          lockedAt: existingLock.lockedAt,
        };
      }

      // Either expired or owned by the same user -> refresh/update
      const updated = await prisma.themeLock.update({
        where: { themeId },
        data: {
          userId,
          lockType,
          lockedAt: now,
        },
      });

      return {
        success: true,
        lock: updated,
      };
    }

    // No existing lock -> create
    const created = await prisma.themeLock.create({
      data: {
        themeId,
        userId,
        lockType,
        lockedAt: now,
      },
    });

    return {
      success: true,
      lock: created,
    };
  }

  /**
   * Release lock for a theme if held by the requesting user, or if already expired.
   */
  async releaseLock(themeId: string, userId: string): Promise<boolean> {
    const existingLock = await prisma.themeLock.findUnique({
      where: { themeId },
    });

    if (!existingLock) {
      return false;
    }

    const isExpired = Date.now() - new Date(existingLock.lockedAt).getTime() >= LOCK_TIMEOUT_MS;

    // Only delete if held by this user or expired
    if (existingLock.userId === userId || isExpired) {
      await prisma.themeLock.delete({
        where: { themeId },
      });
      return true;
    }

    return false;
  }

  /**
   * Returns holder info or null, treating locks older than 5 minutes as expired/released.
   */
  async getLockStatus(themeId: string): Promise<LockHolderInfo | null> {
    const existingLock = await prisma.themeLock.findUnique({
      where: { themeId },
    });

    if (!existingLock) {
      return null;
    }

    const isExpired = Date.now() - new Date(existingLock.lockedAt).getTime() >= LOCK_TIMEOUT_MS;
    if (isExpired) {
      // Asynchronously clean up the expired lock
      prisma.themeLock.delete({ where: { themeId } }).catch(() => {});
      return null;
    }

    const holder = await prisma.user.findUnique({
      where: { id: existingLock.userId },
      select: { id: true, firstName: true, lastName: true, email: true, username: true },
    });

    const holderName = holder
      ? `${holder.firstName || ''} ${holder.lastName || ''}`.trim() || holder.username || holder.email || 'Another user'
      : 'Another user';

    return {
      isLocked: true,
      lockType: existingLock.lockType,
      lockedAt: existingLock.lockedAt,
      userId: existingLock.userId,
      holderName,
    };
  }
}

export const themeLockService = new ThemeLockService();
