import * as otplib from 'otplib';
import crypto from 'crypto';
import { prisma } from '../../../shared/db/prisma';
import { encrypt } from '../../../shared/crypto/mfaEncryption';
import { emailPasswordAuthProvider } from './auth.service';

export class MfaService {
  /**
   * Generates a new TOTP secret for the user, but does NOT persist it.
   * Returns the secret and the otpauth:// URI for the user to scan.
   */
  async generateSecret(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, email: true },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    const secret = otplib.generateSecret();
    const label = user.email || user.username || 'User';
    const otpauthUrl = otplib.generateURI({
      secret,
      label,
      issuer: 'SmartCookie',
    });

    return { secret, otpauthUrl };
  }

  /**
   * Verifies the submitted code against the pending secret.
   * If correct, encrypts and saves the secret, enables MFA,
   * generates and returns 10 single-use recovery codes.
   */
  async verifyAndEnable(userId: string, pendingSecret: string, code: string): Promise<string[]> {
    const result = otplib.verifySync({
      token: code,
      secret: pendingSecret,
    });

    if (!result || !result.valid) {
      throw new Error('Invalid verification code.');
    }

    const encryptedSecret = encrypt(pendingSecret);

    // Transactionally update the user and generate recovery codes
    const rawCodes: string[] = [];
    const codeHashRecords = [];

    for (let i = 0; i < 10; i++) {
      const rawCode = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 chars
      rawCodes.push(rawCode);
      const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
      codeHashRecords.push({
        userId,
        codeHash,
      });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: true,
          mfaSecretEncrypted: encryptedSecret,
          mfaEnabledAt: new Date(),
        },
      }),
      prisma.mfaRecoveryCode.deleteMany({
        where: { userId },
      }),
      prisma.mfaRecoveryCode.createMany({
        data: codeHashRecords,
      }),
    ]);

    return rawCodes;
  }

  /**
   * Invalidates all previous recovery codes and generates a fresh set of 10.
   */
  async regenerateRecoveryCodes(userId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });

    if (!user || !user.mfaEnabled) {
      throw new Error('MFA is not enabled for this user.');
    }

    const rawCodes: string[] = [];
    const codeHashRecords = [];

    for (let i = 0; i < 10; i++) {
      const rawCode = crypto.randomBytes(5).toString('hex').toUpperCase();
      rawCodes.push(rawCode);
      const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
      codeHashRecords.push({
        userId,
        codeHash,
      });
    }

    await prisma.$transaction([
      prisma.mfaRecoveryCode.deleteMany({
        where: { userId },
      }),
      prisma.mfaRecoveryCode.createMany({
        data: codeHashRecords,
      }),
    ]);

    return rawCodes;
  }

  /**
   * Requires re-confirming the current password before disabling MFA.
   * Clears mfaEnabled, mfaSecretEncrypted, mfaEnabledAt, and all recovery codes.
   */
  async disableMfa(userId: string, currentPassword?: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    if (!currentPassword) {
      throw new Error('Password confirmation is required to disable MFA.');
    }

    if (!user.passwordHash) {
      throw new Error('User password hash is missing.');
    }

    const isPasswordValid = await emailPasswordAuthProvider.verifyPassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid password.');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaSecretEncrypted: null,
          mfaEnabledAt: null,
        },
      }),
      prisma.mfaRecoveryCode.deleteMany({
        where: { userId },
      }),
    ]);
  }

  /**
   * Admin-initiated disable of MFA. No password reconfirmation is required.
   */
  async adminResetMfa(userId: string): Promise<void> {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaSecretEncrypted: null,
          mfaEnabledAt: null,
        },
      }),
      prisma.mfaRecoveryCode.deleteMany({
        where: { userId },
      }),
    ]);
  }
}

export const mfaService = new MfaService();
